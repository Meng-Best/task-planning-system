const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// 获取班组列表
router.get('/', teamController.getTeams);

// 获取可选人员
router.get('/available-staff', teamController.getAvailableStaff);

// 创建班组
router.post('/', teamController.createTeam);

// 更新班组
router.put('/:id', teamController.updateTeam);

// 删除班组
router.delete('/:id', teamController.deleteTeam);

module.exports = router;

