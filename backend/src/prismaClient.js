const { PrismaClient } = require('@prisma/client');
const { addNotification } = require('./utils/notificationStore');

const prisma = new PrismaClient();

/**
 * Prisma 中间件：拦截数据变更并记录通知
 */
prisma.$use(async (params, next) => {
  const result = await next(params);

  // 关注的写操作动作
  const writeActions = [
    'create', 'createMany', 
    'update', 'updateMany', 
    'delete', 'deleteMany',
    'upsert'
  ];

  if (writeActions.includes(params.action)) {
    try {
      let details = '';
      
      // 尝试根据模型和动作提取更有用的详情
      if (params.action === 'create' || params.action === 'update' || params.action === 'upsert' || params.action === 'delete') {
        // 优先从结果中获取名称或标题（result 是操作后的对象）
        details = result?.name || result?.title || result?.code || `ID: ${result?.id || 'Unknown'}`;
      } else {
        details = '批量操作完成';
      }

      addNotification(params.action, params.model, details);
    } catch (err) {
      // 即使通知记录失败，也不要影响主业务流程
      console.error('Notification Middleware Error:', err);
    }
  }

  return result;
});

module.exports = prisma;

