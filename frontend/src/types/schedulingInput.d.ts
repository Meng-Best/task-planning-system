/**
 * 调度算法输入数据的 TypeScript 类型定义
 * Scheduling Algorithm Input TypeScript Type Definitions
 */

// ============ Config 配置相关类型 ============

/**
 * 每日工作时间段配置
 * Daily work schedule configuration
 */
export interface WorkSchedule {
    /** 上午开始时间 (小时) */
    upstart_time: number;
    /** 上午结束时间 (小时) */
    upend_time: number;
    /** 下午开始时间 (小时) */
    downstart_time: number;
    /** 下午结束时间 (小时) */
    downend_time: number;
}

/**
 * 工作日历配置
 * Work calendar configuration
 */
export interface WorkCalendar {
    /** 排程开始日期 (格式: YYYY-MM-DD) */
    start_date: string;
    /** 每日工作开始小时 */
    start_hour: number;
    /** 每日工作时间段配置 */
    schedule: WorkSchedule;
    /** 假期日期列表 */
    holidays: string[];
}

/**
 * 配置中的资源名称列表
 * Resource name lists in configuration
 */
export interface ConfigResources {
    /** 班组名称列表 */
    crews: string[];
    /** 设备名称列表 */
    machines: string[];
    /** 部装工位名称列表 */
    part_stations: string[];
    /** 总装工位名称列表 */
    final_stations: string[];
}

/**
 * 系统配置
 * System configuration
 */
export interface Config {
    /** 工作日历配置 */
    work_calendar: WorkCalendar;
    /** 资源名称配置 */
    resources: ConfigResources;
}

// ============ Resources 资源相关类型 ============

/**
 * 班组/团队信息
 * Team/Crew information
 */
export interface Team {
    /** 班组唯一标识 */
    id: string;
    /** 班组编码 */
    code: string;
    /** 班组名称 */
    name: string;
    /** 班组可执行的工序代码列表 */
    capabilities: string[];
}

/**
 * 工位信息
 * Station information
 */
export interface Station {
    /** 工位唯一标识 */
    id: string;
    /** 工位编码 */
    code: string;
    /** 工位名称 */
    name: string;
    /** 工位类型: 0=部装, 1=总装, 2=测试 */
    type?: number;
    /** 工位可执行的工序代码列表 */
    capabilities: string[];
}

/**
 * 设备信息
 * Machine/Equipment information
 */
export interface Machine {
    /** 设备唯一标识 */
    id: string;
    /** 设备编码 */
    code: string;
    /** 设备名称 */
    name: string;
    /** 设备可执行的工序代码列表 */
    capabilities: string[];
}

/**
 * 资源集合
 * Resource collection
 */
export interface Resources {
    /** 班组列表 */
    teams: Team[];
    /** 工位列表 (包含部装工位和总装工位) */
    stations: Station[];
    /** 设备列表 */
    machines: Machine[];
}

// ============ Orders 订单相关类型 ============

/**
 * 订单中的产品项
 * Product item in order
 */
export interface OrderProduct {
    /** 产品实例唯一标识 */
    product_id: string;
    /** 产品编码 (对应产品库中的code) */
    product_code: string;
    /** 产品数量 */
    quantity: number;
}

/**
 * 订单信息
 * Order information
 */
export interface Order {
    /** 订单编码 */
    Order_code: string;
    /** 订单名称 */
    Order_name: string;
    /** 订单包含的产品列表 */
    products: OrderProduct[];
    /** 订单优先级/排队顺序 */
    queue: number;
    /** 订单数量 */
    quantity: number;
    /** 交付截止日期 (可为空) */
    deadline: string | null;
}

// ============ Product Library 产品库相关类型 ============

/**
 * 工序操作信息
 * Operation information within a task
 */
export interface Operation {
    /** 操作名称 */
    name: string;
    /** 操作持续时间 (分钟) */
    duration: number;
    /** 允许执行此操作的设备列表 */
    allowed_machines: string[];
}

/**
 * 工序/任务信息
 * Task/Process information
 */
export interface Task {
    /** 工序代码 */
    process_code: string;
    /** 工序在产品中的顺序 */
    queue: number;
    /** 工序持续时间 (分钟) */
    duration: number;
    /** 任务唯一标识 */
    id: string;
    /** 任务编码 */
    code: string;
    /** 任务名称 */
    name: string;
    /** 任务代码 */
    task_code: string;
    /** 任务ID */
    task_id: string;
    /** 工序ID */
    process_id: string;
    /** 工序名称 */
    process_name: string;
    /** 工序包含的操作列表 */
    operations: Operation[];
}

/**
 * 产品定义
 * Product definition
 */
export interface Product {
    /** 产品编码 */
    code: string;
    /** 产品名称 */
    name: string;
    /** 产品包含的工序/任务列表 */
    tasks: Task[];
}

// ============ 根类型 Root Type ============

/**
 * 调度算法输入数据根类型
 * Root type for scheduling algorithm input data
 */
export interface SchedulingInput {
    /** 系统配置信息 */
    config: Config;
    /** 可用资源信息 (班组、工位、设备) */
    resources: Resources;
    /** 待排程订单列表 */
    orders: Order[];
    /** 产品库 (产品工艺定义) */
    product_library: Product[];
}
