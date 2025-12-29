const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/routings:
 *   get:
 *     summary: 获取工艺路线列表
 *     tags: [Routing]
 */
router.get('/', async (req, res) => {
  try {
    const { current = 1, pageSize = 10, code, name, type } = req.query;
    const skip = (parseInt(current) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (code) where.code = { contains: code };
    if (name) where.name = { contains: name };
    if (type !== undefined && type !== '') {
      const t = parseInt(type);
      if (!isNaN(t)) where.type = t;
    }

    const [routings, total] = await Promise.all([
      prisma.routing.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.routing.count({ where })
    ]);

    res.json({ 
      status: 'ok', 
      data: {
        list: routings,
        total,
        current: parseInt(current),
        pageSize: parseInt(pageSize)
      } 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings:
 *   post:
 *     summary: 创建新工艺路线
 *     tags: [Routing]
 */
router.post('/', async (req, res) => {
  try {
    const { code, name, type, status, description } = req.body;
    const routing = await prisma.routing.create({
      data: { 
        code, 
        name, 
        type: type !== undefined ? parseInt(type) : 0, 
        status: status || 'active', 
        description 
      }
    });
    res.json({ status: 'ok', data: routing });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/{id}:
 *   put:
 *     summary: 更新工艺路线信息
 *     tags: [Routing]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, status, description } = req.body;
    const routing = await prisma.routing.update({
      where: { id: parseInt(id) },
      data: { 
        code, 
        name, 
        type: type !== undefined ? parseInt(type) : undefined, 
        status, 
        description 
      }
    });
    res.json({ status: 'ok', data: routing });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/{id}:
 *   delete:
 *     summary: 删除工艺路线
 *     tags: [Routing]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.routing.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Routing deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/{routingId}/processes:
 *   get:
 *     summary: 获取指定工艺路线的工序列表
 *     tags: [Routing]
 */
router.get('/:routingId/processes', async (req, res) => {
  try {
    const { routingId } = req.params;
    const processes = await prisma.routingProcess.findMany({
      where: { routingId: parseInt(routingId) },
      orderBy: { seq: 'asc' }
    });
    res.json({ status: 'ok', data: processes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/{routingId}/processes:
 *   post:
 *     summary: 为工艺路线新增工序
 *     tags: [Routing]
 */
router.post('/:routingId/processes', async (req, res) => {
  try {
    const { routingId } = req.params;
    const { seq, code, name, description } = req.body;
    const process = await prisma.routingProcess.create({
      data: {
        routingId: parseInt(routingId),
        seq: parseInt(seq),
        code,
        name,
        description
      }
    });
    res.json({ status: 'ok', data: process });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/processes/{id}:
 *   put:
 *     summary: 更新工序信息
 *     tags: [Routing]
 */
router.put('/processes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { seq, code, name, description } = req.body;
    const process = await prisma.routingProcess.update({
      where: { id: parseInt(id) },
      data: {
        seq: seq ? parseInt(seq) : undefined,
        code,
        name,
        description
      }
    });
    res.json({ status: 'ok', data: process });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/routings/processes/{id}:
 *   delete:
 *     summary: 删除工序
 *     tags: [Routing]
 */
router.delete('/processes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.routingProcess.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Process deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

