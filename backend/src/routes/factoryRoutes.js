const express = require('express');
const router = express.Router();
const factoryController = require('../controllers/factoryController');

/**
 * @swagger
 * tags:
 *   name: Factories
 *   description: 工厂与产线管理 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Factory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 工厂ID
 *           example: 1
 *         code:
 *           type: string
 *           description: 工厂代码
 *           example: "HJGS-01"
 *         name:
 *           type: string
 *           description: 工厂名称
 *           example: "北京工厂"
 *         location:
 *           type: string
 *           description: 工厂位置
 *           example: "北京市朝阳区"
 *         description:
 *           type: string
 *           description: 工厂描述
 *           example: "主要生产组装业务"
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 工厂状态 (0=可用, 1=不可用)
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         productionLines:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductionLine'
 *     
 *     ProductionLine:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 产线ID
 *           example: 1
 *         code:
 *           type: string
 *           description: 产线代码
 *           example: "A-CX-01"
 *         name:
 *           type: string
 *           description: 产线名称
 *           example: "组装线A"
 *         type:
 *           type: string
 *           description: 产线类型
 *           example: "组装线"
 *         capacity:
 *           type: integer
 *           description: 标准日产能
 *           example: 100
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 产线状态 (0=可用, 1=不可用)
 *           example: 0
 *         factoryId:
 *           type: integer
 *           description: 所属工厂ID
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     FactoryInput:
 *       type: object
 *       required:
 *         - code
 *         - name
 *       properties:
 *         code:
 *           type: string
 *           description: 工厂代码
 *           example: "HJGS-01"
 *         name:
 *           type: string
 *           description: 工厂名称
 *           example: "上海工厂"
 *         location:
 *           type: string
 *           description: 工厂位置
 *           example: "上海市浦东新区"
 *         description:
 *           type: string
 *           description: 工厂描述
 *           example: "新建工厂，主要生产包装业务"
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 工厂状态 (0=可用, 1=不可用)
 *           example: 0
 *     
 *     ProductionLineInput:
 *       type: object
 *       required:
 *         - factoryId
 *         - name
 *         - code
 *       properties:
 *         factoryId:
 *           type: integer
 *           description: 所属工厂ID
 *           example: 1
 *         code:
 *           type: string
 *           description: 产线代码
 *           example: "A-CX-01"
 *         name:
 *           type: string
 *           description: 产线名称
 *           example: "包装线B"
 *         type:
 *           type: string
 *           description: 产线类型
 *           example: "包装线"
 *         capacity:
 *           type: integer
 *           description: 标准日产能
 *           example: 150
 *         status:
 *           type: integer
 *           enum: [0, 1]
 *           description: 产线状态 (0=可用, 1=不可用)
 *           example: 0
 */

/**
 * @swagger
 * /api/factories:
 *   get:
 *     summary: 获取工厂列表
 *     description: 获取所有工厂及其关联的产线信息
 *     tags: [Factories]
 *     responses:
 *       200:
 *         description: 成功获取工厂列表
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
 *                   example: "Factories fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', factoryController.getFactories);

/**
 * @swagger
 * /api/factories/{id}:
 *   get:
 *     summary: 获取单个工厂详情
 *     description: 根据ID获取工厂及其产线信息
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 工厂ID
 *     responses:
 *       200:
 *         description: 成功获取工厂详情
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
 *                   example: "Factory fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 工厂不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', factoryController.getFactoryById);

/**
 * @swagger
 * /api/factories:
 *   post:
 *     summary: 创建工厂
 *     description: 创建一个新的工厂
 *     tags: [Factories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FactoryInput'
 *     responses:
 *       201:
 *         description: 工厂创建成功
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
 *                   example: "Factory created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', factoryController.createFactory);

/**
 * @swagger
 * /api/factories/{id}:
 *   put:
 *     summary: 更新工厂信息
 *     description: 更新指定工厂的信息
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 工厂ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FactoryInput'
 *     responses:
 *       200:
 *         description: 工厂更新成功
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
 *                   example: "Factory updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 工厂不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', factoryController.updateFactory);

/**
 * @swagger
 * /api/factories/{id}:
 *   delete:
 *     summary: 删除工厂
 *     description: 删除指定工厂及其所有产线（级联删除）
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 工厂ID
 *     responses:
 *       200:
 *         description: 工厂删除成功
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
 *                   example: "Factory deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedFactory:
 *                       $ref: '#/components/schemas/Factory'
 *                     deletedProductionLinesCount:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 工厂不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', factoryController.deleteFactory);

/**
 * @swagger
 * /api/factories/line:
 *   post:
 *     summary: 创建产线
 *     description: 为指定工厂创建新的产线
 *     tags: [Factories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductionLineInput'
 *     responses:
 *       201:
 *         description: 产线创建成功
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
 *                   example: "Production line created successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ProductionLine'
 *                     - type: object
 *                       properties:
 *                         factory:
 *                           $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 工厂不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/line', factoryController.createProductionLine);

/**
 * @swagger
 * /api/factories/line/{id}:
 *   put:
 *     summary: 更新产线信息
 *     description: 更新指定产线的信息（名称、类型、产能、状态等）
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 产线ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "组装线A（升级版）"
 *               type:
 *                 type: string
 *                 example: "自动化组装线"
 *               capacity:
 *                 type: integer
 *                 example: 200
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, MAINTENANCE, CLOSED]
 *                 example: "MAINTENANCE"
 *     responses:
 *       200:
 *         description: 产线更新成功
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
 *                   example: "Production line updated successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ProductionLine'
 *                     - type: object
 *                       properties:
 *                         factory:
 *                           $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 产线不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/line/:id', factoryController.updateProductionLine);

/**
 * @swagger
 * /api/factories/line/{id}:
 *   delete:
 *     summary: 删除产线
 *     description: 删除指定的产线
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 产线ID
 *     responses:
 *       200:
 *         description: 产线删除成功
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
 *                   example: "Production line deleted successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ProductionLine'
 *                     - type: object
 *                       properties:
 *                         factory:
 *                           $ref: '#/components/schemas/Factory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 产线不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/line/:id', factoryController.deleteProductionLine);

module.exports = router;

