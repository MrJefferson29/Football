const PredictionForum = require('../models/PredictionForum');
const User = require('../models/User');

// @desc    Get all prediction forums
// @route   GET /api/prediction-forums
// @access  Public
exports.getPredictionForums = async (req, res) => {
  try {
    const forums = await PredictionForum.find({ isActive: true })
      .populate('headUserId', 'username avatar')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: forums
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get prediction forum by ID
// @route   GET /api/prediction-forums/:id
// @access  Public
exports.getPredictionForum = async (req, res) => {
  try {
    const forum = await PredictionForum.findById(req.params.id)
      .populate('headUserId', 'username avatar email')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar');

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Prediction forum not found'
      });
    }

    res.status(200).json({
      success: true,
      data: forum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all users (for admin to select forum head)
// @route   GET /api/prediction-forums/users/list
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('username email avatar role createdAt')
      .sort({ username: 1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create prediction forum (Admin only)
// @route   POST /api/prediction-forums
// @access  Private (Admin only)
exports.createPredictionForum = async (req, res) => {
  try {
    const { name, description, headUserId } = req.body;

    if (!name || !headUserId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and headUserId'
      });
    }

    // Check if user exists
    const headUser = await User.findById(headUserId);
    if (!headUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a head of another forum
    const existingForum = await PredictionForum.findOne({ headUserId });
    if (existingForum) {
      return res.status(400).json({
        success: false,
        message: 'User is already head of another prediction forum'
      });
    }

    const forum = await PredictionForum.create({
      name,
      description: description || '',
      headUserId,
      createdBy: req.user.id,
      members: [headUserId] // Add head as first member
    });

    // Track activity for the head user
    headUser.activities.push({
      action: 'Assigned as head of prediction forum',
      type: 'prediction',
      details: {
        forumId: forum._id,
        forumName: name
      }
    });
    headUser.lastActiveAt = new Date();
    await headUser.save();

    const populatedForum = await PredictionForum.findById(forum._id)
      .populate('headUserId', 'username avatar email')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar');

    res.status(201).json({
      success: true,
      data: populatedForum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update prediction forum (Forum head only)
// @route   PUT /api/prediction-forums/:id
// @access  Private (Forum head only)
exports.updatePredictionForum = async (req, res) => {
  try {
    const { name, description, profilePicture } = req.body;

    const forum = await PredictionForum.findById(req.params.id);
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
        message: 'Only the forum head can update this forum'
      });
    }

    // Update fields
    if (name) forum.name = name;
    if (description !== undefined) forum.description = description;
    if (profilePicture !== undefined) forum.profilePicture = profilePicture;

    await forum.save();

    const updatedForum = await PredictionForum.findById(forum._id)
      .populate('headUserId', 'username avatar email')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar');

    res.status(200).json({
      success: true,
      data: updatedForum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get forum by head user ID
// @route   GET /api/prediction-forums/head/:userId
// @access  Private
exports.getForumByHead = async (req, res) => {
  try {
    const forum = await PredictionForum.findOne({ 
      headUserId: req.params.userId,
      isActive: true
    })
      .populate('headUserId', 'username avatar email')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar');

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'No prediction forum found for this user'
      });
    }

    res.status(200).json({
      success: true,
      data: forum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join prediction forum
// @route   POST /api/prediction-forums/:id/join
// @access  Private
exports.joinPredictionForum = async (req, res) => {
  try {
    const forum = await PredictionForum.findById(req.params.id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Prediction forum not found'
      });
    }

    // Check if user is already a member
    if (forum.members.some(member => member.toString() === req.user.id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this forum'
      });
    }

    forum.members.push(req.user.id);
    await forum.save();

    // Track activity
    const user = await User.findById(req.user.id);
    if (user) {
      user.activities.push({
        action: 'Joined prediction forum',
        type: 'prediction',
        details: {
          forumId: forum._id,
          forumName: forum.name
        }
      });
      user.lastActiveAt = new Date();
      await user.save();
    }

    const updatedForum = await PredictionForum.findById(forum._id)
      .populate('headUserId', 'username avatar email')
      .populate('createdBy', 'username')
      .populate('members', 'username avatar');

    res.status(200).json({
      success: true,
      data: updatedForum
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get forum statistics (Public - for preview)
// @route   GET /api/prediction-forums/:id/statistics
// @access  Public
exports.getForumStatistics = async (req, res) => {
  try {
    const forum = await PredictionForum.findById(req.params.id)
      .populate('headUserId', 'username avatar')
      .select('name description profilePicture memberCount headUserId createdAt');

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Prediction forum not found'
      });
    }

    // Get prediction statistics
    const Prediction = require('../models/Prediction');
    const totalPredictions = await Prediction.countDocuments({ forumId: req.params.id });
    const completedPredictions = await Prediction.countDocuments({ 
      forumId: req.params.id, 
      status: 'completed' 
    });
    const correctPredictions = await Prediction.countDocuments({ 
      forumId: req.params.id, 
      status: 'completed',
      isCorrect: true 
    });
    const pendingPredictions = await Prediction.countDocuments({ 
      forumId: req.params.id, 
      status: 'pending' 
    });

    const accuracy = completedPredictions > 0 
      ? Math.round((correctPredictions / completedPredictions) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        forum: {
          _id: forum._id,
          name: forum.name,
          description: forum.description,
          profilePicture: forum.profilePicture,
          memberCount: forum.memberCount,
          headUserId: forum.headUserId,
          createdAt: forum.createdAt
        },
        statistics: {
          totalPredictions,
          completedPredictions,
          correctPredictions,
          pendingPredictions,
          accuracy
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete/Deactivate prediction forum (Admin only)
// @route   DELETE /api/prediction-forums/:id
// @access  Private (Admin only)
exports.deletePredictionForum = async (req, res) => {
  try {
    const forum = await PredictionForum.findById(req.params.id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: 'Prediction forum not found'
      });
    }

    // Soft delete by setting isActive to false
    forum.isActive = false;
    await forum.save();

    res.status(200).json({
      success: true,
      message: 'Prediction forum deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
