const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, country, age, referralCode } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    const userCountry = country && typeof country === 'string' ? country.trim() : '';
    const userAge = age !== undefined && age !== null ? Number(age) : null;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Handle referral code if provided
    let referredByUser = null;
    const REFERRAL_POINTS = 50; // Points awarded for successful referral
    
    if (referralCode && referralCode.trim()) {
      referredByUser = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
      if (!referredByUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      country: userCountry,
      age: userAge,
      referredBy: referredByUser ? referredByUser._id : null,
      activities: [{
        action: 'Registered account',
        type: 'register',
        details: { username, email, referralCode: referralCode || null }
      }],
      lastActiveAt: new Date()
    });

    // Award points for referral (both users get points)
    if (referredByUser) {
      // Award points to new user
      user.points += REFERRAL_POINTS;
      user.activities.push({
        action: `Earned ${REFERRAL_POINTS} points from referral signup`,
        type: 'register',
        details: { points: REFERRAL_POINTS, source: 'referral' }
      });
      await user.save();

      // Award points to referrer
      referredByUser.points += REFERRAL_POINTS;
      referredByUser.referrals.push(user._id);
      referredByUser.activities.push({
        action: `Earned ${REFERRAL_POINTS} points from referring ${username}`,
        type: 'register',
        details: { points: REFERRAL_POINTS, referredUser: user._id, source: 'referral' }
      });
      await referredByUser.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        country: user.country || '',
        age: user.age || null,
        points: user.points || 0,
        accuracy: user.accuracy || 0,
        referralCode: user.referralCode || '',
        rank: user.rank || 'Bronze'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active and add activity
    user.lastActiveAt = new Date();
    user.activities.push({
      action: 'Logged in',
      type: 'login',
      details: {}
    });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        country: user.country || '',
        age: user.age || null,
        points: user.points || 0,
        accuracy: user.accuracy || 0,
        referralCode: user.referralCode || '',
        rank: user.rank || 'Bronze'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Update last active time
    user.lastActiveAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        country: user.country || '',
        age: user.age || null,
        points: user.points || 0,
        accuracy: user.accuracy || 0,
        referralCode: user.referralCode || '',
        rank: user.rank || 'Bronze',
        totalPredictions: user.totalPredictions || 0,
        correctPredictions: user.correctPredictions || 0,
        referrals: user.referrals?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const updates = {};
    const allowedFields = ['username', 'avatar', 'country', 'age'];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.username && typeof updates.username === 'string') {
      updates.username = updates.username.trim();
    }
    if (updates.country && typeof updates.country === 'string') {
      updates.country = updates.country.trim();
    }
    if (updates.age !== undefined && updates.age !== null) {
      updates.age = Number(updates.age);
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        country: user.country || '',
        age: user.age || null,
        points: user.points || 0,
        accuracy: user.accuracy || 0,
        referralCode: user.referralCode || '',
        rank: user.rank || 'Bronze',
        totalPredictions: user.totalPredictions || 0,
        correctPredictions: user.correctPredictions || 0,
        referrals: user.referrals?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

