const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');

// 工位管理路由
router.get('/', stationController.getStations);
router.get('/:id', stationController.getStationById);
router.post('/', stationController.createStation);
router.put('/:id', stationController.updateStation);
router.delete('/:id', stationController.deleteStation);

// 工位资源管理
router.get('/:id/resources', stationController.getStationResources);
router.post('/:id/bind-devices', stationController.bindDevices);
router.post('/:id/unbind-device', stationController.unbindDevice);
router.post('/:id/bind-teams', stationController.bindTeams);
router.post('/:id/unbind-team', stationController.unbindTeam);

// 工位能力管理
router.post('/:id/bind-capabilities', stationController.bindCapabilities);
router.post('/:id/unbind-capability', stationController.unbindCapability);

module.exports = router;

