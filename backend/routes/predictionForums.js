const express = require('express');
const router = express.Router();
const {
  getPredictionForums,
  getPredictionForum,
  getAllUsers,
  createPredictionForum,
  updatePredictionForum,
  getForumByHead,
  joinPredictionForum,
  deletePredictionForum,
  getForumStatistics
} = require('../controllers/predictionForumController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getPredictionForums);

// Admin routes - must come before /:id to avoid route conflicts
router.get('/users/list', protect, authorize('admin'), getAllUsers);

// Must come after /users/list
router.get('/head/:userId', protect, getForumByHead);
router.get('/:id/statistics', getForumStatistics); // Must come before /:id
router.get('/:id', getPredictionForum);
router.post('/', protect, authorize('admin'), createPredictionForum);
router.delete('/:id', protect, authorize('admin'), deletePredictionForum);

// Forum head routes
router.put('/:id', protect, updatePredictionForum);

// User routes
router.post('/:id/join', protect, joinPredictionForum);

module.exports = router;
