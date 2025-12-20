const dayjs = require('dayjs');

/**
 * 内存通知存储
 * 仅保存在服务器内存中，重启即清空
 */
const notifications = [];
const MAX_NOTIFICATIONS = 50;

/**
 * 添加一条通知
 * @param {string} action - 操作 (create, update, delete 等)
 * @param {string} model - 模型名称 (Staff, Device 等)
 * @param {string} details - 详情描述
 */
const addNotification = (action, model, details) => {
  const timestamp = dayjs().format('HH:mm:ss');
  
  // 映射动作名称为中文
  const actionMap = {
    'create': '新增',
    'createMany': '批量新增',
    'update': '更新',
    'updateMany': '批量更新',
    'delete': '删除',
    'deleteMany': '批量删除',
    'upsert': '保存'
  };

  // 映射模型名称为中文
  const modelMap = {
    'Staff': '人员',
    'Device': '设备',
    'Team': '班组',
    'Factory': '工厂',
    'ProductionLine': '产线',
    'CalendarEvent': '工作日历',
    'Task': '任务'
  };

  const actionText = actionMap[action] || action;
  const modelText = modelMap[model] || model;
  
  // 改为存储结构化对象
  const notification = {
    id: Date.now() + Math.random(),
    time: timestamp,
    action: actionText,
    model: modelText,
    details: details
  };

  // FIFO 逻辑
  notifications.push(notification);
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.shift();
  }
};

/**
 * 获取所有通知
 * @returns {string[]} 倒序排列的通知数组
 */
const getNotifications = () => {
  return [...notifications].reverse();
};

module.exports = {
  addNotification,
  getNotifications
};

