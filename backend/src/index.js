const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// Swagger API 文档 - 完全离线配置
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Task System API Docs',
  // 关键配置：禁用外部 CDN，使用本地资源
  swaggerOptions: {
    persistAuthorization: true
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// 导入路由
const taskRoutes = require('./routes/taskRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const factoryRoutes = require('./routes/factoryRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const teamRoutes = require('./routes/teamRoutes');
const productionLineRoutes = require('./routes/productionLineRoutes');
const stationRoutes = require('./routes/stationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const routingRoutes = require('./routes/routingRoutes');
const processRoutes = require('./routes/processRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productionTaskRoutes = require('./routes/productionTaskRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const schedulingTestRoutes = require('./routes/schedulingTestRoutes');

// 挂载路由
app.use('/api/tasks', taskRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/production-lines', productionLineRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/routings', routingRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/production-tasks', productionTaskRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/scheduling', schedulingTestRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     description: 检查服务器状态和数据库连接
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 服务运行正常
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
 *                   example: Server is running
 *                 database:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 数据库连接失败
 */
app.get('/api/health', async (req, res) => {
  try {
    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server is running but database connection failed',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API 根路径
 *     description: 获取 API 基本信息和可用端点
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API 信息
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Task Planning System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      tasks: '/api/tasks',
      calendar: '/api/calendar',
      factories: '/api/factories',
      devices: '/api/devices',
      docs: '/api-docs'
    }
  });
});

// ========== 生产环境：托管前端静态文件 ==========
const path = require('path');
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
// 所有非 API 路由都返回前端入口文件（支持前端路由）
app.get('*', (req, res, next) => {
  // 如果是 API 请求，跳过
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📝 Tasks API: http://localhost:${PORT}/api/tasks`);
  console.log(`📅 Calendar API: http://localhost:${PORT}/api/calendar`);
  console.log(`🏭 Factories API: http://localhost:${PORT}/api/factories`);
  console.log(`🔧 Devices API: http://localhost:${PORT}/api/devices`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

