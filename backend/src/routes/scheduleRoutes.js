const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

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
        // 读取项目根目录的 output.json 文件（Scheduler.exe 输出到根目录）
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
        // 检测项目根目录的 output.json 文件（Scheduler.exe 输出到根目录）
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
 * /api/schedules/terminate:
 *   post:
 *     summary: 终止Scheduler.exe进程
 *     tags: [Schedule]
 *     responses:
 *       200:
 *         description: 进程已终止
 */
router.post('/terminate', async (req, res) => {
    try {
        const { exec } = require('child_process');

        // 使用 taskkill 杀掉 Scheduler.exe 和相关的 cmd 窗口
        exec('taskkill /F /IM Scheduler.exe /T 2>nul', (error) => {
            if (error) {
                console.log('[Terminate] Scheduler.exe 进程不存在或已终止');
            } else {
                console.log('[Terminate] 已终止 Scheduler.exe 进程');
            }
        });

        res.json({
            status: 'ok',
            message: '已发送终止信号'
        });
    } catch (error) {
        console.error('终止进程失败:', error);
        res.status(500).json({
            status: 'error',
            message: '终止进程失败: ' + error.message
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
        // 获取 dispatch 文件夹路径
        const dispatchDir = path.join(__dirname, '../../../dispatch');
        const schedulerPath = path.join(dispatchDir, 'Scheduler.exe');

        // 检查 Scheduler.exe 是否存在
        try {
            await fs.access(schedulerPath);
        } catch (error) {
            return res.status(404).json({
                status: 'error',
                message: '未找到调度程序 Scheduler.exe'
            });
        }

        // 不删除旧的 output.json，保证前端始终有结果可显示
        // 只删除 dispatch 文件夹下的临时结果文件
        const rootDir = path.join(__dirname, '../../..');
        const outputPath = path.join(rootDir, 'output.json');
        const resultPath = path.join(dispatchDir, 'input_test_result.json');

        // 记录开始时间，用于前端判断结果是否是新生成的
        const startTime = new Date();

        try {
            await fs.unlink(resultPath);
            console.log('已删除旧的 input_test_result.json');
        } catch (error) {
            // 文件不存在，忽略
        }

        // 执行 Scheduler.exe，使用 cmd /k 保持窗口打开以便观察
        // 进程会在前端进度完成跳转时被杀掉
        const scheduler = spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', schedulerPath], {
            cwd: dispatchDir,      // 工作目录设为 dispatch 文件夹
            detached: true,        // 独立进程
            stdio: 'ignore',       // 忽略输入输出
            windowsHide: false,    // 显示命令行窗口
            shell: false
        });

        scheduler.on('error', (error) => {
            console.error('[Scheduler error]:', error.message);
        });

        // 由于 stdio 是 ignore，无法监听 close 事件来处理文件
        // 改用轮询检测 input_test_result.json 文件
        const checkResultFile = async () => {
            try {
                await fs.access(resultPath);

                // 结果文件存在，等待一小段时间确保写入完成
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 读取结果文件内容
                const resultContent = await fs.readFile(resultPath, 'utf-8');

                // 写入到根目录的 output.json
                await fs.writeFile(outputPath, resultContent, 'utf-8');
                console.log('[Scheduler] 已将结果文件复制到:', outputPath);

                // 删除 dispatch 文件夹下的 input_test_result.json
                await fs.unlink(resultPath);
                console.log('[Scheduler] 已删除临时结果文件:', resultPath);

                console.log('[Scheduler] 排程调度完成！');
            } catch (err) {
                // 文件不存在，继续轮询
                setTimeout(checkResultFile, 2000);
            }
        };

        // 3秒后开始检测结果文件
        setTimeout(checkResultFile, 3000);

        // 解除父子进程关联
        scheduler.unref();

        console.log(`调度程序已启动，PID: ${scheduler.pid}`);

        res.json({
            status: 'ok',
            message: '调度程序已在后台启动',
            pid: scheduler.pid,
            startTime: startTime.toISOString()  // 返回开始时间，供前端判断
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

