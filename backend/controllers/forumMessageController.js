const ForumMessage = require('../models/ForumMessage');
const PredictionForum = require('../models/PredictionForum');

// @desc    Get all messages for a forum
// @route   GET /api/forum-messages/:forumId
// @access  Public (forum members can view)
exports.getForumMessages = async (req, res) => {
  try {
    const messages = await ForumMessage.find({ forumId: req.params.forumId })
      .populate('headUserId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 messages

    res.status(200).json({
      success: true,
      data: messages.reverse() // Return in chronological order (oldest first)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send message to forum (Forum head only)
// @route   POST /api/forum-messages
// @access  Private (Forum head only)
exports.sendForumMessage = async (req, res) => {
  try {
    const { forumId, message, image } = req.body;

    if (!forumId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide forumId and message'
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
        message: 'Only the forum head can send messages to this forum'
      });
    }

    const forumMessage = await ForumMessage.create({
      forumId,
      headUserId: req.user.id,
      message,
      image: image || ''
    });

    const populatedMessage = await ForumMessage.findById(forumMessage._id)
      .populate('headUserId', 'username avatar');

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
