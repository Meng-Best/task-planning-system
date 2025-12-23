const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/sections:
 *   get:
 *     summary: 获取舱段列表
 *     tags: [Inventory]
 */
router.get('/', async (req, res) => {
    try {
        const sections = await prisma.rocketSection.findMany({
            include: { rocket: true }
        });
        res.json({ status: 'ok', data: sections, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/sections:
 *   post:
 *     summary: 创建新舱段
 *     tags: [Inventory]
 */
router.post('/', async (req, res) => {
    try {
        const { code, name, type, quantity, rocketId } = req.body;
        const section = await prisma.rocketSection.create({
            data: {
                code,
                name,
                type,
                quantity: parseInt(quantity) || 0,
                rocketId: rocketId ? parseInt(rocketId) : null
            }
        });
        res.json({ status: 'ok', data: section, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/sections/{id}:
 *   put:
 *     summary: 更新舱段信息
 *     tags: [Inventory]
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, type, quantity, rocketId } = req.body;
        const section = await prisma.rocketSection.update({
            where: { id: parseInt(id) },
            data: {
                code,
                name,
                type,
                quantity: parseInt(quantity) || 0,
                rocketId: rocketId ? parseInt(rocketId) : null
            }
        });
        res.json({ status: 'ok', data: section, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * @swagger
 * /api/sections/{id}:
 *   delete:
 *     summary: 删除舱段
 *     tags: [Inventory]
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.rocketSection.delete({ where: { id: parseInt(id) } });
        res.json({ status: 'ok', message: 'Section deleted', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
