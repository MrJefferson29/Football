const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  forumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PredictionForum',
    required: [true, 'Please provide a forum ID']
  },
  headUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a forum head ID']
  },
  team1: {
    name: {
      type: String,
      required: [true, 'Please provide team 1 name']
    },
    logo: {
      type: String,
      default: ''
    }
  },
  team2: {
    name: {
      type: String,
      required: [true, 'Please provide team 2 name']
    },
    logo: {
      type: String,
      default: ''
    }
  },
  predictedScore: {
    team1: {
      type: Number,
      required: [true, 'Please provide team 1 predicted score']
    },
    team2: {
      type: Number,
      required: [true, 'Please provide team 2 predicted score']
    }
  },
  actualScore: {
    team1: {
      type: Number,
      default: null
    },
    team2: {
      type: Number,
      default: null
    }
  },
  matchDate: {
    type: Date,
    required: [true, 'Please provide match date']
  },
  league: {
    type: String,
    default: ''
  },
  competition: {
    type: String,
    default: ''
  },
  odds: {
    type: Number,
    default: null
  },
  predictionType: {
    type: String,
    enum: ['match-result', 'over-under', 'both-teams-score', 'correct-score', 'other'],
    default: 'match-result'
  },
  additionalInfo: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: null // null = pending, true = correct, false = incorrect
  },
  status: {
    type: String,
    enum: ['pending', 'live', 'completed', 'cancelled'],
    default: 'pending'
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
predictionSchema.index({ forumId: 1, createdAt: -1 });
predictionSchema.index({ headUserId: 1 });
predictionSchema.index({ matchDate: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
