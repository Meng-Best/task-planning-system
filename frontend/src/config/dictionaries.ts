/**
 * 通用数据字典
 * 
 * 本文件为所有基础数据的"唯一真理源"
 * 严禁在组件内硬编码状态文本或配置
 */

// ==================== 状态相关 ====================

/**
 * 通用状态选项接口
 */
export interface StatusOption {
  value: number;        // 状态值
  label: string;        // 显示文本
  color: string;        // Ant Design Badge/Tag 基础颜色
  badgeStatus?: any;    // Ant Design Badge status 类型
  themeColor?: string;  // 主题色 (Hex)
  bgColor?: string;     // 背景色 (Hex)
  textColor?: string;   // 文字色 (Hex)
}

/**
 * 全局基础数据状态 (唯一真理源)
 * 适用于：工厂、产线等所有基础资源
 *
 * 0 = 可用 (Available) - 资源可以被使用
 * 1 = 不可用 (Unavailable) - 资源维护/故障，暂时不能使用
 */
export const BASIC_DATA_STATUS: StatusOption[] = [
  {
    value: 0,
    label: '可用',
    color: 'success',
    badgeStatus: 'processing',
    themeColor: '#52c41a',
    bgColor: '#f6ffed',
    textColor: '#389e0d'
  },
  {
    value: 1,
    label: '不可用',
    color: 'error',
    badgeStatus: 'default',
    themeColor: '#ff4d4f',
    bgColor: '#fff1f0',
    textColor: '#cf1322'
  }
];

/**
 * 辅助函数：根据状态值获取状态配置
 * @param value 状态值 (0/1)
 * @returns 状态配置对象
 */
export const getStatusConfig = (value: number): StatusOption => {
  const numeric = Number.isFinite(value) ? value : Number(value);
  const normalized = numeric === 1 ? 1 : 0; // 仅支持 0/1，其余一律按可用处理
  return BASIC_DATA_STATUS.find(item => item.value === normalized)!;
};

/**
 * 辅助函数：获取状态标签文本
 * @param value 状态值
 * @returns 状态文本
 */
export const getStatusLabel = (value: number): string => {
  return getStatusConfig(value).label;
};

/**
 * 辅助函数：获取状态颜色
 * @param value 状态值
 * @returns 状态颜色
 */
export const getStatusColor = (value: number): string => {
  return getStatusConfig(value).color;
};

// ==================== 状态常量（便于代码引用）====================

/**
 * 状态值常量
 * 便于在代码中进行比较和判断
 */
export const STATUS_VALUE = {
  AVAILABLE: 0,    // 可用
  UNAVAILABLE: 1   // 不可用
} as const;

export type StatusValue = typeof STATUS_VALUE[keyof typeof STATUS_VALUE];

// ==================== 其他字典（预留扩展）====================

/**
 * 设备类型字典 (0=数控机床, 1=机器人, 2=AGV, 等)
 */
export const DEVICE_TYPE_OPTIONS = [
  { value: 0, label: '数控机床' },
  { value: 1, label: '机器人/机械臂' },
  { value: 2, label: '自动导引车 (AGV)' },
  { value: 3, label: '检测/测试设备' },
  { value: 4, label: '自动包装机' },
  { value: 5, label: '工业打印/喷码' },
];

// 兼容性导出，供 DeviceManagement 等页面使用
export const DEVICE_TYPES = DEVICE_TYPE_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }));
export const DEVICE_STATUS = STATUS_VALUE;

/**
 * 人员专业字典
 */
export const MAJOR_OPTIONS = [
  { value: 0, label: '总体' },
  { value: 1, label: '动力' },
  { value: 2, label: '结构' },
  { value: 3, label: '电气' },
  { value: 4, label: '质量' },
  { value: 5, label: '总装' },
  { value: 6, label: '工艺' },
];

/**
 * 工厂统一排班定义
 * 全厂统一：所有工作日均为两班倒（08:00 - 24:00）
 */
export const FACTORY_WORK_HOURS = {
  shift1: '08:00 - 16:00',
  shift2: '16:00 - 24:00',
  totalLabel: '两班倒 (08:00 - 24:00)',
  capacityPerDay: 16 // 每日16小时产能
};

/**
 * 班次定义
 */
export const SHIFT_TYPES = [
  { value: 0, label: '一班 (08:00 - 16:00)', color: 'blue' },
  { value: 1, label: '二班 (16:00 - 24:00)', color: 'purple' }
];

/**
 * 职级显示逻辑映射
 */
const STAFF_LEVEL_MAP: Record<string, string[]> = {
  default: ['设计师', '主管设计师', '高管设计师', '副主任设计师', '主任设计师'],
  craft: ['初级工艺师', '中级工艺师', '高级工艺师', '工艺副主任', '工艺主任师'],
};

/**
 * 获取职级显示标签
 * @param major 专业 ID
 * @param level 职级 ID
 * @returns 职级名称
 */
export const getStaffLevelLabel = (major: number, level: number): string => {
  const levels = major === 6 ? STAFF_LEVEL_MAP.craft : STAFF_LEVEL_MAP.default;
  return levels[level] || '未知职级';
};

/**
 * 获取职级选项列表（用于 Select）
 * @param major 专业 ID
 * @returns 职级选项数组
 */
export const getStaffLevelOptions = (major: number) => {
  const levels = major === 6 ? STAFF_LEVEL_MAP.craft : STAFF_LEVEL_MAP.default;
  return levels.map((label, index) => ({ value: index, label }));
};

/**
 * 获取设备类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getDeviceTypeLabel = (value: number): string => {
  return DEVICE_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

/**
 * 工位类型字典 (0=部装, 1=总装, 2=测试)
 */
export const STATION_TYPE_OPTIONS = [
  { value: 0, label: '部装', color: 'cyan' },
  { value: 1, label: '总装', color: 'blue' },
  { value: 2, label: '测试', color: 'purple' },
];

/**
 * 获取工位类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getStationTypeLabel = (value: number): string => {
  return STATION_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

/**
 * 工艺路线类型字典 (0=部装, 1=总装)
 */
export const ROUTING_TYPE_OPTIONS = [
  { value: 0, label: '部装', color: 'cyan' },
  { value: 1, label: '总装', color: 'blue' },
];

/**
 * 获取工艺路线类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getRoutingTypeLabel = (value: number): string => {
  return ROUTING_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

/**
 * 工序类型字典 (0=装配, 1=检验, 2=测试)
 */
export const PROCESS_TYPE_OPTIONS = [
  { value: 0, label: '装配', color: 'blue' },
  { value: 1, label: '检验', color: 'orange' },
  { value: 2, label: '测试', color: 'purple' },
];

/**
 * 获取工序类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getProcessTypeLabel = (value: number): string => {
  return PROCESS_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

/**
 * 订单类型字典 (0=试制, 1=销售预测, 2=销售下单)
 */
export const ORDER_TYPE_OPTIONS = [
  { value: 0, label: '试制', color: 'orange' },
  { value: 1, label: '销售预测', color: 'blue' },
  { value: 2, label: '销售下单', color: 'green' },
];

/**
 * 获取订单类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getOrderTypeLabel = (value: number): string => {
  return ORDER_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

/**
 * 订单状态字典
 */
export const ORDER_STATUS_OPTIONS = [
  { value: 0, label: '待排程', color: 'default' },
  { value: 1, label: '排程中', color: 'processing' },
  { value: 2, label: '生产中', color: 'warning' },
  { value: 3, label: '已完成', color: 'success' },
  { value: 4, label: '已推迟', color: 'error' },
];

/**
 * 获取订单状态标签
 */
export const getOrderStatusLabel = (value: number): string => {
  return ORDER_STATUS_OPTIONS.find(opt => opt.value === value)?.label || '未知状态';
};

/**
 * 生产任务状态字典
 */
export const PRODUCTION_TASK_STATUS_OPTIONS = [
  { value: 0, label: '待拆分', color: 'default' },
  { value: 1, label: '已拆分', color: 'processing' },
];

/**
 * 获取生产任务状态标签
 */
export const getProductionTaskStatusLabel = (value: number): string => {
  return PRODUCTION_TASK_STATUS_OPTIONS.find(opt => opt.value === value)?.label || '未知状态';
};

