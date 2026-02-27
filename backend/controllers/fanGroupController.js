const FanGroup = require('../models/FanGroup');
const User = require('../models/User');

// @desc    Get all fan groups
// @route   GET /api/fan-groups
// @access  Public
exports.getFanGroups = async (req, res) => {
  try {
    const groups = await FanGroup.find()
      .populate('posts.userId', 'username avatar')
      .populate('posts.comments.userId', 'username avatar')
      .sort({ memberCount: -1 });

    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get fan group by ID
// @route   GET /api/fan-groups/:id
// @access  Public
exports.getFanGroup = async (req, res) => {
  try {
    const group = await FanGroup.findById(req.params.id)
      .populate('posts.userId', 'username avatar')
      .populate('posts.comments.userId', 'username avatar')
      .populate('members', 'username avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Fan group not found'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create fan group (Admin only)
// @route   POST /api/fan-groups
// @access  Private/Admin
exports.createFanGroup = async (req, res) => {
  try {
    const { name, slogan, logo, color } = req.body;

    const group = await FanGroup.create({
      name,
      slogan: slogan || '',
      logo: logo || '',
      color: color || '#FFFFFF',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join fan group
// @route   POST /api/fan-groups/:id/join
// @access  Private
exports.joinFanGroup = async (req, res) => {
  try {
    const group = await FanGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Fan group not found'
      });
    }

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    group.members.push(req.user.id);
    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create post in fan group (Admin only)
// @route   POST /api/fan-groups/:id/posts
// @access  Private/Admin
exports.createPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, image, video, url } = req.body;

    // Validate that at least content or media is provided
    if (!content && !image && !video && !url) {
      return res.status(400).json({
        success: false,
        message: 'Post must have content, image, video, or URL'
      });
    }

    const group = await FanGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Fan group not found'
      });
    }

    group.posts.push({
      userId: req.user.id,
      content: content || '',
      image: image || '',
      video: video || '',
      url: url || ''
    });

    await group.save();

    // Track activity
    const user = await User.findById(req.user.id);
    if (user) {
      user.activities.push({
        action: `Created a post in ${group.name}`,
        type: 'join',
        details: {
          groupId: group._id,
          groupName: group.name
        }
      });
      user.lastActiveAt = new Date();
      await user.save();
    }

    const updatedGroup = await FanGroup.findById(id)
      .populate('posts.userId', 'username avatar')
      .populate('posts.comments.userId', 'username avatar');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`fan-group-${id}`).emit('new-post', {
        groupId: id,
        post: updatedGroup.posts[updatedGroup.posts.length - 1]
      });
    }

    res.status(201).json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Comment on post
// @route   POST /api/fan-groups/:id/posts/:postId/comments
// @access  Private
exports.commentOnPost = async (req, res) => {
  try {
    const { id, postId } = req.params;
    const { message } = req.body;

    const group = await FanGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Fan group not found'
      });
    }

    const post = group.posts.id(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.comments.push({
      userId: req.user.id,
      message
    });

    await group.save();

    const updatedGroup = await FanGroup.findById(id)
      .populate('posts.userId', 'username avatar')
      .populate('posts.comments.userId', 'username avatar');

    res.status(201).json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like post
// @route   POST /api/fan-groups/:id/posts/:postId/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const { id, postId } = req.params;

    const group = await FanGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Fan group not found'
      });
    }

    const post = group.posts.id(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.likedBy.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this post'
      });
    }

    post.likes += 1;
    post.likedBy.push(req.user.id);
    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

