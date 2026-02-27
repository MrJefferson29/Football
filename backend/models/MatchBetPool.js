const mongoose = require('mongoose');

const matchBetPoolSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        prediction: {
          type: String,
          enum: ['home', 'draw', 'away'],
          required: true,
        },
        homeScore: {
          type: Number,
          default: null,
        },
        awayScore: {
          type: Number,
          default: null,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isClosed: {
      type: Boolean,
      default: false,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    settled: {
      type: Boolean,
      default: false,
    },
    settlementAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to know how many spots are left (max 3)
matchBetPoolSchema.virtual('spotsLeft').get(function () {
  const count = this.participants ? this.participants.length : 0;
  return Math.max(0, 3 - count);
});

matchBetPoolSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('MatchBetPool', matchBetPoolSchema);

