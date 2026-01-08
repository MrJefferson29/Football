const Prediction = require('../models/Prediction');
const PredictionForum = require('../models/PredictionForum');
const User = require('../models/User');

// @desc    Get all predictions for a forum
// @route   GET /api/predictions/forum/:forumId
// @access  Public
exports.getPredictionsByForum = async (req, res) => {
  try {
    const { forumId } = req.params;
    const { status, limit = 50 } = req.query;

    const query = { forumId };
    if (status) {
      query.status = status;
    }

    const predictions = await Prediction.find(query)
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar')
      .sort({ matchDate: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all predictions
// @route   GET /api/predictions
// @access  Public
exports.getAllPredictions = async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const predictions = await Prediction.find(query)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar')
      .sort({ matchDate: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get prediction by ID
// @route   GET /api/predictions/:id
// @access  Public
exports.getPrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create prediction (Forum head only)
// @route   POST /api/predictions
// @access  Private (Forum head only)
exports.createPrediction = async (req, res) => {
  try {
    const {
      forumId,
      team1,
      team2,
      predictedScore,
      matchDate,
      league,
      competition,
      odds,
      predictionType,
      additionalInfo
    } = req.body;

    // Validate required fields
    if (!forumId || !team1 || !team2 || !predictedScore || !matchDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide forumId, team1, team2, predictedScore, and matchDate'
      });
    }

    // Check if forum exists
    const forum = await PredictionForum.findById(forumId);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Prediction forum not found'
      });
    }

    // Check if user is the forum head
    if (forum.headUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the forum head can create predictions'
      });
    }

    // Create prediction
    const prediction = await Prediction.create({
      forumId,
      headUserId: req.user.id,
      team1: {
        name: team1.name,
        logo: team1.logo || ''
      },
      team2: {
        name: team2.name,
        logo: team2.logo || ''
      },
      predictedScore: {
        team1: predictedScore.team1,
        team2: predictedScore.team2
      },
      matchDate: new Date(matchDate),
      league: league || '',
      competition: competition || '',
      odds: odds || null,
      predictionType: predictionType || 'match-result',
      additionalInfo: additionalInfo || ''
    });

    // Track activity for the head user
    const headUser = await User.findById(req.user.id);
    if (headUser) {
      headUser.activities.push({
        action: 'Created a prediction',
        type: 'prediction',
        details: {
          predictionId: prediction._id,
          forumId: forum._id,
          forumName: forum.name
        }
      });
      headUser.lastActiveAt = new Date();
      await headUser.save();
    }

    const populatedPrediction = await Prediction.findById(prediction._id)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar');

    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      io.to(`prediction-forum-${forumId}`).emit('new-prediction', populatedPrediction);
    }

    res.status(201).json({
      success: true,
      data: populatedPrediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update prediction (Forum head only)
// @route   PUT /api/predictions/:id
// @access  Private (Forum head only)
exports.updatePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if user is the forum head
    if (prediction.headUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the forum head can update this prediction'
      });
    }

    // Update allowed fields
    const {
      team1,
      team2,
      predictedScore,
      matchDate,
      league,
      competition,
      odds,
      predictionType,
      additionalInfo,
      status
    } = req.body;

    if (team1) {
      if (team1.name) prediction.team1.name = team1.name;
      if (team1.logo !== undefined) prediction.team1.logo = team1.logo;
    }
    if (team2) {
      if (team2.name) prediction.team2.name = team2.name;
      if (team2.logo !== undefined) prediction.team2.logo = team2.logo;
    }
    if (predictedScore) {
      if (predictedScore.team1 !== undefined) prediction.predictedScore.team1 = predictedScore.team1;
      if (predictedScore.team2 !== undefined) prediction.predictedScore.team2 = predictedScore.team2;
    }
    if (matchDate) prediction.matchDate = new Date(matchDate);
    if (league !== undefined) prediction.league = league;
    if (competition !== undefined) prediction.competition = competition;
    if (odds !== undefined) prediction.odds = odds;
    if (predictionType) prediction.predictionType = predictionType;
    if (additionalInfo !== undefined) prediction.additionalInfo = additionalInfo;
    if (status) prediction.status = status;

    await prediction.save();

    const updatedPrediction = await Prediction.findById(prediction._id)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar');

    res.status(200).json({
      success: true,
      data: updatedPrediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update actual score and check if prediction is correct (Admin or Forum head)
// @route   PUT /api/predictions/:id/result
// @access  Private (Admin or Forum head)
exports.updatePredictionResult = async (req, res) => {
  try {
    const { actualScore } = req.body;
    const prediction = await Prediction.findById(req.params.id);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if user is admin or forum head
    const isAdmin = req.user.role === 'admin';
    const isHead = prediction.headUserId.toString() === req.user.id.toString();
    
    if (!isAdmin && !isHead) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or forum head can update prediction results'
      });
    }

    if (!actualScore || actualScore.team1 === undefined || actualScore.team2 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide actualScore with team1 and team2'
      });
    }

    prediction.actualScore = {
      team1: actualScore.team1,
      team2: actualScore.team2
    };
    prediction.status = 'completed';

    // Check if prediction is correct
    const predictedMatch = prediction.predictedScore.team1 === actualScore.team1 && 
                          prediction.predictedScore.team2 === actualScore.team2;
    prediction.isCorrect = predictedMatch;

    await prediction.save();

    // Update head user's statistics if correct
    if (predictedMatch) {
      const headUser = await User.findById(prediction.headUserId);
      if (headUser) {
        headUser.correctPredictions += 1;
        headUser.totalPredictions += 1;
        headUser.points += 10; // Award points for correct prediction
        await headUser.save();
      }
    } else {
      const headUser = await User.findById(prediction.headUserId);
      if (headUser) {
        headUser.totalPredictions += 1;
        await headUser.save();
      }
    }

    const updatedPrediction = await Prediction.findById(prediction._id)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar');

    res.status(200).json({
      success: true,
      data: updatedPrediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to prediction
// @route   POST /api/predictions/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { message } = req.body;
    const prediction = await Prediction.findById(req.params.id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a comment message'
      });
    }

    prediction.comments.push({
      userId: req.user.id,
      message: message.trim()
    });

    await prediction.save();

    const updatedPrediction = await Prediction.findById(prediction._id)
      .populate('forumId', 'name profilePicture')
      .populate('headUserId', 'username avatar')
      .populate('comments.userId', 'username avatar');

    res.status(201).json({
      success: true,
      data: updatedPrediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like prediction
// @route   POST /api/predictions/:id/like
// @access  Private
exports.likePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if user already liked
    const userObjectId = req.user.id;
    if (prediction.likedBy.some(id => id.toString() === userObjectId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this prediction'
      });
    }

    prediction.likes += 1;
    prediction.likedBy.push(userObjectId);
    await prediction.save();

    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete prediction (Forum head only)
// @route   DELETE /api/predictions/:id
// @access  Private (Forum head only)
exports.deletePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if user is the forum head
    if (prediction.headUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the forum head can delete this prediction'
      });
    }

    await Prediction.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Prediction deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
