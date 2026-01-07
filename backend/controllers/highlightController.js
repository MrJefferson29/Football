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

    const highlights = await Highlight.find(query).sort({ createdAt: -1 });
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

