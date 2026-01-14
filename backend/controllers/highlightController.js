const Highlight = require('../models/Highlight');

// @desc    Get all highlights
// @route   GET /api/highlights
// @access  Public
exports.getHighlights = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    const highlights = await Highlight.find(query)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .populate('comments.likedBy', 'username')
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: highlights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get highlight by ID
// @route   GET /api/highlights/:id
// @access  Public
exports.getHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .populate('comments.likedBy', 'username');

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    res.status(200).json({
      success: true,
      data: highlight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create highlight (Admin only)
// @route   POST /api/highlights
// @access  Private/Admin
exports.createHighlight = async (req, res) => {
  try {
    const { title, description, category, youtubeUrl, thumbnail, duration, views } = req.body;

    const highlight = await Highlight.create({
      title,
      description: description || '',
      category: category || 'highlights',
      youtubeUrl,
      thumbnail: thumbnail || '',
      duration: duration || '',
      views: views || '0',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: highlight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update highlight (Admin only)
// @route   PUT /api/highlights/:id
// @access  Private/Admin
exports.updateHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    res.status(200).json({
      success: true,
      data: highlight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete highlight (Admin only)
// @route   DELETE /api/highlights/:id
// @access  Private/Admin
exports.deleteHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findByIdAndDelete(req.params.id);

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to highlight
// @route   POST /api/highlights/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const highlight = await Highlight.findById(id);
    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    highlight.comments.push({
      userId: req.user.id,
      message
    });

    await highlight.save();

    const updatedHighlight = await Highlight.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username');

    res.status(201).json({
      success: true,
      data: updatedHighlight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reply to comment
// @route   POST /api/highlights/:id/comments/:commentId/reply
// @access  Private
exports.replyToComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { message } = req.body;

    const highlight = await Highlight.findById(id);
    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    const comment = highlight.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.replies.push({
      userId: req.user.id,
      message
    });

    await highlight.save();

    const updatedHighlight = await Highlight.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username');

    res.status(201).json({
      success: true,
      data: updatedHighlight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like comment
// @route   POST /api/highlights/:id/comments/:commentId/like
// @access  Private
exports.likeComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    const highlight = await Highlight.findById(id);
    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found'
      });
    }

    const comment = highlight.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Initialize likedBy array if it doesn't exist
    if (!comment.likedBy) {
      comment.likedBy = [];
    }

    // Check if user already liked this comment
    const userLikedIndex = comment.likedBy.findIndex(
      (likedUserId) => likedUserId.toString() === userId.toString()
    );

    if (userLikedIndex > -1) {
      // User already liked, so unlike (remove from array and decrement)
      comment.likedBy.splice(userLikedIndex, 1);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // User hasn't liked, so like (add to array and increment)
      comment.likedBy.push(userId);
      comment.likes += 1;
    }

    await highlight.save();

    // Populate the comment with updated data
    const updatedHighlight = await Highlight.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .populate('comments.likedBy', 'username');

    // Find the updated comment
    const updatedComment = updatedHighlight.comments.id(commentId);

    res.status(200).json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

