const User = require('../models/User');

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 100, sortBy = 'points' } = req.query;
    
    let sortCriteria = {};
    if (sortBy === 'points') {
      sortCriteria = { points: -1, accuracy: -1 };
    } else if (sortBy === 'accuracy') {
      sortCriteria = { accuracy: -1, points: -1 };
    } else {
      sortCriteria = { points: -1, accuracy: -1 };
    }

    const users = await User.find({})
      .select('username avatar points accuracy rank totalPredictions correctPredictions referrals')
      .sort(sortCriteria)
      .limit(parseInt(limit));

    // Add rank position
    const leaderboard = users.map((user, index) => ({
      ...user.toObject(),
      position: index + 1
    }));

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

