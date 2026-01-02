const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analyticsController')

/**
 * @route POST /log
 * @desc Log an event
 */
router.post('/log', analyticsController.logEvent);

/**
 * @route GET /report
 * @desc Get analytics report
 */
router.get('/report', analyticsController.getReport);

module.exports = router;
