const Poll = require('../models/Poll');
const User = require('../models/User');

// Helper to compute country and age group statistics for a poll
const updatePollStatistics = async (pollId) => {
  try {
    const poll = await Poll.findById(pollId).populate('scorePredictions.userId', 'country age');
    if (!poll) return;

    // Get all users who voted on this poll
    const voters = await User.aggregate([
      { $unwind: '$votes' },
      { $match: { 'votes.pollId': poll._id } },
      {
        $project: {
          country: 1,
          age: 1,
          choice: '$votes.choice'
        }
      }
    ]);

    const total = voters.length;
    if (total === 0) {
      poll.statistics = poll.statistics || {};
      poll.statistics.countryBreakdown = [];
      poll.statistics.ageGroupBreakdown = [];
      poll.statistics.matchPredictions = [];
      poll.statistics.scorePredictions = [];
      await poll.save();
      return;
    }

    const countryCounts = {};
    const ageGroupCounts = {};

    const getAgeGroup = (age) => {
      if (age == null || isNaN(age)) return 'Unknown';
      if (age < 18) return 'Under 18';
      if (age <= 24) return '18-24';
      if (age <= 34) return '25-34';
      if (age <= 44) return '35-44';
      if (age <= 54) return '45-54';
      return '55+';
    };

    voters.forEach((voter) => {
      const country = (voter.country || 'Unknown').trim() || 'Unknown';
      const ageGroup = getAgeGroup(voter.age);

      countryCounts[country] = (countryCounts[country] || 0) + 1;
      ageGroupCounts[ageGroup] = (ageGroupCounts[ageGroup] || 0) + 1;
    });

    const makeColor = (index) => {
      const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
      return palette[index % palette.length];
    };

    const countryBreakdown = Object.entries(countryCounts).map(([country, count], index) => ({
      country,
      percentage: Math.round((count / total) * 100),
      color: makeColor(index)
    }));

    const ageGroupBreakdown = Object.entries(ageGroupCounts).map(([ageGroup, count], index) => ({
      ageGroup,
      percentage: Math.round((count / total) * 100),
      color: makeColor(index)
    }));

    // Calculate match predictions (outcome predictions)
    const matchPredictionCounts = {};
    voters.forEach((voter) => {
      const prediction = voter.choice === 'option1' ? `${poll.option1.name} wins` : `${poll.option2.name} wins`;
      matchPredictionCounts[prediction] = (matchPredictionCounts[prediction] || 0) + 1;
    });

    const matchPredictions = Object.entries(matchPredictionCounts).map(([prediction, count], index) => ({
      prediction,
      percentage: Math.round((count / total) * 100),
      color: makeColor(index)
    }));

    // Calculate score predictions (for daily polls)
    let scorePredictions = [];
    if (poll.type === 'daily-poll' && poll.scorePredictions && poll.scorePredictions.length > 0) {
      const scoreCounts = {};
      poll.scorePredictions.forEach((pred) => {
        const scoreStr = `${pred.homeScore}-${pred.awayScore}`;
        scoreCounts[scoreStr] = (scoreCounts[scoreStr] || 0) + 1;
      });

      const totalScorePredictions = poll.scorePredictions.length;
      scorePredictions = Object.entries(scoreCounts)
        .map(([score, count], index) => ({
          score,
          percentage: Math.round((count / totalScorePredictions) * 100),
          color: makeColor(index)
        }))
        .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending
        .slice(0, 10); // Limit to top 10 most common scores
    }

    poll.statistics = poll.statistics || {};
    poll.statistics.countryBreakdown = countryBreakdown;
    poll.statistics.ageGroupBreakdown = ageGroupBreakdown;
    poll.statistics.matchPredictions = matchPredictions;
    poll.statistics.scorePredictions = scorePredictions;

    await poll.save();
  } catch (err) {
    console.error('Error updating poll statistics:', err);
  }
};

// @desc    Get active polls
// @route   GET /api/polls
// @access  Public
exports.getPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: polls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get poll by type
// @route   GET /api/polls/:type
// @access  Public
exports.getPollByType = async (req, res) => {
  try {
    const { type } = req.params;
    const poll = await Poll.findOne({ type, isActive: true }).sort({ createdAt: -1 });
    
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.status(200).json({
      success: true,
      data: poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create or update poll (Admin only)
// @route   POST /api/polls
// @access  Private/Admin
exports.createPoll = async (req, res) => {
  try {
    const { type, question, option1, option2, statistics } = req.body;

    // Check if poll of this type already exists
    let poll = await Poll.findOne({ type, isActive: true });

    if (poll) {
      // Update existing poll
      poll.question = question || poll.question;
      poll.option1 = { ...poll.option1, ...option1 } || poll.option1;
      poll.option2 = { ...poll.option2, ...option2 } || poll.option2;
      poll.statistics = statistics || poll.statistics;
      poll.createdBy = req.user.id;
      
      await poll.save();
    } else {
      // Create new poll
      poll = await Poll.create({
        type,
        question,
        option1: {
          name: option1.name,
          image: option1.image || '',
          votes: 0
        },
        option2: {
          name: option2.name,
          image: option2.image || '',
          votes: 0
        },
        statistics: statistics || {},
        createdBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Vote on poll
// @route   POST /api/polls/:id/vote
// @access  Private
exports.votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    let { choice, homeScore, awayScore } = req.body; // 'option1' or 'option2', optional scores for daily polls

    const poll = await Poll.findById(id);
    if (!poll || !poll.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Check if user already voted
    const user = await User.findById(req.user.id);
    const hasVoted = user.votes.some(
      vote => vote.pollType === poll.type && vote.pollId.toString() === id
    );

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted on this poll'
      });
    }

    // For daily polls, if scores are provided, determine choice automatically
    if (poll.type === 'daily-poll' && homeScore !== undefined && awayScore !== undefined) {
      const homeScoreNum = parseInt(homeScore);
      const awayScoreNum = parseInt(awayScore);
      
      if (isNaN(homeScoreNum) || isNaN(awayScoreNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scores. Must be valid numbers'
        });
      }

      // Determine choice based on scores
      if (homeScoreNum > awayScoreNum) {
        choice = 'option1';
      } else if (awayScoreNum > homeScoreNum) {
        choice = 'option2';
      } else {
        // Draw - default to option1, but you could handle this differently
        choice = 'option1';
      }

      // Store score prediction
      poll.scorePredictions = poll.scorePredictions || [];
      poll.scorePredictions.push({
        userId: user._id,
        homeScore: homeScoreNum,
        awayScore: awayScoreNum
      });
    }

    // Update vote count
    if (choice === 'option1') {
      poll.option1.votes += 1;
    } else if (choice === 'option2') {
      poll.option2.votes += 1;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid choice. Must be option1 or option2'
      });
    }

    await poll.save();

    // Record vote in user
    user.votes.push({
      pollType: poll.type,
      pollId: poll._id,
      choice
    });
    
    // Add activity
    const pollTypeNames = {
      'daily-poll': 'Daily Poll',
      'club-battle': 'Club Battle',
      'goat-competition': 'GOAT Competition'
    };
    user.activities.push({
      action: `Voted in ${pollTypeNames[poll.type] || poll.type}: ${poll.question}`,
      type: 'vote',
      details: {
        pollId: poll._id,
        pollType: poll.type,
        choice,
        ...(poll.type === 'daily-poll' && homeScore !== undefined && awayScore !== undefined ? {
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore)
        } : {})
      }
    });
    user.lastActiveAt = new Date();
    await user.save();

    // Update poll statistics based on user profile data
    await updatePollStatistics(poll._id);

    res.status(200).json({
      success: true,
      data: poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get poll results/statistics
// @route   GET /api/polls/:id/results
// @access  Public
exports.getPollResults = async (req, res) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findById(id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Ensure statistics are up to date
    await updatePollStatistics(poll._id);
    
    // Fetch the poll again to get updated statistics
    const updatedPoll = await Poll.findById(id);

    res.status(200).json({
      success: true,
      data: updatedPoll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

