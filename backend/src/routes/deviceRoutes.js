const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// 设备列表（支持类型和状态筛选）
router.get('/', deviceController.getDevices);

// 获取单个设备详情
router.get('/:id', deviceController.getDeviceById);

// 创建设备
router.post('/', deviceController.createDevice);

// 更新设备
router.put('/:id', deviceController.updateDevice);

// 删除设备
router.delete('/:id', deviceController.deleteDevice);

// 获取设备的维护记录
router.get('/:id/maintenance', deviceController.getDeviceMaintenanceRecords);

module.exports = router;

