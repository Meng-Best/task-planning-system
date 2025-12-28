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
        routing: {
          include: {
            processes: {
              orderBy: { seq: 'asc' } // 按工序号排序
            }
          }
        }
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

    // 验证产品是否存在
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });
    if (!product) {
      return res.status(404).json({ status: 'error', message: '产品不存在' });
    }

    // 验证所有工艺路线是否存在
    const routings = await prisma.routing.findMany({
      where: {
        id: { in: routingIds.map(rid => parseInt(rid)) }
      }
    });

    if (routings.length !== routingIds.length) {
      const foundIds = routings.map(r => r.id);
      const missingIds = routingIds.filter(rid => !foundIds.includes(parseInt(rid)));
      return res.status(404).json({
        status: 'error',
        message: `以下工艺路线不存在: ${missingIds.join(', ')}`
      });
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
            routing: {
              include: {
                processes: {
                  orderBy: { seq: 'asc' }
                }
              }
            }
          }
        })
      )
    );

    res.json({ status: 'ok', data: productRoutings });
  } catch (error) {
    console.error('配置工艺路线失败:', error);

    // 处理重复配置的情况
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: '该工艺路线已配置，请勿重复添加' });
    }

    // 处理外键约束失败
    if (error.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: '无效的产品或工艺路线ID' });
    }

    res.status(500).json({ status: 'error', message: error.message || '配置工艺路线失败' });
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

