const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['trending', 'breaking', 'transfer', 'match-report', 'analysis', 'other'],
    default: 'other'
  },
  videoUrl: {
    type: String,
    default: ''
  },
  youtubeUrl: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-set isTrending based on category
newsSchema.pre('save', function() {
  if (this.category === 'trending') {
    this.isTrending = true;
  };
});

module.exports = mongoose.model('News', newsSchema);

