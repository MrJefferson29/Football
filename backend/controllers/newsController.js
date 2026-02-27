const News = require('../models/News');

// @desc    Get all news
// @route   GET /api/news
// @access  Public
exports.getNews = async (req, res) => {
  try {
    const { category, trending } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (trending === 'true') {
      query.isTrending = true;
    }

    const news = await News.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get trending news
// @route   GET /api/news/trending
// @access  Public
exports.getTrendingNews = async (req, res) => {
  try {
    const news = await News.find({ isTrending: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create news (Admin only)
// @route   POST /api/news
// @access  Private/Admin
exports.createNews = async (req, res) => {
  try {
    const { title, description, category, videoUrl, youtubeUrl, thumbnail } = req.body;

    const news = await News.create({
      title,
      description: description || '',
      category: category || 'other',
      videoUrl: videoUrl || '',
      youtubeUrl: youtubeUrl || '',
      thumbnail: thumbnail || '',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update news (Admin only)
// @route   PUT /api/news/:id
// @access  Private/Admin
exports.updateNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete news (Admin only)
// @route   DELETE /api/news/:id
// @access  Private/Admin
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

