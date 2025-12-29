const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: 获取订单列表
 *     tags: [Order]
 */
router.get('/', async (req, res) => {
  try {
    const { current = 1, pageSize = 10, code, name, type, productId, productCode } = req.query;
    const skip = (parseInt(current) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (code) where.code = { contains: code };
    if (name) where.name = { contains: name };
    if (type !== undefined && type !== '') {
      const t = parseInt(type);
      if (!isNaN(t)) where.type = t;
    }
    if (productId !== undefined && productId !== '') {
      const pid = parseInt(productId);
      if (!isNaN(pid)) where.productId = pid;
    }
    if (productCode) {
      where.product = {
        code: { contains: productCode }
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    res.json({ 
      status: 'ok', 
      data: {
        list: orders,
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
 * /api/orders:
 *   post:
 *     summary: 创建新订单
 *     tags: [Order]
 */
router.post('/', async (req, res) => {
  try {
    const { code, name, type, productId, quantity, deadline } = req.body;
    
    // 检查编号是否已存在
    const existing = await prisma.order.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ status: 'error', message: '订单编号已存在' });
    }

    const order = await prisma.order.create({
      data: { 
        code, 
        name, 
        type: parseInt(type), 
        productId: parseInt(productId),
        quantity: parseInt(quantity),
        deadline: new Date(deadline),
        status: 0 // 待排程
      }
    });
    res.json({ status: 'ok', data: order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: 更新订单信息
 *     tags: [Order]
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, productId, quantity, deadline, status } = req.body;
    
    const updateData = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (type !== undefined) updateData.type = parseInt(type);
    if (productId !== undefined) updateData.productId = parseInt(productId);
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (deadline) updateData.deadline = new Date(deadline);
    if (status !== undefined) updateData.status = parseInt(status);

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json({ status: 'ok', data: order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: 删除订单
 *     tags: [Order]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

