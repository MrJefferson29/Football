const express = require('express');
const router = express.Router();
const {
  processBetPayment,
  betTranzakWebhook,
  getBetPayments,
} = require('../controllers/betPaymentController');
const { protect } = require('../middleware/auth');

// User-initiated bet payment
router.post('/payment', protect, processBetPayment);

// Tranzak webhook (public)
router.post('/tranzak-webhook', betTranzakWebhook);

// Optional: lookup user's bet payments
router.post('/get-payment', protect, getBetPayments);

module.exports = router;

