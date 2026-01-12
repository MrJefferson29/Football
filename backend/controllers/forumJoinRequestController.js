const ForumJoinRequest = require('../models/ForumJoinRequest');
const PredictionForum = require('../models/PredictionForum');
const User = require('../models/User');

// @desc    Create join request
// @route   POST /api/forum-join-requests
// @access  Private
exports.createJoinRequest = async (req, res) => {
  try {
    const { forumId, message } = req.body;

    if (!forumId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide forumId'
      });
    }

    const forum = await PredictionForum.findById(forumId);
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

    // Check if there's already a pending request
    const existingRequest = await ForumJoinRequest.findOne({
      forumId,
      userId: req.user.id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this forum'
      });
    }

    const joinRequest = await ForumJoinRequest.create({
      forumId,
      userId: req.user.id,
      message: message || ''
    });

    const populatedRequest = await ForumJoinRequest.findById(joinRequest._id)
      .populate('userId', 'username avatar email')
      .populate('forumId', 'name');

    res.status(201).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this forum'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all join requests for a forum (Forum head only)
// @route   GET /api/forum-join-requests/forum/:forumId
// @access  Private (Forum head only)
exports.getJoinRequestsByForum = async (req, res) => {
  try {
    const { forumId } = req.params;

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
        message: 'Only the forum head can view join requests'
      });
    }

    const requests = await ForumJoinRequest.find({ forumId })
      .populate('userId', 'username avatar email createdAt')
      .populate('forumId', 'name')
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all join requests for all forums where user is head
// @route   GET /api/forum-join-requests/my-forums
// @access  Private (Forum head only)
exports.getMyForumJoinRequests = async (req, res) => {
  try {
    // Find all forums where user is head
    const forums = await PredictionForum.find({
      headUserId: req.user.id,
      isActive: true
    }).select('_id');

    const forumIds = forums.map(f => f._id);

    if (forumIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const requests = await ForumJoinRequest.find({
      forumId: { $in: forumIds },
      status: 'pending'
    })
      .populate('userId', 'username avatar email createdAt')
      .populate('forumId', 'name profilePicture')
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve join request
// @route   PUT /api/forum-join-requests/:requestId/approve
// @access  Private (Forum head only)
exports.approveJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const joinRequest = await ForumJoinRequest.findById(requestId)
      .populate('forumId')
      .populate('userId');

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    const forum = joinRequest.forumId;

    // Check if user is the forum head
    if (forum.headUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the forum head can approve join requests'
      });
    }

    // Check if request is already processed
    if (joinRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${joinRequest.status}`
      });
    }

    // Check if user is already a member
    if (forum.members.some(member => member.toString() === joinRequest.userId._id.toString())) {
      // Mark request as approved even though user is already a member
      joinRequest.status = 'approved';
      await joinRequest.save();
      return res.status(200).json({
        success: true,
        message: 'User is already a member',
        data: joinRequest
      });
    }

    // Add user to forum members
    forum.members.push(joinRequest.userId._id);
    await forum.save();

    // Update request status
    joinRequest.status = 'approved';
    await joinRequest.save();

    // Track activity for the user
    const user = await User.findById(joinRequest.userId._id);
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

    const populatedRequest = await ForumJoinRequest.findById(joinRequest._id)
      .populate('userId', 'username avatar email')
      .populate('forumId', 'name');

    res.status(200).json({
      success: true,
      message: 'Join request approved',
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Decline join request
// @route   PUT /api/forum-join-requests/:requestId/decline
// @access  Private (Forum head only)
exports.declineJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const joinRequest = await ForumJoinRequest.findById(requestId)
      .populate('forumId');

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    const forum = joinRequest.forumId;

    // Check if user is the forum head
    if (forum.headUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the forum head can decline join requests'
      });
    }

    // Check if request is already processed
    if (joinRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${joinRequest.status}`
      });
    }

    // Update request status
    joinRequest.status = 'declined';
    await joinRequest.save();

    const populatedRequest = await ForumJoinRequest.findById(joinRequest._id)
      .populate('userId', 'username avatar email')
      .populate('forumId', 'name');

    res.status(200).json({
      success: true,
      message: 'Join request declined',
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's join requests
// @route   GET /api/forum-join-requests/my-requests
// @access  Private
exports.getMyJoinRequests = async (req, res) => {
  try {
    const requests = await ForumJoinRequest.find({ userId: req.user.id })
      .populate('forumId', 'name profilePicture headUserId')
      .populate('forumId.headUserId', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
