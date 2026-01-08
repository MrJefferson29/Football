const ChatMessage = require('../models/Chat');
// Note: The model exports as 'ChatMessage' but file is Chat.js
const User = require('../models/User');

// @desc    Get all chat messages
// @route   GET /api/chat
// @access  Public
exports.getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .populate('userId', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'message userId',
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: messages.reverse() // Reverse to show oldest first
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send message
// @route   POST /api/chat
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, image, replyTo } = req.body;

    // Message or image must be provided
    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({
        success: false,
        message: 'Message or image is required'
      });
    }

    // If replying, verify the message exists
    if (replyTo) {
      const repliedMessage = await ChatMessage.findById(replyTo);
      if (!repliedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message being replied to not found'
        });
      }
    }

    const chatMessage = await ChatMessage.create({
      userId: req.user.id,
      message: message ? message.trim() : '',
      image: image || '',
      replyTo: replyTo || null
    });

    // Track activity
    const user = await User.findById(req.user.id);
    if (user) {
      user.activities.push({
        action: 'Sent a message in community chat',
        type: 'chat',
        details: {
          messageId: chatMessage._id,
          hasImage: !!image
        }
      });
      user.lastActiveAt = new Date();
      await user.save();
    }

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('userId', 'username avatar')
      .populate({
        path: 'replyTo',
        select: 'message userId',
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      // Format replyTo for socket emission
      let replyToData = null;
      if (populatedMessage.replyTo) {
        replyToData = {
          _id: populatedMessage.replyTo._id,
          message: populatedMessage.replyTo.message,
          userId: {
            _id: populatedMessage.replyTo.userId?._id || populatedMessage.replyTo.userId,
            username: populatedMessage.replyTo.userId?.username || 'Unknown',
            avatar: populatedMessage.replyTo.userId?.avatar
          }
        };
      }

      io.to('live-chat').emit('new-message', {
        _id: populatedMessage._id,
        userId: {
          _id: populatedMessage.userId._id,
          username: populatedMessage.userId.username,
          avatar: populatedMessage.userId.avatar
        },
        message: populatedMessage.message,
        image: populatedMessage.image,
        likes: populatedMessage.likes,
        replyTo: replyToData,
        createdAt: populatedMessage.createdAt
      });
    }

    // Format replyTo for HTTP response
    const responseData = {
      _id: populatedMessage._id,
      userId: populatedMessage.userId,
      message: populatedMessage.message,
      image: populatedMessage.image,
      likes: populatedMessage.likes,
      replyTo: replyToData, // Use the same formatted data as socket
      createdAt: populatedMessage.createdAt
    };

    res.status(201).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like message
// @route   POST /api/chat/:id/like
// @access  Private
exports.likeMessage = async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Prevent users from liking their own messages
    if (message.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot like your own message'
      });
    }

    // Check if user already liked
    const userObjectId = req.user.id;
    if (message.likedBy.some(id => id.toString() === userObjectId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this message'
      });
    }

    message.likes += 1;
    message.likedBy.push(userObjectId);
    await message.save();

    // Track activity for the message sender
    const User = require('../models/User');
    const messageSender = await User.findById(message.userId);
    if (messageSender) {
      messageSender.activities.push({
        action: `Received a like on their message`,
        type: 'like',
        details: {
          messageId: message._id,
          likedBy: req.user.id
        }
      });
      messageSender.lastActiveAt = new Date();
      await messageSender.save();
    }

    // Emit socket event for like update
    const io = req.app.get('io');
    if (io) {
      io.to('live-chat').emit('message-liked', {
        messageId: message._id,
        likes: message.likes
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

