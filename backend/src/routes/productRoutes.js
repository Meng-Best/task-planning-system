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

/**
 * @swagger
 * /api/products/{id}/routings:
 *   get:
 *     summary: 获取产品的工艺路线配置
 *     tags: [Product]
 */
router.get('/:id/routings', async (req, res) => {
  try {
    const { id } = req.params;
    const productRoutings = await prisma.productRouting.findMany({
      where: { productId: parseInt(id) },
      include: {
        routing: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'ok', data: productRoutings });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}/routings:
 *   post:
 *     summary: 为产品配置工艺路线
 *     tags: [Product]
 */
router.post('/:id/routings', async (req, res) => {
  try {
    const { id } = req.params;
    const { routingIds } = req.body;

    if (!routingIds || !Array.isArray(routingIds) || routingIds.length === 0) {
      return res.status(400).json({ status: 'error', message: '请选择至少一个工艺路线' });
    }

    // 批量创建产品工艺路线关联
    const productRoutings = await prisma.$transaction(
      routingIds.map(routingId =>
        prisma.productRouting.create({
          data: {
            productId: parseInt(id),
            routingId: parseInt(routingId)
          },
          include: {
            routing: true
          }
        })
      )
    );

    res.json({ status: 'ok', data: productRoutings });
  } catch (error) {
    // 处理重复配置的情况
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: '该工艺路线已配置，请勿重复添加' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/products/routings/{id}:
 *   delete:
 *     summary: 解绑产品的工艺路线
 *     tags: [Product]
 */
router.delete('/routings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productRouting.delete({
      where: { id: parseInt(id) }
    });
    res.json({ status: 'ok', message: '工艺路线已解绑' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

