const mongoose = require('mongoose');

const POOL_NAME_PREFIXES = [
  'Diamond',
  'Golden',
  'Silver',
  'Royal',
  'Rocket',
  'Turbo',
  'Legend',
  'Ultra',
  'Prime',
  'Fusion',
  'Galaxy',
  'Phoenix',
  'Dragon',
  'Neon',
  'Emerald',
];

const POOL_NAME_SUFFIXES = [
  'Pool',
  'Squad',
  'Club',
  'Arena',
  'League',
  'Circle',
  'Zone',
  'Lobby',
  'Room',
  'Hub',
  'Den',
  'House',
  'Lounge',
  'Corner',
  'Bet',
];

function generatePoolName() {
  const prefix = POOL_NAME_PREFIXES[Math.floor(Math.random() * POOL_NAME_PREFIXES.length)];
  const suffix = POOL_NAME_SUFFIXES[Math.floor(Math.random() * POOL_NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

const matchBetPoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: generatePoolName,
      trim: true,
    },
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

