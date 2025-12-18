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

export default CODE_CONFIG

