const mongoose = require('mongoose');

const forumJoinRequestSchema = new mongoose.Schema({
  forumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PredictionForum',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters'],
    default: ''
  }
}, {
  timestamps: true
});

// Prevent duplicate pending requests
forumJoinRequestSchema.index({ forumId: 1, userId: 1, status: 1 }, { 
  unique: true,
  partialFilterExpression: { status: 'pending' }
});

module.exports = mongoose.model('ForumJoinRequest', forumJoinRequestSchema);
