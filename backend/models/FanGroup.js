const mongoose = require('mongoose');

const fanGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slogan: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#FFFFFF'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberCount: {
    type: Number,
    default: 0
  },
  posts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    video: {
      type: String,
      default: ''
    },
    url: {
      type: String,
      default: ''
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
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Update member count before saving
fanGroupSchema.pre('save', function() {
  this.memberCount = this.members.length;
});

module.exports = mongoose.model('FanGroup', fanGroupSchema);

