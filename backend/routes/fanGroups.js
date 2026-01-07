const express = require('express');
const router = express.Router();
const {
  getFanGroups,
  getFanGroup,
  createFanGroup,
  joinFanGroup,
  createPost,
  commentOnPost,
  likePost
} = require('../controllers/fanGroupController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getFanGroups);
router.get('/:id', getFanGroup);
router.post('/', protect, authorize('admin'), createFanGroup);
router.post('/:id/join', protect, joinFanGroup);
router.post('/:id/posts', protect, authorize('admin'), createPost);
router.post('/:id/posts/:postId/comments', protect, authorize('admin'), commentOnPost);
router.post('/:id/posts/:postId/like', protect, likePost);

module.exports = router;

