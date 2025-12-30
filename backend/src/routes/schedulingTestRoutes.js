const express = require('express');
const router = express.Router();
const schedulingTestController = require('../controllers/schedulingTestController');

// 保存测试输入数据
router.post('/test-input', schedulingTestController.saveTestInput);

// 获取测试输入数据
router.get('/test-input', schedulingTestController.getTestInput);

module.exports = router;
