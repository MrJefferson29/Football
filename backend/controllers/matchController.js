const Match = require('../models/Match');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
exports.getMatches = async (req, res) => {
  try {
    const { status, date, league, leagueType } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (league) {
      query.league = league;
    }

    if (leagueType) {
      query.leagueType = leagueType;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.matchDate = { $gte: startDate, $lte: endDate };
    }

    const matches = await Match.find(query).sort({ matchDate: 1 });
    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get today's matches
// @route   GET /api/matches/today
// @access  Public
exports.getTodayMatches = async (req, res) => {
  try {
    const { league, leagueType } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = {
      matchDate: { $gte: today, $lt: tomorrow }
    };

    if (league) {
      query.league = league;
    }

    if (leagueType) {
      query.leagueType = leagueType;
    }

    const matches = await Match.find(query).sort({ matchTime: 1 });

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get matches by league
// @route   GET /api/matches/league/:league
// @access  Public
exports.getMatchesByLeague = async (req, res) => {
  try {
    const { league } = req.params;
    const { status, date, leagueType } = req.query;
    
    let query = { league };

    if (status) {
      query.status = status;
    }

    if (leagueType) {
      query.leagueType = leagueType;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.matchDate = { $gte: startDate, $lte: endDate };
    }

    const matches = await Match.find(query).sort({ matchDate: 1 });

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create match (Admin only)
// @route   POST /api/matches
// @access  Private/Admin
exports.createMatch = async (req, res) => {
  try {
    const { homeTeam, awayTeam, homeLogo, awayLogo, matchTime, matchDate, league, leagueType } = req.body;

    const match = await Match.create({
      homeTeam,
      awayTeam,
      homeLogo: homeLogo || '',
      awayLogo: awayLogo || '',
      matchTime,
      matchDate: new Date(matchDate),
      league: league || 'Other',
      leagueType: leagueType || 'international',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Vote on match
// @route   POST /api/matches/:id/vote
// @access  Private
exports.voteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { prediction, homeScore, awayScore } = req.body; // prediction: 'home', 'draw', or 'away'

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if user already voted
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    const hasVoted = user.votes.some(
      vote => vote.pollType === 'match' && vote.pollId.toString() === id
    );

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted on this match'
      });
    }

    // Update vote count
    if (prediction === 'home') {
      match.votes.home += 1;
    } else if (prediction === 'draw') {
      match.votes.draw += 1;
    } else if (prediction === 'away') {
      match.votes.away += 1;
    }

    // Add score prediction if provided
    if (homeScore !== undefined && awayScore !== undefined) {
      match.scorePredictions.push({
        userId: req.user.id,
        homeScore,
        awayScore,
        pointsAwarded: false
      });
      
      // Increment total predictions count
      user.totalPredictions = (user.totalPredictions || 0) + 1;
    }

    await match.save();

    // Record vote in user
    user.votes.push({
      pollType: 'match',
      pollId: match._id,
      choice: prediction
    });
    
    // Add activity
    const scoreText = homeScore !== undefined && awayScore !== undefined 
      ? ` (${homeScore}-${awayScore})` 
      : '';
    user.activities.push({
      action: `Predicted ${match.homeTeam} vs ${match.awayTeam}: ${prediction}${scoreText}`,
      type: 'prediction',
      details: {
        matchId: match._id,
        prediction,
        homeScore,
        awayScore
      }
    });
    user.lastActiveAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get match by ID
// @route   GET /api/matches/:id
// @access  Public
exports.getMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update match final score and award points (Admin only)
// @route   PUT /api/matches/:id/score
// @access  Private/Admin
exports.updateMatchScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;

    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both homeScore and awayScore'
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if points were already awarded
    if (match.pointsAwarded) {
      return res.status(400).json({
        success: false,
        message: 'Points have already been awarded for this match'
      });
    }

    // Update match scores and status
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = 'finished';
    match.pointsAwarded = true;
    match.pointsAwardedAt = new Date();

    const User = require('../models/User');
    const PREDICTION_POINTS = 100; // Points for correct prediction
    let pointsAwardedCount = 0;

    // Check all score predictions and award points
    for (const prediction of match.scorePredictions) {
      if (prediction.pointsAwarded) continue; // Skip if already awarded

      const isCorrect = prediction.homeScore === homeScore && prediction.awayScore === awayScore;
      
      if (isCorrect) {
        const user = await User.findById(prediction.userId);
        if (user) {
          // Award points
          user.points += PREDICTION_POINTS;
          user.correctPredictions = (user.correctPredictions || 0) + 1;
          
          // Add activity
          user.activities.push({
            action: `Earned ${PREDICTION_POINTS} points for correct prediction: ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`,
            type: 'prediction',
            details: {
              matchId: match._id,
              points: PREDICTION_POINTS,
              prediction: `${prediction.homeScore}-${prediction.awayScore}`,
              actualScore: `${homeScore}-${awayScore}`
            }
          });
          
          await user.save();
          pointsAwardedCount++;
        }
        
        // Mark prediction as awarded
        prediction.pointsAwarded = true;
      } else {
        // Mark as checked (even if incorrect)
        prediction.pointsAwarded = true;
      }
    }

    await match.save();

    res.status(200).json({
      success: true,
      message: `Match score updated. ${pointsAwardedCount} users earned points.`,
      data: {
        match,
        pointsAwarded: pointsAwardedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

