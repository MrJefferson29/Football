const express = require('express');
const router = express.Router();
const {
  getNews,
  getTrendingNews,
  createNews,
  updateNews,
  deleteNews
} = require('../controllers/newsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/trending', getTrendingNews);
router.get('/', getNews);
router.post('/', protect, authorize('admin'), createNews);
router.put('/:id', protect, authorize('admin'), updateNews);
router.delete('/:id', protect, authorize('admin'), deleteNews);

module.exports = router;

