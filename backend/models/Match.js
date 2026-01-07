const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  homeLogo: {
    type: String,
    default: ''
  },
  awayLogo: {
    type: String,
    default: ''
  },
  matchTime: {
    type: String,
    required: true
  },
  matchDate: {
    type: Date,
    required: true
  },
  league: {
    type: String,
    required: true,
    default: 'Other'
  },
  leagueType: {
    type: String,
    enum: ['international', 'local'],
    default: 'international'
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'finished'],
    default: 'upcoming'
  },
  homeScore: {
    type: Number,
    default: null
  },
  awayScore: {
    type: Number,
    default: null
  },
  votes: {
    home: {
      type: Number,
      default: 0
    },
    draw: {
      type: Number,
      default: 0
    },
    away: {
      type: Number,
      default: 0
    }
  },
  scorePredictions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    homeScore: {
      type: Number,
      required: true
    },
    awayScore: {
      type: Number,
      required: true
    },
    pointsAwarded: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  pointsAwarded: {
    type: Boolean,
    default: false
  },
  pointsAwardedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Get percentage for home team
matchSchema.virtual('homePercentage').get(function() {
  const total = this.votes.home + this.votes.draw + this.votes.away;
  return total > 0 ? Math.round((this.votes.home / total) * 100) : 0;
});

// Get percentage for draw
matchSchema.virtual('drawPercentage').get(function() {
  const total = this.votes.home + this.votes.draw + this.votes.away;
  return total > 0 ? Math.round((this.votes.draw / total) * 100) : 0;
});

// Get percentage for away team
matchSchema.virtual('awayPercentage').get(function() {
  const total = this.votes.home + this.votes.draw + this.votes.away;
  return total > 0 ? Math.round((this.votes.away / total) * 100) : 0;
});

matchSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Match', matchSchema);

