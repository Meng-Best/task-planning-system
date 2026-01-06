const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 获取带拆分步骤的生产任务（含过滤与分页）
 * status 参数支持逗号分隔的多个状态，如 "1,2"
 */
router.get('/with-schedule', async (req, res) => {
    try {
        const {
            status = '1',
            current = 1,
            pageSize = 10,
            orderCode,
            productCode,
            deadlineStart,
            deadlineEnd
        } = req.query;

        const where = {};

        // 支持多个状态查询，如 status=1,2
        if (status !== undefined && status !== '') {
            const statusArr = String(status).split(',').map(s => parseInt(s.trim())).filter(s => !Number.isNaN(s));
            if (statusArr.length === 1) {
                where.status = statusArr[0];
            } else if (statusArr.length > 1) {
                where.status = { in: statusArr };
            }
        }

        if (orderCode) {
            where.order = {
                code: {
                    contains: orderCode,
                    mode: 'insensitive'
                }
            };
        }

        if (productCode) {
            where.product = {
                code: {
                    contains: productCode,
                    mode: 'insensitive'
                }
            };
        }

        if (deadlineStart || deadlineEnd) {
            where.deadline = {};
            if (deadlineStart) {
                where.deadline.gte = new Date(deadlineStart);
            }
            if (deadlineEnd) {
                where.deadline.lte = new Date(deadlineEnd);
            }
        }

        const skip = (parseInt(current) - 1) * parseInt(pageSize);
        const take = parseInt(pageSize);


        const [list, total, pendingCount, schedulingCount] = await Promise.all([
            prisma.productionTask.findMany({
                where,
                include: {
                    order: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            type: true,
                            quantity: true
                        }
                    },
                    product: {
                        include: {
                            routings: {
                                include: {
                                    routing: {
                                        include: {
                                            processes: {
                                                orderBy: { seq: 'asc' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    steps: {
                        include: {
                            product: {
                                include: {
                                    routings: {
                                        include: {
                                            routing: {
                                                include: {
                                                    processes: {
                                                        orderBy: { seq: 'asc' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            seq: 'asc'
                        }
                    }
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.productionTask.count({ where }),
            prisma.productionTask.count({ where: { status: 0 } }),
            prisma.productionTask.count({ where: { status: 1 } })
        ]);

        // 收集所有工序编码，用于查询 Process 表获取 standardTime
        const processCodeSet = new Set();
        const collectProcessCodes = (product) => {
            if (product?.routings) {
                for (const pr of product.routings) {
                    if (pr.routing?.processes) {
                        for (const proc of pr.routing.processes) {
                            processCodeSet.add(proc.code);
                        }
                    }
                }
            }
        };

        for (const task of list) {
            collectProcessCodes(task.product);
            if (task.steps) {
                for (const step of task.steps) {
                    collectProcessCodes(step.product);
                }
            }
        }

        // 从 Process 表批量查询 standardTime
        const processCodes = Array.from(processCodeSet);
        const processTimeMap = new Map();

        if (processCodes.length > 0) {
            const processes = await prisma.process.findMany({
                where: { code: { in: processCodes } },
                select: { code: true, standardTime: true }
            });
            for (const p of processes) {
                processTimeMap.set(p.code, p.standardTime);
            }
        }

        // 丰富工序数据：添加 duration 字段（来自 Process.standardTime）
        const enrichProcesses = (product) => {
            if (product?.routings) {
                for (const pr of product.routings) {
                    if (pr.routing?.processes) {
                        for (const proc of pr.routing.processes) {
                            // 添加 duration 字段（单位：小时，与数据库一致）
                            proc.duration = processTimeMap.get(proc.code) || 0;
                        }
                    }
                }
            }
        };

        for (const task of list) {
            enrichProcesses(task.product);
            if (task.steps) {
                for (const step of task.steps) {
                    enrichProcesses(step.product);
                }
            }
        }

        res.json({
            status: 'ok',
            data: {
                list,
                total,
                current: parseInt(current),
                pageSize: parseInt(pageSize),
                pendingCount,
                schedulingCount
            }
        });
    } catch (error) {
        console.error('获取包含拆分步骤的生产任务失败:', error);
        res.status(500).json({
            status: 'error',
            message: '获取包含拆分步骤的生产任务失败'
        });
    }
});

/**
 * @swagger
 * /api/production-tasks/pending-production:
 *   get:
 *     summary: 获取待生产任务列表（生产任务池）
 *     tags: [ProductionTask]
 *     parameters:
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
 *       - in: query
 *         name: orderCode
 *         schema:
 *           type: string
 *         description: 订单编号筛选
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         description: 产品编号筛选
 *     responses:
 *       200:
 *         description: 成功返回待生产任务列表
 */
router.get('/pending-production', async (req, res) => {
    try {
        const { current = 1, pageSize = 10, orderCode, productCode } = req.query;

        const where = { status: 3 }; // 只查询待生产状态

        if (orderCode) {
            where.order = {
                code: { contains: orderCode }
            };
        }

        if (productCode) {
            where.product = {
                code: { contains: productCode }
            };
        }

        const skip = (parseInt(current) - 1) * parseInt(pageSize);
        const take = parseInt(pageSize);

        const [list, total] = await Promise.all([
            prisma.productionTask.findMany({
                where,
                include: {
                    order: {
                        select: { id: true, code: true, name: true, type: true }
                    },
                    product: {
                        select: { id: true, code: true, name: true }
                    },
                    steps: {
                        include: {
                            product: { select: { id: true, code: true, name: true } }
                        },
                        orderBy: { seq: 'asc' }
                    }
                },
                skip,
                take,
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.productionTask.count({ where })
        ]);

        res.json({
            status: 'ok',
            data: { list, total, current: parseInt(current), pageSize: parseInt(pageSize) }
        });
    } catch (error) {
        console.error('获取待生产任务列表失败:', error);
        res.status(500).json({
            status: 'error',
            message: '获取待生产任务列表失败'
        });
    }
});

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

        // 参数验证
        if (!orderId) {
            console.error('[from-order] 缺少参数 orderId');
            return res.status(400).json({
                status: 'error',
                message: '缺少必要参数: orderId'
            });
        }

        if (!taskCount || taskCount < 1) {
            console.error('[from-order] 无效的 taskCount:', taskCount);
            return res.status(400).json({
                status: 'error',
                message: '任务数量必须大于0'
            });
        }

        console.log(`[from-order] 开始创建任务 - 订单ID: ${orderId}, 数量: ${taskCount}`);

        // 获取订单信息
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { product: true }
        });

        if (!order) {
            console.error('[from-order] 订单不存在:', orderId);
            return res.status(404).json({
                status: 'error',
                message: '订单不存在'
            });
        }

        console.log(`[from-order] 找到订单: ${order.code}, 产品ID: ${order.productId}`);

        // 检查剩余可创建数量
        const remainingQuantity = order.quantity - order.scheduledQuantity;
        if (taskCount > remainingQuantity) {
            console.error(`[from-order] 超出可创建数量 - 请求: ${taskCount}, 剩余: ${remainingQuantity}`);
            return res.status(400).json({
                status: 'error',
                message: `超出可创建数量，剩余可创建: ${remainingQuantity}`
            });
        }

        // 使用事务创建任务并更新订单
        const result = await prisma.$transaction(async (tx) => {
            // 获取今天的日期字符串
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const todayPrefix = `TASK-${today}-`;

            // 查询今天已创建的任务数量，以此生成新的序号
            const existingTasksToday = await tx.productionTask.findMany({
                where: {
                    code: {
                        startsWith: todayPrefix
                    }
                },
                select: { code: true }
            });

            // 从已有任务编号中提取最大序号
            let maxSeq = 0;
            existingTasksToday.forEach(t => {
                const match = t.code.match(/TASK-\d{8}-(\d+)$/);
                if (match) {
                    const seq = parseInt(match[1]);
                    if (seq > maxSeq) maxSeq = seq;
                }
            });

            console.log(`[from-order] 今天已有 ${existingTasksToday.length} 个任务，最大序号: ${maxSeq}`);

            // 创建任务
            const tasks = [];
            for (let i = 0; i < taskCount; i++) {
                const taskCode = `TASK-${today}-${String(maxSeq + i + 1).padStart(3, '0')}`;

                console.log(`[from-order] 创建任务 ${i + 1}/${taskCount}: ${taskCode}`);

                const task = await tx.productionTask.create({
                    data: {
                        code: taskCode,
                        orderId: parseInt(orderId),
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
                where: { id: parseInt(orderId) },
                data: {
                    scheduledQuantity: order.scheduledQuantity + taskCount
                }
            });

            return tasks;
        });

        console.log(`[from-order] 成功创建 ${result.length} 个任务`);

        res.json({
            status: 'ok',
            message: `成功创建 ${taskCount} 个生产任务`,
            data: result
        });
    } catch (error) {
        console.error('[from-order] 创建生产任务失败:', error);
        console.error('[from-order] 错误详情:', {
            name: error.constructor.name,
            message: error.message,
            code: error.code,
            meta: error.meta
        });
        res.status(500).json({
            status: 'error',
            message: error.message || '创建生产任务失败',
            detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
