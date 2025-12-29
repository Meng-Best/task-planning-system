const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/production-tasks:
 *   get:
 *     summary: 获取生产任务列表
 *     tags: [ProductionTask]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: 任务状态 (0=待拆分, 1=已拆分)
 *       - in: query
 *         name: current
 *         schema:
 *           type: integer
 *         description: 当前页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功返回任务列表
 */
router.get('/', async (req, res) => {
    try {
        const { status, current = 1, pageSize = 10 } = req.query;

        const where = {};
        if (status !== undefined) {
            where.status = parseInt(status);
        }

        const skip = (parseInt(current) - 1) * parseInt(pageSize);
        const take = parseInt(pageSize);

        const [list, total, allTotal, pendingCount, schedulingCount] = await Promise.all([
            prisma.productionTask.findMany({
                where,
                include: {
                    order: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            type: true
                        }
                    },
                    product: {
                        select: {
                            id: true,
                            code: true,
                            name: true
                        }
                    }
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.productionTask.count({ where }),
            prisma.productionTask.count(),
            prisma.productionTask.count({ where: { status: 0 } }),
            prisma.productionTask.count({ where: { status: 1 } })
        ]);

        res.json({
            status: 'ok',
            data: {
                list,
                total,
                current: parseInt(current),
                pageSize: parseInt(pageSize),
                allTotal,
                pendingCount,
                schedulingCount
            }
        });
    } catch (error) {
        console.error('获取生产任务列表失败:', error);
        res.status(500).json({
            status: 'error',
            message: '获取生产任务列表失败'
        });
    }
});

/**
 * @swagger
 * /api/production-tasks/from-order:
 *   post:
 *     summary: 从订单创建生产任务
 *     tags: [ProductionTask]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: integer
 *               taskCount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 成功创建任务
 */
router.post('/from-order', async (req, res) => {
    try {
        const { orderId, taskCount } = req.body;

        // 获取订单信息
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: '订单不存在'
            });
        }

        // 检查剩余可创建数量
        const remainingQuantity = order.quantity - order.scheduledQuantity;
        if (taskCount > remainingQuantity) {
            return res.status(400).json({
                status: 'error',
                message: `超出可创建数量，剩余可创建: ${remainingQuantity}`
            });
        }

        // 使用事务创建任务并更新订单
        const result = await prisma.$transaction(async (tx) => {
            // 创建任务
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const taskCode = `TASK-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(order.scheduledQuantity + i + 1).padStart(3, '0')}`;
                const task = await tx.productionTask.create({
                    data: {
                        code: taskCode,
                        orderId: orderId,
                        productId: order.productId,
                        quantity: 1,
                        status: 0,
                        priority: 5,
                        deadline: order.deadline
                    }
                });
                tasks.push(task);
            }

            // 更新订单的 scheduledQuantity
            await tx.order.update({
                where: { id: orderId },
                data: {
                    scheduledQuantity: order.scheduledQuantity + taskCount
                }
            });

            return tasks;
        });

        res.json({
            status: 'ok',
            message: `成功创建 ${taskCount} 个生产任务`,
            data: result
        });
    } catch (error) {
        console.error('创建生产任务失败:', error);
        res.status(500).json({
            status: 'error',
            message: '创建生产任务失败'
        });
    }
});

/**
 * @swagger
 * /api/production-tasks/{id}:
 *   put:
 *     summary: 更新生产任务
 *     tags: [ProductionTask]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 成功更新任务
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const task = await prisma.productionTask.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({
            status: 'ok',
            data: task
        });
    } catch (error) {
        console.error('更新生产任务失败:', error);
        res.status(500).json({
            status: 'error',
            message: '更新生产任务失败'
        });
    }
});

/**
 * @swagger
 * /api/production-tasks/{id}:
 *   delete:
 *     summary: 删除生产任务
 *     tags: [ProductionTask]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功删除任务
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 使用事务删除任务并更新订单
        await prisma.$transaction(async (tx) => {
            // 获取任务信息
            const task = await tx.productionTask.findUnique({
                where: { id: parseInt(id) }
            });

            if (!task) {
                throw new Error('任务不存在');
            }

            // 删除任务
            await tx.productionTask.delete({
                where: { id: parseInt(id) }
            });

            // 更新订单的 scheduledQuantity
            const order = await tx.order.findUnique({
                where: { id: task.orderId }
            });

            if (order) {
                await tx.order.update({
                    where: { id: task.orderId },
                    data: {
                        scheduledQuantity: Math.max(0, order.scheduledQuantity - task.quantity)
                    }
                });
            }
        });

        res.json({
            status: 'ok',
            message: '删除成功'
        });
    } catch (error) {
        console.error('删除生产任务失败:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || '删除生产任务失败'
        });
    }
});

module.exports = router;
