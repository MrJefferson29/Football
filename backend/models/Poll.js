const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['daily-poll', 'club-battle', 'goat-competition'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  option1: {
    name: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    votes: {
      type: Number,
      default: 0
    }
  },
  option2: {
    name: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    votes: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statistics: {
    countryBreakdown: [{
      country: String,
      percentage: Number,
      color: String
    }],
    ageGroupBreakdown: [{
      ageGroup: String,
      percentage: Number,
      color: String
    }],
    matchPredictions: [{
      prediction: String,
      percentage: Number,
      color: String
    }],
    scorePredictions: [{
      score: String,
      percentage: Number,
      color: String
    }]
  }
}, {
  timestamps: true
});

// Get percentage for option1
pollSchema.virtual('option1Percentage').get(function() {
  const total = this.option1.votes + this.option2.votes;
  return total > 0 ? Math.round((this.option1.votes / total) * 100) : 50;
});

// Get percentage for option2
pollSchema.virtual('option2Percentage').get(function() {
  const total = this.option1.votes + this.option2.votes;
  return total > 0 ? Math.round((this.option2.votes / total) * 100) : 50;
});

pollSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Poll', pollSchema);

