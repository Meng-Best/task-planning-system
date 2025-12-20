const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// 获取仪表盘统计数据
router.get('/stats', dashboardController.getDashboardStats);
router.get('/trend', dashboardController.getResourceTrend);

module.exports = router;

