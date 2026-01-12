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

// Helper function to check if voting is disabled for a match
const isVotingDisabled = (match) => {
  if (!match.matchDate || !match.matchTime) {
    return false; // If no date/time, allow voting (fallback)
  }

  try {
    // Combine matchDate and matchTime to create a datetime
    const matchDateTime = new Date(match.matchDate);
    const [hours, minutes] = match.matchTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return false; // If time parsing fails, allow voting (fallback)
    }

    matchDateTime.setHours(hours, minutes, 0, 0);
    
    // Add 100 minutes (1 hour 40 minutes) to match time
    const votingDeadline = new Date(matchDateTime);
    votingDeadline.setMinutes(votingDeadline.getMinutes() + 100);
    
    // Check if current time has passed the voting deadline
    const now = new Date();
    return now > votingDeadline;
  } catch (error) {
    console.error('Error checking voting deadline:', error);
    return false; // On error, allow voting (fallback)
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

    // Check if voting is disabled (match time + 100 minutes has elapsed)
    if (isVotingDisabled(match)) {
      return res.status(400).json({
        success: false,
        message: 'Voting for this match has ended. Voting closes 100 minutes after match start time.'
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
    
    // Initialize activities array if it doesn't exist
    if (!user.activities || !Array.isArray(user.activities)) {
      user.activities = [];
    }
    
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
    const match = await Match.findById(req.params.id)
      .populate('scorePredictions.userId', 'username avatar');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get all users who voted on this match
    const User = require('../models/User');
    const usersWhoVoted = await User.find({
      'votes.pollType': 'match',
      'votes.pollId': match._id
    }).select('username avatar votes');

    // Map users with their vote choices
    const userVotes = usersWhoVoted.map(user => {
      const vote = user.votes.find(v => 
        v.pollType === 'match' && v.pollId.toString() === match._id.toString()
      );
      const scorePrediction = match.scorePredictions.find(sp => 
        sp.userId && sp.userId._id.toString() === user._id.toString()
      );
      return {
        userId: user._id,
        username: user.username,
        avatar: user.avatar || '',
        voteChoice: vote ? vote.choice : null, // 'home', 'draw', or 'away'
        scorePrediction: scorePrediction ? {
          homeScore: scorePrediction.homeScore,
          awayScore: scorePrediction.awayScore,
          pointsAwarded: scorePrediction.pointsAwarded,
          createdAt: scorePrediction.createdAt
        } : null
      };
    });

    const matchData = match.toObject();
    matchData.userVotes = userVotes;

    res.status(200).json({
      success: true,
      data: matchData
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
    const Prediction = require('../models/Prediction');
    const PREDICTION_POINTS = 100; // Points for correct prediction
    const FORUM_PREDICTION_POINTS = 150; // Points for forum head correct prediction
    let pointsAwardedCount = 0;
    let forumPointsAwardedCount = 0;

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
          
          // Initialize activities array if it doesn't exist
          if (!user.activities || !Array.isArray(user.activities)) {
            user.activities = [];
          }
          
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

    // Normalize team names for comparison (case-insensitive, trimmed)
    const normalizeTeamName = (name) => name.trim().toLowerCase();
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedHomeTeam = normalizeTeamName(match.homeTeam);
    const normalizedAwayTeam = normalizeTeamName(match.awayTeam);

    // Find predictions from Prediction model that match this match
    // Match by team names (both combinations: team1/team2 and home/away) and match date
    const matchDateStart = new Date(match.matchDate);
    matchDateStart.setHours(0, 0, 0, 0);
    const matchDateEnd = new Date(match.matchDate);
    matchDateEnd.setHours(23, 59, 59, 999);

    const forumPredictions = await Prediction.find({
      status: { $in: ['pending', 'live'] },
      matchDate: { $gte: matchDateStart, $lte: matchDateEnd },
      $or: [
        // Match: homeTeam = team1, awayTeam = team2
        {
          'team1.name': { $regex: new RegExp(`^${escapeRegex(match.homeTeam.trim())}$`, 'i') },
          'team2.name': { $regex: new RegExp(`^${escapeRegex(match.awayTeam.trim())}$`, 'i') }
        },
        // Match: homeTeam = team2, awayTeam = team1
        {
          'team1.name': { $regex: new RegExp(`^${escapeRegex(match.awayTeam.trim())}$`, 'i') },
          'team2.name': { $regex: new RegExp(`^${escapeRegex(match.homeTeam.trim())}$`, 'i') }
        }
      ]
    }).populate('headUserId', 'points correctPredictions totalPredictions activities');

    // Check and award points for forum predictions
    for (const forumPrediction of forumPredictions) {
      if (forumPrediction.isCorrect !== null) continue; // Already checked

      // Determine if teams match in correct order
      const isTeam1Home = normalizeTeamName(forumPrediction.team1.name) === normalizedHomeTeam;
      const predictedScore1 = isTeam1Home ? forumPrediction.predictedScore.team1 : forumPrediction.predictedScore.team2;
      const predictedScore2 = isTeam1Home ? forumPrediction.predictedScore.team2 : forumPrediction.predictedScore.team1;

      const isCorrect = predictedScore1 === homeScore && predictedScore2 === awayScore;

      // Update prediction status
      forumPrediction.isCorrect = isCorrect;
      forumPrediction.status = 'completed';
      forumPrediction.actualScore = {
        team1: isTeam1Home ? homeScore : awayScore,
        team2: isTeam1Home ? awayScore : homeScore
      };

      if (isCorrect && forumPrediction.headUserId) {
        const forumHead = forumPrediction.headUserId;
        if (typeof forumHead === 'object') {
          // Award points to forum head
          forumHead.points = (forumHead.points || 0) + FORUM_PREDICTION_POINTS;
          forumHead.correctPredictions = (forumHead.correctPredictions || 0) + 1;
          forumHead.totalPredictions = (forumHead.totalPredictions || 0) + 1;

          // Initialize activities array if it doesn't exist
          if (!forumHead.activities || !Array.isArray(forumHead.activities)) {
            forumHead.activities = [];
          }

          // Add activity
          forumHead.activities.push({
            action: `Earned ${FORUM_PREDICTION_POINTS} points for correct forum prediction: ${forumPrediction.team1.name} ${predictedScore1}-${predictedScore2} ${forumPrediction.team2.name}`,
            type: 'prediction',
            details: {
              matchId: match._id,
              predictionId: forumPrediction._id,
              points: FORUM_PREDICTION_POINTS,
              prediction: `${predictedScore1}-${predictedScore2}`,
              actualScore: `${homeScore}-${awayScore}`
            }
          });

          await forumHead.save();
          forumPointsAwardedCount++;
        }
      } else if (!isCorrect && forumPrediction.headUserId) {
        const forumHead = forumPrediction.headUserId;
        if (typeof forumHead === 'object') {
          // Still increment total predictions for incorrect ones
          forumHead.totalPredictions = (forumHead.totalPredictions || 0) + 1;
          await forumHead.save();
        }
      }

      await forumPrediction.save();
    }

    await match.save();

    const totalPointsAwarded = pointsAwardedCount + forumPointsAwardedCount;
    const message = `Match score updated. ${pointsAwardedCount} user(s) and ${forumPointsAwardedCount} forum head(s) earned points.`;

    res.status(200).json({
      success: true,
      message,
      data: {
        match,
        pointsAwarded: totalPointsAwarded,
        userPointsAwarded: pointsAwardedCount,
        forumPointsAwarded: forumPointsAwardedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

