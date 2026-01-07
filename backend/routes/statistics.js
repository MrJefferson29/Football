const express = require('express');
const router = express.Router();
const { getStatistics } = require('../controllers/statisticsController');

router.get('/', getStatistics);

module.exports = router;

