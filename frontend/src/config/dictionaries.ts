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
 * 0 = 可占用 (Available) - 资源空闲，可以被分配使用
 * 1 = 不可用 (Unavailable) - 资源维护/故障，暂时不能使用
 * 2 = 已占用 (Occupied) - 资源已被占用，正在使用中
 */
export const BASIC_DATA_STATUS: StatusOption[] = [
  { 
    value: 0, 
    label: '可占用', 
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
  },
  { 
    value: 2, 
    label: '已占用', 
    color: 'warning',
    badgeStatus: 'warning',
    themeColor: '#faad14',
    bgColor: '#fffbe6',
    textColor: '#d46b08'
  }
];

/**
 * 辅助函数：根据状态值获取状态配置
 * @param value 状态值 (0/1/2)
 * @returns 状态配置对象
 */
export const getStatusConfig = (value: number): StatusOption => {
  const config = BASIC_DATA_STATUS.find(item => item.value === value);
  
  if (!config) {
    // 容错处理：未知状态
    return { 
      value, 
      label: '未知状态', 
      color: 'default',
      badgeStatus: 'default'
    };
  }
  
  return config;
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
  AVAILABLE: 0,    // 可占用
  UNAVAILABLE: 1,  // 不可用
  OCCUPIED: 2      // 已占用
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

/**
 * 获取设备类型标签
 * @param value 类型 ID
 * @returns 类型名称
 */
export const getDeviceTypeLabel = (value: number): string => {
  return DEVICE_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型';
};

