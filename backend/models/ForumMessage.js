const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
forumMessageSchema.index({ forumId: 1, createdAt: -1 });
forumMessageSchema.index({ headUserId: 1 });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
