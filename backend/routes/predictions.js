const express = require('express');
const router = express.Router();
const {
  getAllPredictions,
  getPredictionsByForum,
  getPrediction,
  createPrediction,
  updatePrediction,
  updatePredictionResult,
  addComment,
  likePrediction,
  deletePrediction
} = require('../controllers/predictionController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllPredictions);
router.get('/forum/:forumId', getPredictionsByForum);
router.get('/:id', getPrediction);

// Forum head routes
router.post('/', protect, createPrediction);
router.put('/:id', protect, updatePrediction);
router.delete('/:id', protect, deletePrediction);
router.put('/:id/result', protect, updatePredictionResult);

// User routes
router.post('/:id/comments', protect, addComment);
router.post('/:id/like', protect, likePrediction);

module.exports = router;
