const tranzak = require('tranzak-node').default;
const shortUUID = require('short-uuid');
const BetPayment = require('../models/BetPayment');
const User = require('../models/User');

require('dotenv').config();

const client = new tranzak({
  appId: process.env.TRANZAK_APP_ID,
  appKey: process.env.TRANZAK_APP_KEY,
  mode: process.env.TRANZAK_MODE || 'sandbox',
});

// In-memory counter for webhooks per transaction
const webhookCount = {};

function extractRidFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('rid');
  } catch (error) {
    console.error('Error parsing payment URL:', error);
    return null;
  }
}

// @desc    Start a bet payment via Tranzak
// @route   POST /api/bet-payments/payment
// @access  Private
exports.processBetPayment = async (req, res) => {
  try {
    const {
      amount,
      matchId,
      prediction,
      stakeLabel,
      description = 'BET_STAKE',
      mobileWalletNumber = process.env.TRANZAK_DEFAULT_WALLET || '',
    } = req.body;

    const userId = req.user && req.user.id;
    const email = req.user && req.user.email;

    if (!userId || !email) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!amount || !matchId || !prediction) {
      console.error('Missing required fields for bet payment:', req.body);
      return res.status(400).json({ success: false, error: 'amount, matchId and prediction are required.' });
    }

    if (!mobileWalletNumber) {
      return res.status(400).json({ success: false, error: 'Missing mobile wallet number.' });
    }

    console.log('Initiating bet payment:', { userId, email, amount, matchId, prediction });

    const transaction = await client.payment.collection.simple.chargeMobileMoney({
      amount,
      currencyCode: 'XAF',
      description,
      payerNote: description,
      mchTransactionRef: shortUUID.generate(),
      mobileWalletNumber,
    });

    if (transaction.refresh) {
      await transaction.refresh();
    }

    console.log('Bet transaction response:', JSON.stringify(transaction, null, 2));

    const status = transaction.data ? transaction.data.status : null;
    const initialTransactionId = transaction.data
      ? transaction.data.transactionId || transaction.data.requestId
      : null;

    try {
      await BetPayment.create({
        transactionId: initialTransactionId,
        user: userId,
        match: matchId,
        amount,
        prediction,
        stakeLabel,
        status: 'initiated',
        description,
      });
    } catch (err) {
      console.error('Error creating BetPayment record:', err);
    }

    if (status === 'SUCCESSFUL' || status === 'COMPLETED') {
      console.log('Bet transaction fully successful:', initialTransactionId);

      await BetPayment.findOneAndUpdate(
        { transactionId: initialTransactionId },
        { status: 'completed' }
      );

      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully.',
        transactionId: initialTransactionId,
        paymentUrl: null,
      });
    }

    if (status === 'PAYMENT_IN_PROGRESS') {
      console.log('Bet payment in progress, starting web redirect:', initialTransactionId);

      const webTransaction = await client.payment.collection.simple.chargeByWebRedirect({
        mchTransactionRef: shortUUID.generate(),
        amount,
        currencyCode: 'XAF',
        description,
      });

      if (
        !webTransaction ||
        !webTransaction.data ||
        !webTransaction.data.links ||
        !webTransaction.data.links.paymentAuthUrl
      ) {
        console.error('Web transaction missing payment URL:', webTransaction);
        return res.status(202).json({
          success: true,
          message: 'Payment is in progress. Please wait for completion.',
          transactionId: initialTransactionId,
          paymentUrl: null,
        });
      }

      const paymentUrl = webTransaction.data.links.paymentAuthUrl;
      const redirectTransactionId = extractRidFromUrl(paymentUrl);

      if (redirectTransactionId) {
        await BetPayment.findOneAndUpdate(
          { transactionId: initialTransactionId },
          { redirectTransactionId }
        );
      }

      return res.status(202).json({
        success: true,
        message: 'Redirect user to complete payment.',
        transactionId: initialTransactionId,
        paymentUrl,
      });
    }

    console.log('Fallback web redirect for bet transaction. Status:', status);
    const webTransaction = await client.payment.collection.simple.chargeByWebRedirect({
      mchTransactionRef: shortUUID.generate(),
      amount,
      currencyCode: 'XAF',
      description,
    });

    if (
      !webTransaction ||
      !webTransaction.data ||
      !webTransaction.data.links ||
      !webTransaction.data.links.paymentAuthUrl
    ) {
      console.error('Fallback web transaction missing payment URL:', webTransaction);
      return res.status(500).json({ success: false, error: 'Payment redirection failed.' });
    }

    return res.status(202).json({
      success: true,
      message: 'Redirect user to complete payment.',
      paymentUrl: webTransaction.data.links.paymentAuthUrl,
    });
  } catch (error) {
    console.error('Error processing bet payment:', error);
    return res.status(500).json({ success: false, error: 'Payment processing failed.' });
  }
};

// @desc    Tranzak webhook for bet payments
// @route   POST /api/bet-payments/tranzak-webhook
// @access  Public (called by Tranzak)
exports.betTranzakWebhook = async (req, res) => {
  try {
    console.log('Received Tranzak webhook payload (bets):', JSON.stringify(req.body, null, 2));

    const { resource } = req.body;
    if (!resource || !resource.requestId) {
      console.error('Invalid webhook payload:', req.body);
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const incomingRequestId = resource.requestId;

    let paymentRecord = await BetPayment.findOne({
      $or: [
        { transactionId: incomingRequestId },
        { redirectTransactionId: incomingRequestId },
      ],
    }).populate('user');

    if (!paymentRecord) {
      console.error(`No BetPayment record found for transaction ${incomingRequestId}`);
      return res.sendStatus(404);
    }

    const paymentKey = paymentRecord.transactionId;
    webhookCount[paymentKey] = (webhookCount[paymentKey] || 0) + 1;

    console.log(`Webhook count for bet payment ${paymentKey}: ${webhookCount[paymentKey]}`);

    if (
      webhookCount[paymentKey] >= 2 &&
      (resource.status === 'COMPLETED' || resource.status === 'SUCCESSFUL')
    ) {
      console.log('Bet payment confirmed for transaction:', paymentKey);

      paymentRecord = await BetPayment.findOneAndUpdate(
        { _id: paymentRecord._id },
        { status: 'completed' },
        { new: true }
      ).populate('user');

      if (paymentRecord && paymentRecord.user) {
        console.log(`User ${paymentRecord.user.email} bet payment completed.`);
      }
    }

    switch (resource.status) {
      case 'SUCCESSFUL':
      case 'COMPLETED':
        console.log('Transaction completed successfully:', incomingRequestId);
        break;
      case 'PAYMENT_IN_PROGRESS':
        console.log('Payment is still in progress:', incomingRequestId);
        break;
      default:
        console.log('Received unsupported transaction status:', resource.status);
        break;
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Error handling bet webhook:', error);
    return res.sendStatus(500);
  }
};

// @desc    Get current user's bet payments (optional)
// @route   POST /api/bet-payments/get-payment
// @access  Private
exports.getBetPayments = async (req, res) => {
  const { matchId } = req.body;
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  try {
    const query = { user: userId };
    if (matchId) {
      query.match = matchId;
    }

    const payments = await BetPayment.find(query).sort({ createdAt: -1 });
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'No payments found.' });
    }

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching bet payments:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

