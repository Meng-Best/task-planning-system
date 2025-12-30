/**
 * 通用数据字典
 * 全局唯一数据来源，禁止在组件内硬编码
 */

// ==================== 状态相关 ====================

export interface StatusOption {
  value: number
  label: string
  color: string
  badgeStatus?: any
  themeColor?: string
  bgColor?: string
  textColor?: string
}

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
]

export const getStatusConfig = (value: number): StatusOption => {
  const numeric = Number.isFinite(value) ? value : Number(value)
  const normalized = numeric === 1 ? 1 : 0
  return BASIC_DATA_STATUS.find(item => item.value === normalized)!
}

export const getStatusLabel = (value: number): string => getStatusConfig(value).label
export const getStatusColor = (value: number): string => getStatusConfig(value).color

export const STATUS_VALUE = {
  AVAILABLE: 0,
  UNAVAILABLE: 1
} as const

export type StatusValue = typeof STATUS_VALUE[keyof typeof STATUS_VALUE]

// ==================== 其他字典 ====================

export const DEVICE_TYPE_OPTIONS = [
  { value: 0, label: '数控机床' },
  { value: 1, label: '机器人/机械臂' },
  { value: 2, label: '自动导引车(AGV)' },
  { value: 3, label: '检测/测试设备' },
  { value: 4, label: '自动包装机' },
  { value: 5, label: '工业打印/喷码' }
]

export const DEVICE_TYPES = DEVICE_TYPE_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }))
export const DEVICE_STATUS = STATUS_VALUE

export const MAJOR_OPTIONS = [
  { value: 0, label: '总体' },
  { value: 1, label: '动力' },
  { value: 2, label: '结构' },
  { value: 3, label: '电气' },
  { value: 4, label: '质量' },
  { value: 5, label: '总装' },
  { value: 6, label: '工艺' }
]

export const FACTORY_WORK_HOURS = {
  shift1: '08:00 - 16:00',
  shift2: '16:00 - 24:00',
  totalLabel: '两班倒(08:00 - 24:00)',
  capacityPerDay: 16
}

export const SHIFT_TYPES = [
  { value: 0, label: '一班(08:00 - 16:00)', color: 'blue' },
  { value: 1, label: '二班(16:00 - 24:00)', color: 'purple' }
]

const STAFF_LEVEL_MAP: Record<string, string[]> = {
  default: ['设计师', '主管设计师', '高级设计师', '副主任设计师', '主任设计师'],
  craft: ['初级工艺师', '中级工艺师', '高级工艺师', '工艺副主任', '工艺主任']
}

export const getStaffLevelLabel = (major: number, level: number): string => {
  const levels = major === 6 ? STAFF_LEVEL_MAP.craft : STAFF_LEVEL_MAP.default
  return levels[level] || '未知职级'
}

export const getStaffLevelOptions = (major: number) => {
  const levels = major === 6 ? STAFF_LEVEL_MAP.craft : STAFF_LEVEL_MAP.default
  return levels.map((label, index) => ({ value: index, label }))
}

export const getDeviceTypeLabel = (value: number): string => {
  return DEVICE_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型'
}

export const STATION_TYPE_OPTIONS = [
  { value: 0, label: '部装', color: 'cyan' },
  { value: 1, label: '总装', color: 'blue' },
  { value: 2, label: '测试', color: 'purple' }
]

export const getStationTypeLabel = (value: number): string => {
  return STATION_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型'
}

export const ROUTING_TYPE_OPTIONS = [
  { value: 0, label: '部装', color: 'cyan' },
  { value: 1, label: '总装', color: 'blue' }
]

export const getRoutingTypeLabel = (value: number): string => {
  return ROUTING_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型'
}

export const PROCESS_TYPE_OPTIONS = [
  { value: 0, label: '装配', color: 'blue' },
  { value: 1, label: '检验', color: 'orange' },
  { value: 2, label: '测试', color: 'purple' }
]

export const getProcessTypeLabel = (value: number): string => {
  return PROCESS_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型'
}

// 订单类型 (0=试制订单, 1=销售预测, 2=销售下单)
export const ORDER_TYPE_OPTIONS = [
  { value: 0, label: '试制订单', color: 'orange' },
  { value: 1, label: '销售预测', color: 'blue' },
  { value: 2, label: '销售下单', color: 'green' }
]

export const getOrderTypeLabel = (value: number): string => {
  return ORDER_TYPE_OPTIONS.find(opt => opt.value === value)?.label || '未知类型'
}

// 订单状态
export const ORDER_STATUS_OPTIONS = [
  { value: 0, label: '待排程', color: 'default' },
  { value: 1, label: '排程中', color: 'processing' },
  { value: 2, label: '生产中', color: 'warning' },
  { value: 3, label: '已完成', color: 'success' },
  { value: 4, label: '已推迟', color: 'error' }
]

export const getOrderStatusLabel = (value: number): string => {
  return ORDER_STATUS_OPTIONS.find(opt => opt.value === value)?.label || '未知状态'
}

// 生产任务状态
export const PRODUCTION_TASK_STATUS_OPTIONS = [
  { value: 0, label: '待拆分', color: 'default' },
  { value: 1, label: '已拆分', color: 'processing' }
]

export const getProductionTaskStatusLabel = (value: number): string => {
  return PRODUCTION_TASK_STATUS_OPTIONS.find(opt => opt.value === value)?.label || '未知状态'
}

