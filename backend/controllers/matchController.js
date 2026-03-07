const Match = require('../models/Match');
const MatchBetPool = require('../models/MatchBetPool');
const BetPayment = require('../models/BetPayment');

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

    // Settle bet pools: winner gets 95% of pool; if no winner, each participant gets 95% of their stake back
    let betSettlementResult = { settled: 0, errors: [] };
    try {
      const { settleMatchBetPools } = require('./betPaymentController');
      betSettlementResult = await settleMatchBetPools(id, homeScore, awayScore);
      if (betSettlementResult.errors.length) {
        console.error('Bet pool settlement had errors:', betSettlementResult.errors);
      }
    } catch (settleErr) {
      console.error('Error settling bet pools for match:', id, settleErr);
      betSettlementResult.errors.push(settleErr.message);
    }

    const totalPointsAwarded = pointsAwardedCount + forumPointsAwardedCount;
    let message = `Match score updated. ${pointsAwardedCount} user(s) and ${forumPointsAwardedCount} forum head(s) earned points.`;
    if (betSettlementResult.settled > 0) {
      message += ` ${betSettlementResult.settled} bet pool(s) settled (95% payout/refund).`;
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        match,
        pointsAwarded: totalPointsAwarded,
        userPointsAwarded: pointsAwardedCount,
        forumPointsAwarded: forumPointsAwardedCount,
        betPoolsSettled: betSettlementResult.settled,
        betSettlementErrors: betSettlementResult.errors.length ? betSettlementResult.errors : undefined,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get betting pools for a match
//          Can be filtered by amount and prediction to return only candidate pools
// @route   GET /api/matches/:id/pools
// @access  Private (requires auth to see pools)
exports.getMatchPools = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, prediction, onlyCandidates } = req.query;

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    const query = { match: id };

    if (amount) {
      query.amount = Number(amount);
    }

    // When searching for candidate pools:
    // - Only open pools (isClosed: false)
    if (onlyCandidates === 'true') {
      query.isClosed = false;
    }

    let poolsQuery = MatchBetPool.find(query)
      .populate('participants.user', 'username avatar')
      .sort({ createdAt: 1 });

    const pools = await poolsQuery;

    // For candidate search, enforce participant-count rules in application code
    let result = pools;
    if (onlyCandidates === 'true') {
      result = pools.filter(
        (p) =>
          Array.isArray(p.participants) &&
          p.participants.length > 0 &&
          p.participants.length < 3
      );
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper: validate allowed betting amounts
const ALLOWED_BET_AMOUNTS = [1000, 2000, 5000, 10000, 50000, 100000];

// Shared logic: join or create pool for a user who has a completed payment. Throws on validation error.
async function doJoinMatchPool(userId, matchId, amount, prediction, homeScore, awayScore, poolId) {
  const numericAmount = Number(amount);
  if (!ALLOWED_BET_AMOUNTS.includes(numericAmount)) {
    const e = new Error('Invalid betting amount selected');
    e.statusCode = 400;
    throw e;
  }
  if (!['home', 'draw', 'away'].includes(prediction)) {
    const e = new Error('Invalid prediction value');
    e.statusCode = 400;
    throw e;
  }
  const match = await Match.findById(matchId);
  if (!match) {
    const e = new Error('Match not found');
    e.statusCode = 404;
    throw e;
  }
  if (match.status === 'finished') {
    const e = new Error('Betting is closed for finished matches');
    e.statusCode = 400;
    throw e;
  }
  if (isVotingDisabled(match)) {
    const e = new Error('Betting for this match has ended. Betting closes 100 minutes after match start time.');
    e.statusCode = 400;
    throw e;
  }
  const paidBet = await BetPayment.findOne({
    user: userId,
    match: matchId,
    amount: numericAmount,
    prediction,
    status: 'completed',
    usedForPool: false,
  }).sort({ createdAt: -1 });
  if (!paidBet) {
    const e = new Error('You must complete payment for this stake before joining a pool.');
    e.statusCode = 400;
    throw e;
  }
  const existingParticipation = await MatchBetPool.findOne({
    match: matchId,
    amount: numericAmount,
    'participants.user': userId,
    'participants.prediction': prediction,
  });
  if (existingParticipation) {
    const e = new Error('You already have a bet with this prediction and amount for this match');
    e.statusCode = 400;
    throw e;
  }
  let pool = null;
  if (poolId) {
    const found = await MatchBetPool.findById(poolId);
    if (
      found &&
      String(found.match) === String(matchId) &&
      found.amount === numericAmount &&
      !found.isClosed &&
      Array.isArray(found.participants) &&
      found.participants.length < 3
    ) {
      pool = found;
    }
  }
  if (!pool) {
    const candidatePools = await MatchBetPool.find({
      match: matchId,
      amount: numericAmount,
      isClosed: false,
    }).sort({ createdAt: 1 });
    pool =
      candidatePools.find(
        (p) =>
          Array.isArray(p.participants) &&
          p.participants.length > 0 &&
          p.participants.length < 3 &&
          p.participants.some((part) => part.prediction !== prediction)
      ) || null;
  }
  if (!pool) {
    pool = new MatchBetPool({
      match: matchId,
      amount: numericAmount,
      participants: [],
      isClosed: false,
    });
  }
  const alreadyInPool =
    pool.participants &&
    pool.participants.some((p) => String(p.user) === String(userId));
  if (alreadyInPool) {
    const e = new Error('You are already in this pool');
    e.statusCode = 400;
    throw e;
  }
  if (pool.participants.length >= 3) {
    pool.isClosed = true;
    await pool.save();
    const e = new Error('This pool is already full. Please try again.');
    e.statusCode = 400;
    throw e;
  }
  pool.participants.push({
    user: userId,
    prediction,
    homeScore: homeScore !== undefined ? homeScore : null,
    awayScore: awayScore !== undefined ? awayScore : null,
  });
  if (pool.participants.length >= 3) {
    pool.isClosed = true;
  }
  await pool.save();
  await BetPayment.findByIdAndUpdate(paidBet._id, {
    usedForPool: true,
    pool: pool._id,
  });
  const populatedPool = await MatchBetPool.findById(pool._id).populate(
    'participants.user',
    'username avatar'
  );
  return populatedPool;
}

exports.doJoinMatchPool = doJoinMatchPool;

// @desc    Join or create a betting pool for a match (requires completed payment)
// @route   POST /api/matches/:id/pools/join
// @access  Private
exports.joinMatchPool = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, prediction, homeScore, awayScore, poolId } = req.body;
    if (!amount || !prediction) {
      return res.status(400).json({
        success: false,
        message: 'Amount and prediction are required',
      });
    }
    const pool = await doJoinMatchPool(
      req.user.id,
      id,
      amount,
      prediction,
      homeScore,
      awayScore,
      poolId
    );
    res.status(200).json({ success: true, data: pool });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all betting pools for the current user
// @route   GET /api/matches/pools/my
// @access  Private
exports.getMyMatchPools = async (req, res) => {
  try {
    const userId = String(req.user.id);

    const pools = await MatchBetPool.find({
      'participants.user': userId,
    })
      .populate(
        'match',
        'homeTeam awayTeam homeLogo awayLogo matchDate matchTime league status homeScore awayScore'
      )
      .populate('participants.user', 'username avatar')
      .sort({ createdAt: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = [];
    const past = [];

    for (const pool of pools) {
      const obj = pool.toObject();
      const match = obj.match;
      let category = 'active';

      if (match) {
        const matchDate = match.matchDate ? new Date(match.matchDate) : null;
        const finished =
          match.status === 'finished' ||
          (match.homeScore !== null &&
            match.homeScore !== undefined &&
            match.awayScore !== null &&
            match.awayScore !== undefined);

        if (finished) {
          category = 'past';
        } else if (matchDate && matchDate < today) {
          category = 'past';
        }
      }

      // Attach the current user's entry for convenience
      const myEntry =
        (obj.participants || []).find(
          (p) =>
            String(p.user && p.user._id ? p.user._id : p.user) === userId
        ) || null;
      obj.myEntry = myEntry;

      if (category === 'past') {
        past.push(obj);
      } else {
        active.push(obj);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        active,
        past,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


