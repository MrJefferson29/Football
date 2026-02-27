const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  country: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalPredictions: {
    type: Number,
    default: 0
  },
  correctPredictions: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    default: 'Bronze'
  },
  votes: [{
    pollType: {
      type: String,
      enum: ['daily-poll', 'club-battle', 'goat-competition', 'match']
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'votes.pollType'
    },
    choice: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  activities: [{
    action: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['vote', 'register', 'login', 'prediction', 'comment', 'like', 'join', 'chat'],
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate referral code before saving (if new user)
userSchema.pre('save', async function () {
  if (this.isNew && !this.referralCode) {
    // Generate unique referral code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await mongoose.model('User').findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      }
    }
    this.referralCode = code;
  }
  
  // Hash password before saving
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Calculate accuracy
  if (this.totalPredictions > 0) {
    this.accuracy = Math.round((this.correctPredictions / this.totalPredictions) * 100);
  }
  
  // Calculate rank based on points
  if (this.points >= 10000) {
    this.rank = 'Legend';
  } else if (this.points >= 5000) {
    this.rank = 'Master';
  } else if (this.points >= 2500) {
    this.rank = 'Expert';
  } else if (this.points >= 1000) {
    this.rank = 'Advanced';
  } else if (this.points >= 500) {
    this.rank = 'Professional';
  } else if (this.points >= 250) {
    this.rank = 'Intermediate';
  } else if (this.points >= 100) {
    this.rank = 'Rookie';
  } else {
    this.rank = 'Bronze';
  }
});


// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

