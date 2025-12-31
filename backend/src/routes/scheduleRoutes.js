const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs').promises;
const path = require('path');

// ========== 具体路由（必须放在通配路由之前） ==========

/**
 * @swagger
 * /api/schedules/output/result:
 *   get:
 *     summary: 获取调度算法输出结果
 *     tags: [Schedule]
 *     responses:
 *       200:
 *         description: 成功返回调度结果
 *       404:
 *         description: 未找到调度结果文件
 */
router.get('/output/result', async (req, res) => {
    try {
        // 读取项目根目录的output.json文件
        const outputPath = path.join(__dirname, '../../../output.json');

        // 检查文件是否存在
        try {
            await fs.access(outputPath);
        } catch (error) {
            return res.status(404).json({
                status: 'error',
                message: '未找到调度结果文件，请先运行调度算法生成调度结果'
            });
        }

        // 读取文件内容
        const fileContent = await fs.readFile(outputPath, 'utf-8');
        const data = JSON.parse(fileContent);

        // 获取文件修改时间
        const stats = await fs.stat(outputPath);

        res.json({
            status: 'ok',
            data: data,
            meta: {
                lastModified: stats.mtime,
                fileSize: stats.size
            }
        });
    } catch (error) {
        console.error('读取调度结果失败:', error);
        res.status(500).json({
            status: 'error',
            message: '读取调度结果失败: ' + error.message
        });
    }
});

/**
 * @swagger
 * /api/schedules/output/check:
 *   get:
 *     summary: 检查output.json文件是否存在
 *     tags: [Schedule]
 *     responses:
 *       200:
 *         description: 返回文件存在状态
 */
router.get('/output/check', async (req, res) => {
    try {
        const outputPath = path.join(__dirname, '../../../output.json');

        try {
            const stats = await fs.stat(outputPath);
            res.json({
                status: 'ok',
                exists: true,
                lastModified: stats.mtime,
                fileSize: stats.size
            });
        } catch (error) {
            res.json({
                status: 'ok',
                exists: false
            });
        }
    } catch (error) {
        console.error('检查文件失败:', error);
        res.status(500).json({
            status: 'error',
            message: '检查文件失败: ' + error.message
        });
    }
});

/**
 * @swagger
 * /api/schedules/run:
 *   post:
 *     summary: 触发调度算法运行
 *     tags: [Schedule]
 *     responses:
 *       200:
 *         description: 调度算法已触发
 */
router.post('/run', async (req, res) => {
    try {
        // TODO: 这里将来会调用实际的调度算法
        // 目前只是返回成功,表示已接收到调度请求

        res.json({
            status: 'ok',
            message: '调度请求已接收，算法正在运行中...'
        });
    } catch (error) {
        console.error('触发调度失败:', error);
        res.status(500).json({
            status: 'error',
            message: '触发调度失败: ' + error.message
        });
    }
});

// ========== 通配路由（带参数的路由） ==========

/**
 * @swagger
 * /api/schedules/{taskId}:
 *   get:
 *     summary: 获取任务的拆分步骤列表
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 生产任务ID
 *     responses:
 *       200:
 *         description: 成功返回步骤列表
 */
router.get('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const steps = await prisma.scheduleStep.findMany({
            where: {
                taskId: parseInt(taskId)
            },
            include: {
                product: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        type: true
                    }
                }
            },
            orderBy: {
                seq: 'asc'
            }
        });

        res.json({
            status: 'ok',
            data: steps
        });
    } catch (error) {
        console.error('获取拆分步骤失败:', error);
        res.status(500).json({
            status: 'error',
            message: '获取拆分步骤失败'
        });
    }
});

/**
 * @swagger
 * /api/schedules/{taskId}:
 *   post:
 *     summary: 批量保存任务的拆分步骤
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 生产任务ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: integer
 *                     productId:
 *                       type: integer
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: 成功保存步骤
 */
router.post('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { steps } = req.body;

        // 使用事务保存步骤并更新任务状态
        const result = await prisma.$transaction(async (tx) => {
            // 删除旧的步骤
            await tx.scheduleStep.deleteMany({
                where: { taskId: parseInt(taskId) }
            });

            // 创建新的步骤
            const createdSteps = [];
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const created = await tx.scheduleStep.create({
                    data: {
                        taskId: parseInt(taskId),
                        seq: i + 1,
                        type: step.type,
                        productId: step.productId || null,
                        name: step.name,
                        status: 0
                    }
                });
                createdSteps.push(created);
            }

            // 更新任务状态为"已拆分"
            await tx.productionTask.update({
                where: { id: parseInt(taskId) },
                data: { status: 1 }
            });

            return createdSteps;
        });

        res.json({
            status: 'ok',
            message: '保存成功',
            data: result
        });
    } catch (error) {
        console.error('保存拆分步骤失败:', error);
        res.status(500).json({
            status: 'error',
            message: '保存拆分步骤失败'
        });
    }
});

/**
 * @swagger
 * /api/schedules/{taskId}:
 *   delete:
 *     summary: 删除任务的所有拆分步骤
 *     tags: [Schedule]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 生产任务ID
 *     responses:
 *       200:
 *         description: 成功删除步骤
 */
router.delete('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        // 使用事务删除步骤并更新任务状态
        await prisma.$transaction(async (tx) => {
            // 删除所有步骤
            await tx.scheduleStep.deleteMany({
                where: { taskId: parseInt(taskId) }
            });

            // 更新任务状态为"待拆分"
            await tx.productionTask.update({
                where: { id: parseInt(taskId) },
                data: { status: 0 }
            });
        });

        res.json({
            status: 'ok',
            message: '删除成功'
        });
    } catch (error) {
        console.error('删除拆分步骤失败:', error);
        res.status(500).json({
            status: 'error',
            message: '删除拆分步骤失败'
        });
    }
});

module.exports = router;
