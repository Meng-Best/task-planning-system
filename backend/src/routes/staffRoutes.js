const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// 获取人员列表
router.get('/', staffController.getStaffs);

// 创建人员
router.post('/', staffController.createStaff);

// 更新人员
router.put('/:id', staffController.updateStaff);

// 删除人员
router.delete('/:id', staffController.deleteStaff);

module.exports = router;

