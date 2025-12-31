/**
 * 调度数据组装适配器
 * Scheduling Data Assembly Adapter
 * 
 * 核心功能：将后端数据转换为调度算法所需的 SchedulingInput 格式
 * - 设备/工位能力：默认全量（使用所有任务涉及的工序编码）
 * - 班组能力：保留后端真实数据
 * - 工作日历：固定时段 8-12, 14-18
 */

import dayjs from 'dayjs';

import type {
    SchedulingInput,
    Config,
    Resources,
    Order,
    Product,
    Team,
    Station,
    Machine,
    Task,
    WorkCalendar,
    WorkSchedule,
    ConfigResources,
    OrderProduct
} from '../types/schedulingInput';

// ============ 输入数据类型定义 ============

/** 后端返回的任务数据（含 steps 和产品工艺路线） */
export interface BackendTask {
    id: string;
    code: string;
    orderId: string;
    productId: string;
    deadline?: string | null;
    status: number;
    priority?: number;
    order?: {
        code: string;
        name: string;
        quantity: number;
        deadline?: string | null;
    };
    product?: {
        id: string;
        code: string;
        name: string;
        routings?: BackendRouting[];
    };
    steps?: BackendStep[];
}

/** 后端返回的拆分步骤 */
export interface BackendStep {
    id: string;
    type: number; // 0=部装, 1=总装
    productId: string;
    seq: number;
    product?: {
        id: string;
        code: string;
        name: string;
        routings?: BackendRouting[];
    };
}

/** 后端返回的工艺路线 */
export interface BackendRouting {
    id: string;
    code: string;
    name: string;
    processes?: BackendProcess[];
}

/** 后端返回的工序 */
export interface BackendProcess {
    id: string;
    code: string;
    name: string;
    seq: number;
    duration?: number;
}

/** 后端返回的资源数据 */
export interface BackendResources {
    teams: BackendTeam[];
    devices: BackendDevice[];
    stations: BackendStation[];
}

/** 后端返回的班组 */
export interface BackendTeam {
    id: string;
    code: string;
    name: string;
    capabilities?: string[]; // 班组的真实能力列表
}

/** 后端返回的设备 */
export interface BackendDevice {
    id: string;
    code: string;
    name: string;
    capabilities?: string[]; // 后端可能有，但会被忽略
}

/** 后端返回的工位 */
export interface BackendStation {
    id: string;
    code: string;
    name: string;
    type: number; // 0=部装, 1=总装, 2=测试
    capabilities?: string[]; // 后端可能有，但会被忽略
}

/** 后端返回的日历数据 */
export interface BackendCalendar {
    holidays?: string[]; // 假期日期列表
    events?: BackendCalendarEvent[];
}

/** 日历事件（旧格式，兼容用） */
export interface BackendCalendarEvent {
    date: string;
    type: 'holiday' | 'workday'; // 假期或调休工作日
    description?: string;
}

/**
 * 数据库日历事件模型 (对应 Prisma CalendarEvent)
 * Database calendar event model
 */
export interface CalendarEvent {
    /** 日期 */
    date: Date | string;
    /** 事件类型: WORK=调休上班, HOLIDAY=法定节假日, REST=其他休息 */
    type: 'WORK' | 'HOLIDAY' | 'REST';
}

// ============ 常量配置 ============

/** 默认工作时段配置 (8-12, 14-18) */
const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
    upstart_time: 8,
    upend_time: 12,
    downstart_time: 14,
    downend_time: 18
};

/** 默认每日工作开始小时 */
const DEFAULT_START_HOUR = 8;

// ============ 核心转换函数 ============

/**
 * 将后端数据转换为调度算法输入格式
 * 
 * @param tasks - 后端返回的生产任务列表（含 steps 和产品工艺路线）
 * @param resources - 后端返回的资源数据（班组、设备、工位）
 * @param calendar - 后端返回的日历数据
 * @param startDate - 排程开始日期，默认为今天
 * @returns 调度算法所需的 SchedulingInput
 */
export function transformToSchedulingInput(
    tasks: BackendTask[],
    resources: BackendResources,
    calendar: BackendCalendar,
    startDate?: string
): SchedulingInput {
    // 1. 提取所有工序编码（用于设备/工位的全能伪装）
    const allProcessCodes = extractAllProcessCodes(tasks);

    // 2. 转换资源数据
    const transformedResources = transformResources(resources, allProcessCodes);

    // 3. 转换订单数据
    const orders = transformOrders(tasks);

    // 4. 提取设备名称列表（用于allowed_machines）
    const machineNames = transformedResources.machines.map(m => m.name);

    // 5. 构建产品库（传入设备名称）
    const productLibrary = buildProductLibrary(tasks, machineNames);

    // 6. 构建配置
    const config = buildConfig(
        transformedResources,
        calendar,
        startDate || formatDate(new Date())
    );

    return {
        config,
        resources: transformedResources,
        orders,
        product_library: productLibrary
    };
}

// ============ 工序编码提取 ============

/**
 * 从所有任务中提取去重后的工序编码列表
 * 遍历任务的 steps -> 对应产品的工艺路线 -> 工序编码
 */
function extractAllProcessCodes(tasks: BackendTask[]): string[] {
    const processCodeSet = new Set<string>();

    for (const task of tasks) {
        // 从任务关联的产品提取工序
        if (task.product?.routings) {
            for (const routing of task.product.routings) {
                if (routing.processes) {
                    for (const process of routing.processes) {
                        if (process.code) {
                            processCodeSet.add(process.code);
                        }
                    }
                }
            }
        }

        // 从 steps 关联的产品提取工序
        if (task.steps) {
            for (const step of task.steps) {
                if (step.product?.routings) {
                    for (const routing of step.product.routings) {
                        if (routing.processes) {
                            for (const process of routing.processes) {
                                if (process.code) {
                                    processCodeSet.add(process.code);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return Array.from(processCodeSet);
}

// ============ 资源转换 ============

/**
 * 从编码中提取工序类型标识
 * @param code - 工序编码或工位编码 (如 PROCZXGTWG04, GW-CS-GT-01)
 * @returns 工序类型标识 (GT=固体, YT=液体) 或 null
 */
function extractProcessType(code: string): string | null {
    // 尝试匹配常见的工序类型模式
    // 示例：PROCZXGTWG04 -> GT, PROCZXYTWG04 -> YT
    // 示例：GW-CS-GT-01 -> GT, GW-CS-YT-01 -> YT
    const upperCode = code.toUpperCase();

    // 匹配 GT (固体)
    if (upperCode.includes('GT')) {
        return 'GT';
    }
    // 匹配 YT (液体)
    if (upperCode.includes('YT')) {
        return 'YT';
    }

    return null;
}

/**
 * 根据工位/设备类型过滤可执行的工序编码
 * @param resourceCode - 资源编码 (工位或设备)
 * @param allProcessCodes - 所有工序编码列表
 * @returns 匹配的工序编码列表
 *
 * 匹配规则：
 * - GT工位 -> 只能处理GT工序（固体工序）
 * - YT工位 -> 只能处理YT工序（液体工序）
 * - 无类型标识 -> 可以处理所有工序
 */
function filterProcessCodesByType(
    resourceCode: string,
    allProcessCodes: string[]
): string[] {
    const resourceType = extractProcessType(resourceCode);

    // 如果资源没有类型标识，返回所有工序编码
    if (!resourceType) {
        return allProcessCodes;
    }

    // 只返回与资源类型匹配的工序编码
    return allProcessCodes.filter(processCode => {
        const processType = extractProcessType(processCode);
        // 如果工序没有类型标识，或类型匹配，则允许
        return !processType || processType === resourceType;
    });
}

/**
 * 转换资源数据
 * - 班组：保留真实 capabilities
 * - 设备：使用全量工序编码作为 capabilities（保留原有逻辑）
 * - 工位：根据工序类型动态匹配 capabilities (GT工位->GT工序, YT工位->YT工序)
 */
function transformResources(
    resources: BackendResources,
    allProcessCodes: string[]
): Resources {
    // 转换班组（保留真实能力，ID转为string）
    const teams: Team[] = resources.teams.map(team => ({
        id: String(team.id), // 确保ID为string类型
        code: team.code,
        name: team.name,
        capabilities: team.capabilities || []
    }));

    // 转换设备（使用全量工序编码，ID转为string）
    const machines: Machine[] = resources.devices.map(device => ({
        id: String(device.id), // 确保ID为string类型
        code: device.code,
        name: device.name,
        capabilities: allProcessCodes // 保持全能伪装
    }));

    // 转换工位（基于工序类型动态匹配，ID转为string，保留type用于分类）
    const stations: Station[] = resources.stations.map(station => ({
        id: String(station.id), // 确保ID为string类型
        code: station.code,
        name: station.name,
        type: station.type, // 保留type用于part/final分类
        capabilities: filterProcessCodesByType(station.code, allProcessCodes) // 动态匹配
    }));

    return { teams, stations, machines };
}

// ============ 订单转换 ============

/**
 * 从任务列表构建订单数据
 */
function transformOrders(tasks: BackendTask[]): Order[] {
    return tasks.map((task, index) => {
        const products: OrderProduct[] = [];

        // 添加主产品
        if (task.product) {
            products.push({
                product_id: task.product.id,
                product_code: task.product.code,
                quantity: task.order?.quantity || 1
            });
        }

        // 添加 steps 中的产品（部装舱段等）
        if (task.steps) {
            for (const step of task.steps) {
                if (step.product && step.product.id !== task.product?.id) {
                    products.push({
                        product_id: step.product.id,
                        product_code: step.product.code,
                        quantity: 1
                    });
                }
            }
        }

        return {
            Order_code: task.order?.code || task.code,
            Order_name: task.order?.name || `任务-${task.code}`,
            products,
            queue: task.priority ?? index + 1,
            quantity: task.order?.quantity || 1,
            deadline: task.deadline || task.order?.deadline || null
        };
    });
}

// ============ 产品库构建 ============

/**
 * 从任务列表构建产品库
 * 收集所有涉及的产品及其工艺路线
 * @param tasks - 后端任务列表
 * @param machineNames - 设备名称列表（用于allowed_machines）
 */
function buildProductLibrary(tasks: BackendTask[], machineNames: string[] = []): Product[] {
    const productMap = new Map<string, Product>();

    for (const task of tasks) {
        // 处理主产品
        if (task.product) {
            addProductToLibrary(productMap, task.product, machineNames);
        }

        // 处理 steps 中的产品
        if (task.steps) {
            for (const step of task.steps) {
                if (step.product) {
                    addProductToLibrary(productMap, step.product, machineNames);
                }
            }
        }
    }

    return Array.from(productMap.values());
}

/**
 * 将产品添加到产品库
 * @param productMap - 产品Map
 * @param backendProduct - 后端产品数据
 * @param machineNames - 设备名称列表（用于allowed_machines）
 */
function addProductToLibrary(
    productMap: Map<string, Product>,
    backendProduct: BackendTask['product'],
    machineNames: string[] = []
): void {
    if (!backendProduct || productMap.has(backendProduct.code)) {
        return;
    }

    const tasks: Task[] = [];

    // 从工艺路线提取工序作为任务
    if (backendProduct.routings) {
        for (const routing of backendProduct.routings) {
            if (routing.processes) {
                for (const process of routing.processes) {
                    // 后端工时单位是小时，调度算法需要分钟，需要转换
                    const durationInMinutes = (process.duration || 1) * 60;
                    tasks.push({
                        id: process.id,
                        code: process.code,
                        name: process.name,
                        process_code: process.code,
                        process_id: process.id,
                        process_name: process.name,
                        task_code: process.code,
                        task_id: process.id,
                        queue: process.seq,
                        duration: durationInMinutes,
                        operations: [{
                            name: 'StandardOp',
                            duration: durationInMinutes,
                            allowed_machines: machineNames // 使用所有设备名称
                        }]
                    });
                }
            }
        }
    }

    // 按 queue 排序
    tasks.sort((a, b) => a.queue - b.queue);

    productMap.set(backendProduct.code, {
        code: backendProduct.code,
        name: backendProduct.name,
        tasks
    });
}

// ============ 配置构建 ============

/**
 * 构建系统配置
 */
function buildConfig(
    resources: Resources,
    calendar: BackendCalendar,
    startDate: string
): Config {
    // 构建资源名称配置
    const configResources: ConfigResources = {
        crews: resources.teams.map(t => t.name),
        machines: resources.machines.map(m => m.name),
        part_stations: resources.stations
            .filter(s => isPartStation(s))
            .map(s => s.name),
        final_stations: resources.stations
            .filter(s => isFinalStation(s))
            .map(s => s.name)
    };

    // 构建工作日历
    const workCalendar: WorkCalendar = {
        start_date: startDate,
        start_hour: DEFAULT_START_HOUR,
        schedule: DEFAULT_WORK_SCHEDULE,
        holidays: extractHolidays(calendar)
    };

    return {
        work_calendar: workCalendar,
        resources: configResources
    };
}

/**
 * 从日历数据提取假期列表
 */
function extractHolidays(calendar: BackendCalendar): string[] {
    const holidays: string[] = [];

    // 直接返回的假期列表
    if (calendar.holidays) {
        holidays.push(...calendar.holidays);
    }

    // 从事件中提取假期
    if (calendar.events) {
        for (const event of calendar.events) {
            if (event.type === 'holiday') {
                holidays.push(event.date);
            }
        }
    }

    // 去重并排序
    return [...new Set(holidays)].sort();
}

// ============ 工具函数 ============

/**
 * 判断工位是否为部装工位
 * 使用 type 字段判断：0=部装, 1=总装, 2=测试
 */
function isPartStation(station: Station): boolean {
    // 优先使用 type 字段
    if (station.type !== undefined) {
        return station.type === 0; // 0=部装
    }
    // 兼容旧逻辑：根据编码判断
    const code = station.code.toLowerCase();
    return code.includes('part') || code.includes('bz');
}

/**
 * 判断工位是否为总装工位
 * 使用 type 字段判断：0=部装, 1=总装, 2=测试
 */
function isFinalStation(station: Station): boolean {
    // 优先使用 type 字段
    if (station.type !== undefined) {
        return station.type === 1; // 1=总装
    }
    // 兼容旧逻辑：根据编码判断
    const code = station.code.toLowerCase();
    return code.includes('final') || code.includes('zz');
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============ 工作日历转换 ============

/** 默认排程天数 */
const DEFAULT_DAYS_TO_SCHEDULE = 60;

/**
 * 将数据库日历事件转换为算法所需的工作日历格式
 * 
 * @param events - 数据库中的日历事件列表
 * @param startDate - 排程开始日期 (格式: YYYY-MM-DD)
 * @param daysToSchedule - 排程天数，默认60天
 * @returns 算法所需的 WorkCalendar 格式
 * 
 * 业务逻辑：
 * 1. 如果数据库中有该日期的记录：
 *    - type 为 'HOLIDAY' 或 'REST' -> 是 holiday
 *    - type 为 'WORK' -> 不是 holiday（即工作日，哪怕是周末）
 * 2. 如果数据库中没有记录：
 *    - 周六或周日 -> 是 holiday
 *    - 周一至周五 -> 不是 holiday
 */
export function transformWorkCalendar(
    events: CalendarEvent[],
    startDate: string,
    daysToSchedule: number = DEFAULT_DAYS_TO_SCHEDULE
): WorkCalendar {
    // 将事件列表转换为 Map，便于快速查找
    const eventMap = new Map<string, CalendarEvent['type']>();
    for (const event of events) {
        const dateStr = dayjs(event.date).format('YYYY-MM-DD');
        eventMap.set(dateStr, event.type);
    }

    const holidays: string[] = [];
    const start = dayjs(startDate);

    // 遍历从 startDate 开始的 daysToSchedule 天
    for (let i = 0; i < daysToSchedule; i++) {
        const currentDate = start.add(i, 'day');
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayOfWeek = currentDate.day(); // 0=周日, 6=周六

        const eventType = eventMap.get(dateStr);

        let isHoliday = false;

        if (eventType !== undefined) {
            // 数据库中有记录
            if (eventType === 'HOLIDAY' || eventType === 'REST') {
                isHoliday = true;
            }
            // type === 'WORK' 表示调休上班，不是 holiday
        } else {
            // 数据库中无记录，按默认规则判断
            // 周六(6)或周日(0)是休息日
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                isHoliday = true;
            }
        }

        if (isHoliday) {
            holidays.push(dateStr);
        }
    }

    return {
        start_date: startDate,
        start_hour: DEFAULT_START_HOUR,
        schedule: DEFAULT_WORK_SCHEDULE,
        holidays
    };
}

// ============ 导出辅助函数 ============

export {
    extractAllProcessCodes,
    transformResources,
    transformOrders,
    buildProductLibrary,
    buildConfig,
    formatDate,
    DEFAULT_WORK_SCHEDULE,
    DEFAULT_START_HOUR,
    DEFAULT_DAYS_TO_SCHEDULE
};
