const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/engines:
 *   get:
 *     summary: 获取发动机列表
 *     tags: [Inventory]
 */
router.get('/', async (req, res) => {
    try {
        const engines = await prisma.engine.findMany({
            include: { rocket: true }
        });
        res.json({ status: 'ok', data: engines, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/engines:
 *   post:
 *     summary: 创建新发动机
 *     tags: [Inventory]
 */
router.post('/', async (req, res) => {
    try {
        const { code, name, model, quantity, rocketId } = req.body;
        const engine = await prisma.engine.create({
            data: {
                code,
                name,
                model,
                quantity: parseInt(quantity) || 0,
                rocketId: rocketId ? parseInt(rocketId) : null
            }
        });
        res.json({ status: 'ok', data: engine, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/engines/{id}:
 *   put:
 *     summary: 更新发动机信息
 *     tags: [Inventory]
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, model, quantity, rocketId } = req.body;
        const engine = await prisma.engine.update({
            where: { id: parseInt(id) },
            data: {
                code,
                name,
                model,
                quantity: parseInt(quantity) || 0,
                rocketId: rocketId ? parseInt(rocketId) : null
            }
        });
        res.json({ status: 'ok', data: engine, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/engines/{id}:
 *   delete:
 *     summary: 删除发动机
 *     tags: [Inventory]
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.engine.delete({ where: { id: parseInt(id) } });
        res.json({ status: 'ok', message: 'Engine deleted', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
