const express = require('express');
const router = express.Router();
const productionLineController = require('../controllers/productionLineController');

// 获取所有产线
router.get('/', productionLineController.getAllLines);

// 获取产线资源 (设备和班组)
router.get('/:id/resources', productionLineController.getLineResources);

// 绑定设备
router.post('/:id/bind-devices', productionLineController.bindDevices);

// 绑定班组
router.post('/:id/bind-teams', productionLineController.bindTeams);

// 解绑设备
router.post('/:id/unbind-device', productionLineController.unbindDevice);

// 解绑班组
router.post('/:id/unbind-team', productionLineController.unbindTeam);

module.exports = router;

