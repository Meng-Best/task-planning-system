const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/rockets:
 *   get:
 *     summary: 获取火箭列表
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: 成功获取列表
 */
router.get('/', async (req, res) => {
  try {
    const rockets = await prisma.rocket.findMany({
      include: { sections: true, engines: true }
    });
    res.json({ status: 'ok', data: rockets, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/rockets:
 *   post:
 *     summary: 创建新火箭
 *     tags: [Inventory]
 */
router.post('/', async (req, res) => {
  try {
    const { code, name, model, quantity } = req.body;
    const rocket = await prisma.rocket.create({
      data: { code, name, model, quantity: parseInt(quantity) || 0 }
    });
    res.json({ status: 'ok', data: rocket, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/rockets/{id}:
 *   put:
 *     summary: 更新火箭信息
 *     tags: [Inventory]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, model, quantity } = req.body;
    const rocket = await prisma.rocket.update({
      where: { id: parseInt(id) },
      data: { code, name, model, quantity: parseInt(quantity) }
    });
    res.json({ status: 'ok', data: rocket, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/rockets/{id}:
 *   delete:
 *     summary: 删除火箭
 *     tags: [Inventory]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.rocket.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Rocket deleted', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
