const express = require('express');
const router = express.Router();
const {
  createJoinRequest,
  getJoinRequestsByForum,
  getMyForumJoinRequests,
  approveJoinRequest,
  declineJoinRequest,
  getMyJoinRequests
} = require('../controllers/forumJoinRequestController');
const { protect } = require('../middleware/auth');

// User routes
router.post('/', protect, createJoinRequest);
router.get('/my-requests', protect, getMyJoinRequests);

// Forum head routes
router.get('/forum/:forumId', protect, getJoinRequestsByForum);
router.get('/my-forums', protect, getMyForumJoinRequests);
router.put('/:requestId/approve', protect, approveJoinRequest);
router.put('/:requestId/decline', protect, declineJoinRequest);

module.exports = router;
