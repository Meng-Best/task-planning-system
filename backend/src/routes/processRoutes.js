const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/processes:
 *   get:
 *     summary: 获取工序列表
 *     tags: [Process]
 */
router.get('/', async (req, res) => {
  try {
    const processes = await prisma.process.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'ok', data: processes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/processes:
 *   post:
 *     summary: 创建新工序
 *     tags: [Process]
 */
router.post('/', async (req, res) => {
  try {
    const { code, name, type, description } = req.body;
    const process = await prisma.process.create({
      data: { code, name, type, description }
    });
    res.json({ status: 'ok', data: process });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/processes/{id}:
 *   put:
 *     summary: 更新工序信息
 *     tags: [Process]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, description } = req.body;
    const process = await prisma.process.update({
      where: { id: parseInt(id) },
      data: { code, name, type, description }
    });
    res.json({ status: 'ok', data: process });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/processes/{id}:
 *   delete:
 *     summary: 删除工序
 *     tags: [Process]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.process.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Process deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

