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
    const { current = 1, pageSize = 10 } = req.query;
    const skip = (parseInt(current) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.process.count()
    ]);

    res.json({ 
      status: 'ok', 
      data: {
        list: processes,
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

    // 先查询该工序的信息
    const process = await prisma.process.findUnique({
      where: { id: parseInt(id) }
    });

    if (!process) {
      return res.status(404).json({
        status: 'error',
        message: '工序不存在'
      });
    }

    // 检查是否有工艺路线正在使用该工序（通过 code 匹配）
    const usedInRoutings = await prisma.routingProcess.findMany({
      where: { code: process.code },
      include: {
        routing: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (usedInRoutings.length > 0) {
      // 获取使用该工序的工艺路线名称列表
      const routingNames = usedInRoutings
        .map(rp => rp.routing.name || rp.routing.code)
        .filter((name, index, self) => self.indexOf(name) === index) // 去重
        .slice(0, 3); // 最多显示3个

      const moreCount = usedInRoutings.length > 3 ? usedInRoutings.length - 3 : 0;
      const routingList = routingNames.join('、') + (moreCount > 0 ? ` 等${moreCount}个` : '');

      return res.status(400).json({
        status: 'error',
        message: `该工序已被 ${usedInRoutings.length} 条工艺路线使用（${routingList}），无法删除`,
        usedCount: usedInRoutings.length,
        routings: usedInRoutings.map(rp => rp.routing)
      });
    }

    // 没有被引用，可以删除
    await prisma.process.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: 'Process deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

