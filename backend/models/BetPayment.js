const mongoose = require('mongoose');

const BetPaymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  redirectTransactionId: { type: String, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  amount: { type: Number, required: true },
  prediction: { type: String, enum: ['home', 'draw', 'away'], required: true },
  stakeLabel: { type: String },
  status: {
    type: String,
    enum: ['initiated', 'completed', 'failed'],
    default: 'initiated',
  },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BetPayment', BetPaymentSchema);

