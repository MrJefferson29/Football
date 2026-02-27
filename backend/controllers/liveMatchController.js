const LiveMatch = require('../models/LiveMatch');

// Helper function to check if match is live
const checkIfMatchIsLive = (matchDate, matchTime) => {
  if (!matchDate) return false;
  
  const now = new Date();
  const matchDateTime = new Date(matchDate);
  
  // Parse time (format: "HH:MM")
  if (matchTime) {
    const [hours, minutes] = matchTime.split(':').map(Number);
    matchDateTime.setHours(hours, minutes, 0, 0);
  }
  
  // Match is live if current time is past match date/time
  return now >= matchDateTime;
};

// Helper function to determine match status
const getMatchStatus = (matchDate, matchTime) => {
  if (!matchDate) return 'finished';
  
  const now = new Date();
  const oneHundredMinutesAgo = new Date(now.getTime() - 100 * 60 * 1000);
  const matchDateTime = new Date(matchDate);
  
  if (matchTime) {
    const [hours, minutes] = matchTime.split(':').map(Number);
    matchDateTime.setHours(hours, minutes, 0, 0);
  }
  
  if (matchDateTime > now) {
    return 'upcoming';
  } else if (matchDateTime >= oneHundredMinutesAgo && matchDateTime <= now) {
    return 'live';
  } else {
    return 'finished';
  }
};

// @desc    Get all live matches
// @route   GET /api/live-matches
// @access  Public
exports.getLiveMatches = async (req, res) => {
  try {
    const { isLive, status } = req.query;
    let query = {};

    if (isLive !== undefined) {
      query.isLive = isLive === 'true';
    }

    const matches = await LiveMatch.find(query)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .sort({ matchDate: -1 });

    // Update isLive status and add status field based on date/time
    const updatedMatches = matches.map(match => {
      // Only check if match has a date
      if (match.matchDate) {
        const isCurrentlyLive = checkIfMatchIsLive(match.matchDate, match.matchTime);
        if (match.isLive !== isCurrentlyLive) {
          match.isLive = isCurrentlyLive;
          // Save in background, don't wait - catch errors silently
          match.save().catch(err => {
            console.error('Error updating match isLive status:', err);
          });
        }
      }
      
      // Add status field
      const matchObj = match.toObject();
      matchObj.status = getMatchStatus(match.matchDate, match.matchTime);
      return matchObj;
    });

    // Filter by status if provided
    let filteredMatches = updatedMatches;
    if (status) {
      filteredMatches = updatedMatches.filter(match => match.status === status);
    }

    res.status(200).json({
      success: true,
      data: filteredMatches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current/featured live match
// @route   GET /api/live-matches/current
// @access  Public
exports.getCurrentMatch = async (req, res) => {
  try {
    const now = new Date();
    const oneHundredMinutesAgo = new Date(now.getTime() - 100 * 60 * 1000);

    // Find matches with dates
    const allMatches = await LiveMatch.find({ matchDate: { $exists: true, $ne: null } })
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .sort({ matchDate: -1 });

    let selectedMatch = null;
    let matchStatus = 'finished'; // 'upcoming', 'live', 'finished'

    // 1. Find most upcoming match (earliest future match)
    const upcomingMatches = allMatches.filter(match => {
      if (!match.matchDate) return false;
      const matchDateTime = new Date(match.matchDate);
      if (match.matchTime) {
        const [hours, minutes] = match.matchTime.split(':').map(Number);
        matchDateTime.setHours(hours, minutes, 0, 0);
      }
      return matchDateTime > now;
    });
    
    // Sort upcoming matches by date ascending to get the earliest one
    upcomingMatches.sort((a, b) => {
      const dateA = new Date(a.matchDate);
      const dateB = new Date(b.matchDate);
      if (a.matchTime) {
        const [hoursA, minutesA] = a.matchTime.split(':').map(Number);
        dateA.setHours(hoursA, minutesA, 0, 0);
      }
      if (b.matchTime) {
        const [hoursB, minutesB] = b.matchTime.split(':').map(Number);
        dateB.setHours(hoursB, minutesB, 0, 0);
      }
      return dateA.getTime() - dateB.getTime();
    });
    
    const upcomingMatch = upcomingMatches[0];

    if (upcomingMatch) {
      selectedMatch = upcomingMatch;
      matchStatus = 'upcoming';
    } else {
      // 2. Find match that started within last 100 minutes
      const recentMatch = allMatches.find(match => {
        if (!match.matchDate) return false;
        const matchDateTime = new Date(match.matchDate);
        if (match.matchTime) {
          const [hours, minutes] = match.matchTime.split(':').map(Number);
          matchDateTime.setHours(hours, minutes, 0, 0);
        }
        return matchDateTime >= oneHundredMinutesAgo && matchDateTime <= now;
      });

      if (recentMatch) {
        selectedMatch = recentMatch;
        matchStatus = 'live';
        // Update isLive status
        if (!recentMatch.isLive) {
          recentMatch.isLive = true;
          await recentMatch.save();
        }
      } else {
        // 3. Get last match played (most recent finished match)
        const finishedMatches = allMatches.filter(match => {
          if (!match.matchDate) return false;
          const matchDateTime = new Date(match.matchDate);
          if (match.matchTime) {
            const [hours, minutes] = match.matchTime.split(':').map(Number);
            matchDateTime.setHours(hours, minutes, 0, 0);
          }
          return matchDateTime < oneHundredMinutesAgo;
        });

        if (finishedMatches.length > 0) {
          // Get the most recent finished match (first in sorted array since sorted by matchDate desc)
          selectedMatch = finishedMatches[0];
          matchStatus = 'finished';
        }
      }
    }

    if (!selectedMatch) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No matches available'
      });
    }

    // Add status to match object
    const matchData = selectedMatch.toObject();
    matchData.status = matchStatus;

    res.status(200).json({
      success: true,
      data: matchData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get live match by ID
// @route   GET /api/live-matches/:id
// @access  Public
exports.getLiveMatch = async (req, res) => {
  try {
    const match = await LiveMatch.findById(req.params.id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Live match not found'
      });
    }

    // Update isLive status based on date/time (only if matchDate exists)
    if (match.matchDate) {
      const isCurrentlyLive = checkIfMatchIsLive(match.matchDate, match.matchTime);
      if (match.isLive !== isCurrentlyLive) {
        match.isLive = isCurrentlyLive;
        await match.save();
      }
    }

    // Add status field
    const matchData = match.toObject();
    matchData.status = getMatchStatus(match.matchDate, match.matchTime);

    res.status(200).json({
      success: true,
      data: matchData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create live match (Admin only)
// @route   POST /api/live-matches
// @access  Private/Admin
exports.createLiveMatch = async (req, res) => {
  try {
    const {
      title,
      description,
      homeTeam,
      awayTeam,
      homeLogo,
      awayLogo,
      youtubeUrl,
      thumbnail,
      matchDate,
      matchTime
    } = req.body;

    // Validate required fields
    if (!matchDate) {
      return res.status(400).json({
        success: false,
        message: 'Match date is required'
      });
    }

    // Check if match should be live based on date/time
    const isCurrentlyLive = checkIfMatchIsLive(matchDate, matchTime);

    const match = await LiveMatch.create({
      title,
      description: description || '',
      homeTeam,
      awayTeam,
      homeLogo: homeLogo || '',
      awayLogo: awayLogo || '',
      youtubeUrl,
      thumbnail: thumbnail || '',
      matchDate: new Date(matchDate),
      matchTime: matchTime || '00:00',
      isLive: isCurrentlyLive,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to live match
// @route   POST /api/live-matches/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Live match not found'
      });
    }

    match.comments.push({
      userId: req.user.id,
      message
    });

    await match.save();

    const updatedMatch = await LiveMatch.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`live-match-${id}`).emit('new-comment', {
        matchId: id,
        comment: updatedMatch.comments[updatedMatch.comments.length - 1]
      });
    }

    res.status(201).json({
      success: true,
      data: updatedMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reply to comment
// @route   POST /api/live-matches/:id/comments/:commentId/reply
// @access  Private
exports.replyToComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { message } = req.body;

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Live match not found'
      });
    }

    const comment = match.comments.id(commentId);
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

    await match.save();

    const updatedMatch = await LiveMatch.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username');

    res.status(201).json({
      success: true,
      data: updatedMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like comment
// @route   POST /api/live-matches/:id/comments/:commentId/like
// @access  Private
exports.likeComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Live match not found'
      });
    }

    const comment = match.comments.id(commentId);
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

    await match.save();

    // Populate the match with updated data
    const updatedMatch = await LiveMatch.findById(id)
      .populate('comments.userId', 'username avatar')
      .populate('comments.replies.userId', 'username avatar')
      .populate('comments.likedBy', 'username')
      .populate('comments.likedBy', 'username');

    // Find the updated comment
    const updatedComment = updatedMatch.comments.id(commentId);

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

