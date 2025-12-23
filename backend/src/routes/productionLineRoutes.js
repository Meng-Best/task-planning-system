const express = require('express');
const router = express.Router();
const productionLineController = require('../controllers/productionLineController');

// 获取所有产线
router.get('/', productionLineController.getAllLines);

// 获取产线资源 (工位)
router.get('/:id/resources', productionLineController.getLineResources);

// 绑定工位
router.post('/:id/bind-stations', productionLineController.bindStations);

// 解绑工位
router.post('/:id/unbind-station', productionLineController.unbindStation);

module.exports = router;

