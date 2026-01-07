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
 * /api/schedules/update-status:
 *   post:
 *     summary: 仅更新任务状态为已排程（不启动调度算法）
 *     tags: [Schedule]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 需要更新状态的任务ID列表
 *     responses:
 *       200:
 *         description: 状态更新成功
 */
router.post('/update-status', async (req, res) => {
    try {
        const { taskIds } = req.body;

        if (!taskIds || taskIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '请提供需要更新的任务ID列表'
            });
        }

        // 批量更新任务状态为"已排程"
        const result = await prisma.productionTask.updateMany({
            where: {
                id: { in: taskIds.map(id => parseInt(id)) },
                status: { in: [1, 2] } // 只更新已拆分或已排程的任务
            },
            data: { status: 2 }
        });

        console.log(`[UpdateStatus] 已更新 ${result.count} 个任务状态为"已排程"`);

        res.json({
            status: 'ok',
            message: `成功更新 ${result.count} 个任务状态`,
            data: { updatedCount: result.count }
        });
    } catch (error) {
        console.error('更新任务状态失败:', error);
        res.status(500).json({
            status: 'error',
            message: '更新任务状态失败: ' + error.message
        });
    }
});

/**
 * @swagger
 * /api/schedules/run:
 *   post:
 *     summary: 触发调度算法运行并更新任务状态
 *     tags: [Schedule]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 需要排程的任务ID列表（可选，不传则从input_test.json读取）
 *     responses:
 *       200:
 *         description: 调度算法已触发
 */
router.post('/run', async (req, res) => {
    try {
        let { taskIds } = req.body;

        // 如果没有传入 taskIds，从 input_test.json 中读取任务编码
        if (!taskIds || taskIds.length === 0) {
            try {
                const inputPath = path.join(__dirname, '../../../dispatch/input_test.json');
                const inputContent = await fs.readFile(inputPath, 'utf-8');
                const inputData = JSON.parse(inputContent);

                // 从 orders 中提取任务编码
                if (inputData.orders && inputData.orders.length > 0) {
                    const taskCodes = inputData.orders.map(order => order.id);

                    // 根据任务编码查询任务ID
                    const tasks = await prisma.productionTask.findMany({
                        where: { code: { in: taskCodes } },
                        select: { id: true }
                    });
                    taskIds = tasks.map(t => t.id);
                    console.log(`[Scheduler] 从 input_test.json 读取到 ${taskIds.length} 个任务`);
                }
            } catch (readError) {
                console.warn('[Scheduler] 无法读取 input_test.json:', readError.message);
            }
        }

        // 批量更新任务状态为"已排程"
        let updatedCount = 0;
        if (taskIds && taskIds.length > 0) {
            const result = await prisma.productionTask.updateMany({
                where: {
                    id: { in: taskIds.map(id => parseInt(id)) },
                    status: { in: [1, 2] } // 只更新已拆分或已排程的任务
                },
                data: { status: 2 }
            });
            updatedCount = result.count;
            console.log(`[Scheduler] 已更新 ${updatedCount} 个任务状态为"已排程"`);
        }

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
            startTime: startTime.toISOString(),  // 返回开始时间，供前端判断
            data: { updatedCount }
        });
    } catch (error) {
        console.error('触发调度失败:', error);
        res.status(500).json({
            status: 'error',
            message: '触发调度失败: ' + error.message
        });
    }
});

/**
 * @swagger
 * /api/schedules/confirm:
 *   post:
 *     summary: 确认排程结果，将任务状态更新为待生产
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               taskCodes:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post('/confirm', async (req, res) => {
    try {
        const { taskIds, taskCodes } = req.body;

        if ((!taskIds || taskIds.length === 0) && (!taskCodes || taskCodes.length === 0)) {
            return res.status(400).json({
                status: 'error',
                message: '请提供需要确认的任务ID或任务编码列表'
            });
        }

        // 构建查询条件：状态为已拆分(1)或已排程(2)的都可以确认
        const whereCondition = { status: { in: [1, 2] } };

        if (taskCodes && taskCodes.length > 0) {
            // 使用任务编码查询
            whereCondition.code = { in: taskCodes };
        } else if (taskIds && taskIds.length > 0) {
            // 使用任务ID查询
            whereCondition.id = { in: taskIds.map(id => parseInt(id)) };
        }

        // 更新任务状态为 status=3 (待生产)
        const result = await prisma.productionTask.updateMany({
            where: whereCondition,
            data: { status: 3 }
        });

        res.json({
            status: 'ok',
            message: `成功确认 ${result.count} 个任务，已加入生产任务池`,
            data: { confirmedCount: result.count }
        });
    } catch (error) {
        console.error('确认排程失败:', error);
        res.status(500).json({
            status: 'error',
            message: '确认排程失败: ' + error.message
        });
    }
});

/**
 * @swagger
 * /api/schedules/withdraw:
 *   post:
 *     summary: 撤回任务，将待生产任务回退为已拆分状态
 *     tags: [Schedule]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: integer
 */
router.post('/withdraw', async (req, res) => {
    try {
        const { taskIds } = req.body;

        if (!taskIds || taskIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '请提供需要撤回的任务ID列表'
            });
        }

        const parsedTaskIds = taskIds.map(id => parseInt(id));

        // 获取被撤回任务关联的所有 ScheduleStep 的 id
        const steps = await prisma.scheduleStep.findMany({
            where: {
                taskId: { in: parsedTaskIds }
            },
            select: { id: true }
        });
        const stepIds = steps.map(s => String(s.id));

        // 只更新 status=3 (待生产) 的任务，回退到 status=1 (已拆分)
        const result = await prisma.productionTask.updateMany({
            where: {
                id: { in: parsedTaskIds },
                status: 3
            },
            data: { status: 1 }
        });

        // 更新 output.json，移除被撤回任务的排程数据
        if (result.count > 0 && stepIds.length > 0) {
            try {
                const outputPath = path.join(__dirname, '../../../output.json');
                const outputData = JSON.parse(await fs.readFile(outputPath, 'utf-8'));

                // 从 task_plan 中移除被撤回的步骤
                if (outputData.task_plan) {
                    outputData.task_plan = outputData.task_plan.filter(
                        task => !stepIds.includes(task['task id'])
                    );
                }

                await fs.writeFile(outputPath, JSON.stringify(outputData, null, 4), 'utf-8');
            } catch (fileError) {
                console.warn('更新 output.json 失败:', fileError.message);
            }
        }

        res.json({
            status: 'ok',
            message: `成功撤回 ${result.count} 个任务`,
            data: { withdrawnCount: result.count }
        });
    } catch (error) {
        console.error('撤回任务失败:', error);
        res.status(500).json({
            status: 'error',
            message: '撤回任务失败: ' + error.message
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

