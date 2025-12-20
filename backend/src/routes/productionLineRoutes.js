const express = require('express');
const router = express.Router();
const productionLineController = require('../controllers/productionLineController');

// 获取所有产线
router.get('/', productionLineController.getAllLines);

// 获取产线资源 (设备和班组)
router.get('/:id/resources', productionLineController.getLineResources);

// 绑定设备
router.post('/:id/bind-devices', productionLineController.bindDevices);

// 解绑设备
router.post('/:id/unbind-device', productionLineController.unbindDevice);

module.exports = router;

