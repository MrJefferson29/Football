const tranzak = require('tranzak-node').default;
const shortUUID = require('short-uuid');
const BetPayment = require('../models/BetPayment');
const User = require('../models/User');
const MatchBetPool = require('../models/MatchBetPool');
const { doJoinMatchPool } = require('./matchController');

require('dotenv').config();

const PAYOUT_RATE = 0.95; // 95% of pool to winner(s), or 95% refund to each if no winner

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

// @desc    Start bet payment on Confirm Entry; place bet only after payment succeeds
// @route   POST /api/bet-payments/payment
// @access  Private
exports.processBetPayment = async (req, res) => {
  try {
    const {
      amount,
      matchId,
      prediction,
      stakeLabel,
      homeScore,
      awayScore,
      poolId,
      description = 'BET_STAKE',
      mobileWalletNumber = process.env.TRANZAK_DEFAULT_WALLET || '',
    } = req.body;

    const userId = req.user && req.user.id;
    const email = req.user && req.user.email;

    if (!userId || !email) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!amount || !matchId || !prediction) {
      return res.status(400).json({ success: false, error: 'amount, matchId and prediction are required.' });
    }

    if (!mobileWalletNumber) {
      return res.status(400).json({ success: false, error: 'Missing mobile wallet number.' });
    }

    const numericAmount = Number(amount);

    // If user already has a completed payment for this bet, join pool immediately (e.g. after redirect)
    const existingPaid = await BetPayment.findOne({
      user: userId,
      match: matchId,
      amount: numericAmount,
      prediction,
      status: 'completed',
      usedForPool: false,
    }).sort({ createdAt: -1 });

    if (existingPaid) {
      try {
        const pool = await doJoinMatchPool(
          userId,
          matchId,
          amount,
          prediction,
          homeScore,
          awayScore,
          poolId
        );
        return res.status(200).json({
          success: true,
          joinedPool: true,
          message: 'Bet placed successfully.',
          data: pool,
        });
      } catch (joinErr) {
        return res.status(joinErr.statusCode || 400).json({
          success: false,
          error: joinErr.message,
        });
      }
    }

    // No completed payment: initiate Tranzak payment
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
        mobileWalletNumber,
        status: 'initiated',
        description,
      });
    } catch (err) {
      console.error('Error creating BetPayment record:', err);
    }

    if (status === 'SUCCESSFUL' || status === 'COMPLETED') {
      await BetPayment.findOneAndUpdate(
        { transactionId: initialTransactionId },
        { status: 'completed' }
      );
      try {
        const pool = await doJoinMatchPool(
          userId,
          matchId,
          amount,
          prediction,
          homeScore,
          awayScore,
          poolId
        );
        return res.status(200).json({
          success: true,
          joinedPool: true,
          message: 'Payment successful. Bet placed.',
          data: pool,
        });
      } catch (joinErr) {
        return res.status(joinErr.statusCode || 400).json({
          success: false,
          error: joinErr.message,
        });
      }
    }

    if (status === 'PAYMENT_IN_PROGRESS') {
      const webTransaction = await client.payment.collection.simple.chargeByWebRedirect({
        mchTransactionRef: shortUUID.generate(),
        amount,
        currencyCode: 'XAF',
        description,
      });

      if (
        webTransaction?.data?.links?.paymentAuthUrl
      ) {
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
          joinedPool: false,
          message: 'Complete payment in the browser, then tap Confirm Entry again to place your bet.',
          paymentUrl,
        });
      }
    }

    // Fallback: web redirect
    const webTransaction = await client.payment.collection.simple.chargeByWebRedirect({
      mchTransactionRef: shortUUID.generate(),
      amount,
      currencyCode: 'XAF',
      description,
    });

    if (webTransaction?.data?.links?.paymentAuthUrl) {
      return res.status(202).json({
        success: true,
        joinedPool: false,
        message: 'Redirect to complete payment.',
        paymentUrl: webTransaction.data.links.paymentAuthUrl,
      });
    }

    return res.status(500).json({ success: false, error: 'Payment redirection failed.' });
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

// @desc    Settle all bet pools for a match when final score is set.
//          Winner gets 95% of total pool; if no winner, each participant gets 95% of their stake back.
// @param   {string} matchId - Match _id
// @param   {number} homeScore - Final home score
// @param   {number} awayScore - Final away score
// @returns {Promise<{ settled: number, errors: string[] }>}
exports.settleMatchBetPools = async (matchId, homeScore, awayScore) => {
  const errors = [];
  let settledCount = 0;

  const correctPrediction =
    homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';

  const pools = await MatchBetPool.find({
    match: matchId,
    settled: false,
  });

  for (const pool of pools) {
    try {
      const participants = pool.participants || [];
      if (participants.length === 0) {
        await MatchBetPool.findByIdAndUpdate(pool._id, {
          settled: true,
          settlementAt: new Date(),
        });
        settledCount++;
        continue;
      }

      const totalPot = pool.amount * participants.length;
      const payoutAmount = Math.floor(totalPot * PAYOUT_RATE);
      const refundPerPerson = Math.floor(pool.amount * PAYOUT_RATE);

      const winners = participants.filter((p) => p.prediction === correctPrediction);

      if (winners.length > 0) {
        // One or more winners: pay 95% of total pool to the first winner (or split if multiple)
        const amountPerWinner = Math.floor(payoutAmount / winners.length);
        for (const w of winners) {
          const payRecord = await BetPayment.findOne({
            user: w.user,
            match: matchId,
            pool: pool._id,
            status: 'completed',
          });
          if (payRecord && payRecord.mobileWalletNumber && amountPerWinner > 0) {
            try {
              await client.payment.transfer.simple.toMobileMoney({
                payeeAccountId: payRecord.mobileWalletNumber,
                amount: amountPerWinner,
                currencyCode: 'XAF',
                customTransactionRef: shortUUID.generate(),
                description: 'Bet pool winnings',
                payeeNote: 'Bet pool winnings',
              });
            } catch (transferErr) {
              console.error('Tranzak payout failed for winner:', w.user, transferErr);
              errors.push(`Winner payout failed: ${w.user} - ${transferErr.message}`);
            }
          }
        }
        await MatchBetPool.findByIdAndUpdate(pool._id, {
          settled: true,
          winner: winners[0].user,
          settlementAt: new Date(),
        });
      } else {
        // No winner: refund each participant 95% of their stake
        for (const p of participants) {
          const payRecord = await BetPayment.findOne({
            user: p.user,
            match: matchId,
            pool: pool._id,
            status: 'completed',
          });
          if (payRecord && payRecord.mobileWalletNumber && refundPerPerson > 0) {
            try {
              await client.payment.transfer.simple.toMobileMoney({
                payeeAccountId: payRecord.mobileWalletNumber,
                amount: refundPerPerson,
                currencyCode: 'XAF',
                customTransactionRef: shortUUID.generate(),
                description: 'Bet pool refund (no correct prediction)',
                payeeNote: 'Bet pool refund',
              });
            } catch (transferErr) {
              console.error('Tranzak refund failed for participant:', p.user, transferErr);
              errors.push(`Refund failed: ${p.user} - ${transferErr.message}`);
            }
          }
        }
        await MatchBetPool.findByIdAndUpdate(pool._id, {
          settled: true,
          settlementAt: new Date(),
        });
      }
      settledCount++;
    } catch (err) {
      console.error('Error settling pool:', pool._id, err);
      errors.push(`Pool ${pool._id}: ${err.message}`);
    }
  }

  return { settled: settledCount, errors };
};

