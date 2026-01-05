// 调度结果数据类型定义

// 任务计划项
export interface TaskPlan {
  'order code': string
  order_name: string
  product_code?: string
  product_name?: string
  'task id': string
  task_code: string
  process_code: string
  name: string
  planstart: string
  planend: string
  'team id': string
  team_code: string
  'team name': string  // 注意：JSON中是带空格的
  'station id': string
  'station code': string  // 注意：JSON中是带空格的
  'station name': string  // 注意：JSON中是带空格的
  'machine id'?: string
  'machine code'?: string
  'machine name'?: string
}

// 订单计划项
export interface OrderPlan {
  'Order code': string
  'Order name': string
  planstart: string
  planend: string
}

// 调度结果完整数据
export interface ScheduleResultData {
  best_order_sequence: string[]  // 订单最佳序列
  product_order_plan: OrderPlan[]
  task_plan: TaskPlan[]
}

// API响应格式
export interface ScheduleResultResponse {
  status: string
  data: ScheduleResultData
  meta: {
    lastModified: string
    fileSize: number
  }
}

// 甘特图数据项
export interface GanttItem {
  id: string
  name: string
  start: Date
  end: Date
  group: string // 工位/班组/订单
  orderCode: string
  orderName: string
  taskCode: string
  processCode: string
  teamCode: string
  teamName: string
  stationCode: string
  stationName: string
}

// 订单树节点
export interface OrderTreeNode {
  key: string
  orderCode: string
  orderName: string
  productSequence: string[]
  planStart: string
  planEnd: string
  tasks: TaskPlan[]
  children?: ProductNode[]
}

// 产品节点
export interface ProductNode {
  key: string
  productCode: string
  productName: string
  tasks: TaskPlan[]
}

// 工位时间线数据
export interface StationTimelineData {
  stationCode: string
  stationName: string
  tasks: TaskPlan[]
  utilization: number // 利用率百分比
}

// 班组工作负荷数据
export interface TeamWorkloadData {
  teamCode: string
  teamName: string
  tasks: TaskPlan[]
  totalHours: number
}

// 筛选条件
export interface FilterCondition {
  orders: string[]
  stations: string[]
  teams: string[]
  dateRange: [string, string] | null
}

// 统计数据
export interface StatisticData {
  totalOrders: number
  totalTasks: number
  totalTeams: number
  totalStations: number
  dateRange: {
    start: string
    end: string
    days: number
  }
}
