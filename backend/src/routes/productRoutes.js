const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 获取产品列表
 *     tags: [Product]
 */
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'ok', data: products });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: 创建新产品
 *     tags: [Product]
 */
router.post('/', async (req, res) => {
  try {
    const { code, name, type, model, description } = req.body;
    const product = await prisma.product.create({
      data: { code, name, type, model, description }
    });
    res.json({ status: 'ok', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: 更新产品信息
 *     tags: [Product]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, model, description } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { code, name, type, model, description }
    });
    res.json({ status: 'ok', data: product });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: 删除产品
 *     tags: [Product]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

