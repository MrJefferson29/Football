const mongoose = require('mongoose');

const predictionForumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a forum name'],
    trim: true,
    maxlength: [100, 'Forum name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  profilePicture: {
    type: String,
    default: ''
  },
  headUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a forum head'],
    unique: true // One user can only be head of one forum
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update member count before saving
predictionForumSchema.pre('save', function() {
  this.memberCount = this.members.length;
});

// Add head to members if not already included
predictionForumSchema.pre('save', function() {
  if (this.headUserId && !this.members.includes(this.headUserId)) {
    this.members.push(this.headUserId);
  }
});

module.exports = mongoose.model('PredictionForum', predictionForumSchema);
