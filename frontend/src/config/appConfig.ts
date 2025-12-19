/**
 * 应用配置常量
 */

// 工厂编码前缀
export const FACTORY_CODE_PREFIX = 'HJGS-'

// 产线编码中缀
export const LINE_CODE_INFIX = 'CX-'

// 编码配置
export const CODE_CONFIG = {
  // 工厂代码前缀
  factoryPrefix: FACTORY_CODE_PREFIX,
  
  // 产线代码中缀
  lineInfix: LINE_CODE_INFIX,
  
  // 序号位数
  lineNumberPadding: 2,
  
  // 工厂代码后缀长度限制
  factorySuffixMaxLength: 10,
  
  // 产线序号最大值
  lineMaxNumber: 99
} as const

// 全局三态标准（工厂、产线等基础资源通用）
export const RESOURCE_STATUS = {
  AVAILABLE: 0,    // 可占用
  UNAVAILABLE: 1,  // 不可用
  OCCUPIED: 2      // 已占用
} as const

// 状态映射配置（适用于工厂、产线等所有基础资源）
export const RESOURCE_STATUS_MAP = {
  [RESOURCE_STATUS.AVAILABLE]: {
    text: '可占用',
    color: 'success',
    badge: 'processing'
  },
  [RESOURCE_STATUS.UNAVAILABLE]: {
    text: '不可用',
    color: 'error',
    badge: 'default'
  },
  [RESOURCE_STATUS.OCCUPIED]: {
    text: '已占用',
    color: 'warning',
    badge: 'warning'
  }
} as const

// 类型定义
export type ResourceStatusValue = typeof RESOURCE_STATUS[keyof typeof RESOURCE_STATUS]

// 向后兼容：保留旧的 LINE_STATUS 别名
export const LINE_STATUS = RESOURCE_STATUS
export const LINE_STATUS_MAP = RESOURCE_STATUS_MAP
export type LineStatusValue = ResourceStatusValue

export default CODE_CONFIG

