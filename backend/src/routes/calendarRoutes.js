const express = require('express');
const calendarController = require('../controllers/calendarController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Calendar
 *   description: 工作日历管理 - 节假日、调休配置
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 事件ID
 *           example: 1
 *         date:
 *           type: string
 *           format: date-time
 *           description: 日期（时间部分为00:00:00）
 *           example: "2025-10-01T00:00:00.000Z"
 *         type:
 *           type: string
 *           enum: [WORK, HOLIDAY, REST]
 *           description: 日期类型
 *           example: HOLIDAY
 *         note:
 *           type: string
 *           description: 备注说明
 *           example: "国庆节"
 *         productionLineId:
 *           type: integer
 *           nullable: true
 *           description: 关联的产线ID（NULL表示全局配置）
 *           example: null
 *         productionLine:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             factoryId:
 *               type: integer
 *     SetCalendarRequest:
 *       type: object
 *       required:
 *         - startDate
 *         - endDate
 *         - type
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: 起始日期（YYYY-MM-DD）
 *           example: "2025-10-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: 结束日期（YYYY-MM-DD）
 *           example: "2025-10-07"
 *         type:
 *           type: string
 *           enum: [WORK, HOLIDAY, REST, DEFAULT]
 *           description: 日期类型。WORK=调休上班，HOLIDAY=法定节假日，REST=其他休息，DEFAULT=恢复默认
 *           example: HOLIDAY
 *         note:
 *           type: string
 *           description: 备注说明（可选）
 *           example: "国庆节假期"
 *         productionLineId:
 *           type: integer
 *           nullable: true
 *           description: 产线ID（可选）。若提供，则为产线专用日历；若不提供，则为全局日历
 *           example: null
 */

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: 获取日历配置
 *     description: |
 *       获取指定日期范围内的日历事件配置（节假日、调休等）。
 *       
 *       **逻辑说明**：
 *       - 如果不提供 productionLineId：仅返回全局日历配置
 *       - 如果提供 productionLineId：返回全局配置 + 该产线的专用配置
 *       - 前端应优先使用产线专用配置覆盖全局配置
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 起始日期（YYYY-MM-DD）
 *         example: "2025-10-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期（YYYY-MM-DD）
 *         example: "2025-10-31"
 *       - in: query
 *         name: productionLineId
 *         required: false
 *         schema:
 *           type: integer
 *         description: 产线ID（可选）。若提供，同时返回全局和该产线的专用配置
 *         example: 1
 *     responses:
 *       200:
 *         description: 成功获取日历配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Calendar events retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CalendarEvent'
 *                     count:
 *                       type: integer
 *                       example: 7
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器错误
 */
router.get('/', calendarController.getCalendarEvents);

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     summary: 批量设置日历配置
 *     description: |
 *       批量设置指定日期范围的日历类型。
 *       
 *       **类型说明**：
 *       - `WORK`: 调休上班日（覆盖周末）
 *       - `HOLIDAY`: 法定节假日（覆盖工作日）
 *       - `REST`: 其他休息日
 *       - `DEFAULT`: 删除配置，恢复系统默认（周一至周五工作，周六日休息）
 *       
 *       **示例**：
 *       - 设置国庆假期（10.1-10.7）为 HOLIDAY
 *       - 设置10月8日（周六）调休上班为 WORK
 *     tags: [Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetCalendarRequest'
 *           examples:
 *             holiday:
 *               summary: 设置国庆假期
 *               value:
 *                 startDate: "2025-10-01"
 *                 endDate: "2025-10-07"
 *                 type: "HOLIDAY"
 *                 note: "国庆节假期"
 *             workday:
 *               summary: 设置调休上班
 *               value:
 *                 startDate: "2025-10-08"
 *                 endDate: "2025-10-08"
 *                 type: "WORK"
 *                 note: "国庆调休"
 *             default:
 *               summary: 恢复默认配置
 *               value:
 *                 startDate: "2025-10-01"
 *                 endDate: "2025-10-07"
 *                 type: "DEFAULT"
 *     responses:
 *       201:
 *         description: 配置设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Calendar events set successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     affectedDates:
 *                       type: integer
 *                       description: 影响的日期数量
 *                       example: 7
 *                     createdCount:
 *                       type: integer
 *                       description: 创建的记录数
 *                       example: 7
 *                     type:
 *                       type: string
 *                       example: HOLIDAY
 *                     note:
 *                       type: string
 *                       example: "国庆节假期"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', calendarController.setCalendarEvents);

/**
 * @swagger
 * /api/calendar/{date}:
 *   delete:
 *     summary: 删除指定日期配置
 *     description: 删除指定日期的日历事件配置，该日期将恢复为系统默认规则
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 日期（YYYY-MM-DD）
 *         example: "2025-10-01"
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Calendar event deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     deletedCount:
 *                       type: integer
 *                       example: 1
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 日期配置不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:date', calendarController.deleteCalendarEvent);

/**
 * @swagger
 * /api/calendar/check:
 *   get:
 *     summary: 检查工作日状态
 *     description: |
 *       判断指定日期是否为工作日。
 *       
 *       **判断逻辑**：
 *       1. 如果有日历配置，按配置判断（type=WORK 为工作日）
 *       2. 如果无配置，按系统默认判断（周一至周五为工作日）
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 日期（YYYY-MM-DD）
 *         example: "2025-10-01"
 *     responses:
 *       200:
 *         description: 成功获取工作日状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Work day status checked
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     dayOfWeek:
 *                       type: integer
 *                       description: 星期几（0=周日, 1=周一, ..., 6=周六）
 *                       example: 3
 *                     isWorkDay:
 *                       type: boolean
 *                       description: 是否为工作日
 *                       example: false
 *                     eventType:
 *                       type: string
 *                       description: 日历事件类型
 *                       example: HOLIDAY
 *                     reason:
 *                       type: string
 *                       description: 判断理由
 *                       example: "国庆节假期"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.get('/check', calendarController.checkWorkDay);

module.exports = router;

