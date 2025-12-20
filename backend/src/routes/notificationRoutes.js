const express = require('express');
const router = express.Router();
const { getNotifications } = require('../utils/notificationStore');

/**
 * GET /api/notifications
 * 获取最新的系统通知
 */
router.get('/', (req, res) => {
  try {
    const list = getNotifications();
    res.json({
      status: 'ok',
      data: list,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getNotifications]:', error);
    res.status(500).json({
      status: 'error',
      message: '无法获取通知'
    });
  }
});

module.exports = router;

