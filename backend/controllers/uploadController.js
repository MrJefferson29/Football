const { uploadToCloudinary } = require('../utils/cloudinary');

// @desc    Upload image to Cloudinary
// @route   POST /api/upload
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const { folder } = req.body;
    const imageUrl = await uploadToCloudinary(req.file.buffer, folder || 'football-app');

    res.status(200).json({
      success: true,
      data: {
        url: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

