import dayjs, { Dayjs } from 'dayjs'
import type {
  ScheduleResultData,
  GanttItem,
  OrderTreeNode,
  StationTimelineData,
  TeamWorkloadData,
  StatisticData,
  TaskPlan
} from '../types'
import { DEFAULT_WORK_CONFIG, type WorkConfig } from '../utils/splitTaskByWorkHours'


/**
 * 计算任务的实际工作时长（小时）
 * 考虑工作日历（每日工作时间、周末、节假日）
 */
function calculateActualWorkHours(
  startDate: Dayjs,
  endDate: Dayjs,
  workConfig: WorkConfig = DEFAULT_WORK_CONFIG
): number {
  if (!startDate.isValid() || !endDate.isValid() || endDate.isBefore(startDate)) {
    return 0
  }

  let totalMinutes = 0
  let currentDay = startDate.startOf('day')
  const lastDay = endDate.startOf('day')

  while (currentDay.isBefore(lastDay) || currentDay.isSame(lastDay, 'day')) {
    const dateStr = currentDay.format('YYYY-MM-DD')

    // 跳过节假日和周末
    const dayOfWeek = currentDay.day()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = workConfig.holidays.includes(dateStr)

    if (!isWeekend && !isHoliday) {
      // 计算当天的工作时间
      for (const shift of workConfig.shifts) {
        const shiftStart = currentDay.hour(shift.startHour).minute(shift.startMinute)
        const shiftEnd = currentDay.hour(shift.endHour).minute(shift.endMinute)

        // 计算班次与任务时间的交集
        const effectiveStart = startDate.isAfter(shiftStart) ? startDate : shiftStart
        const effectiveEnd = endDate.isBefore(shiftEnd) ? endDate : shiftEnd

        if (effectiveStart.isBefore(effectiveEnd)) {
          totalMinutes += effectiveEnd.diff(effectiveStart, 'minute')
        }
      }
    }

    currentDay = currentDay.add(1, 'day')
  }

  return totalMinutes / 60
}

/**
 * 调度结果数据适配器
 */
export class ScheduleAdapter {
  private data: ScheduleResultData

  constructor(data: ScheduleResultData) {
    this.data = data
  }

  /**
   * 获取统计数据
   */
  getStatistics(): StatisticData {
    const orders = new Set(this.data.task_plan.map(t => t['order code']))
    const teams = new Set(this.data.task_plan.map(t => t.team_code))
    const stations = new Set(this.data.task_plan.map(t => t['station code']))

    // 计算时间范围
    let minDate = dayjs(this.data.task_plan[0].planstart)
    let maxDate = dayjs(this.data.task_plan[0].planend)

    this.data.task_plan.forEach(task => {
      const start = dayjs(task.planstart)
      const end = dayjs(task.planend)
      if (start.isBefore(minDate)) minDate = start
      if (end.isAfter(maxDate)) maxDate = end
    })

    return {
      totalOrders: orders.size,
      totalTasks: this.data.task_plan.length,
      totalTeams: teams.size,
      totalStations: stations.size,
      dateRange: {
        start: minDate.format('YYYY-MM-DD'),
        end: maxDate.format('YYYY-MM-DD'),
        days: maxDate.diff(minDate, 'day')
      }
    }
  }

  /**
   * 转换为甘特图数据（按工位分组）
   */
  toGanttDataByStation(): GanttItem[] {
    return this.data.task_plan.map(task => ({
      id: task['task id'],
      name: task.name,
      start: new Date(task.planstart),
      end: new Date(task.planend),
      group: task['station name'],
      orderCode: task['order code'],
      orderName: task.order_name,
      taskCode: task.task_code,
      processCode: task.process_code,
      teamCode: task.team_code,
      teamName: task['team name'],
      stationCode: task['station code'],
      stationName: task['station name']
    }))
  }

  /**
   * 转换为甘特图数据（按班组分组）
   */
  toGanttDataByTeam(): GanttItem[] {
    return this.data.task_plan.map(task => ({
      id: task['task id'],
      name: task.name,
      start: new Date(task.planstart),
      end: new Date(task.planend),
      group: task['team name'],
      orderCode: task['order code'],
      orderName: task.order_name,
      taskCode: task.task_code,
      processCode: task.process_code,
      teamCode: task.team_code,
      teamName: task['team name'],
      stationCode: task['station code'],
      stationName: task['station name']
    }))
  }

  /**
   * 转换为甘特图数据（按订单分组）
   */
  toGanttDataByOrder(): GanttItem[] {
    return this.data.task_plan.map(task => ({
      id: task['task id'],
      name: task.name,
      start: new Date(task.planstart),
      end: new Date(task.planend),
      group: task.order_name,
      orderCode: task['order code'],
      orderName: task.order_name,
      taskCode: task.task_code,
      processCode: task.process_code,
      teamCode: task.team_code,
      teamName: task['team name'],
      stationCode: task['station code'],
      stationName: task['station name']
    }))
  }

  /**
   * 转换为订单树数据
   */
  toOrderTree(): OrderTreeNode[] {
    const orderMap = new Map<string, OrderTreeNode>()

    // 根据 best_order_sequence 顺序构建订单树
    const orderSequence = this.data.best_order_sequence || []

    // 先从 product_order_plan 创建订单节点
    this.data.product_order_plan.forEach(orderPlan => {
      const orderCode = orderPlan['Order code']
      orderMap.set(orderCode, {
        key: orderCode,
        orderCode: orderPlan['Order code'],
        orderName: orderPlan['Order name'],
        productSequence: [], // 从任务中提取产品序列
        planStart: orderPlan.planstart,
        planEnd: orderPlan.planend,
        tasks: [],
        children: []
      })
    })

    // 添加任务到对应订单，并提取产品序列
    const orderProductSet = new Map<string, Set<string>>()
    this.data.task_plan.forEach(task => {
      const orderCode = task['order code']
      const orderNode = orderMap.get(orderCode)
      if (orderNode) {
        orderNode.tasks.push(task)
        // 收集产品编码
        if (!orderProductSet.has(orderCode)) {
          orderProductSet.set(orderCode, new Set())
        }
        if (task.product_code) {
          orderProductSet.get(orderCode)!.add(task.product_code)
        }
      }
    })

    // 设置产品序列
    orderProductSet.forEach((products, orderCode) => {
      const orderNode = orderMap.get(orderCode)
      if (orderNode) {
        orderNode.productSequence = Array.from(products)
      }
    })

    // 按照 best_order_sequence 顺序返回，如果没有则按原顺序
    if (orderSequence.length > 0) {
      return orderSequence
        .filter(code => orderMap.has(code))
        .map(code => orderMap.get(code)!)
    }

    return Array.from(orderMap.values())
  }
  /**
   * 获取工位时间线数据（只显示有任务的工位）
   * @param workConfig 可选，工作日历配置
   */
  toStationTimeline(
    _allStations?: Array<{ code: string; name: string }>,
    workConfig?: WorkConfig
  ): StationTimelineData[] {
    const stationMap = new Map<string, TaskPlan[]>()

    // 按工位分组任务
    this.data.task_plan.forEach(task => {
      const key = task['station code']
      if (!stationMap.has(key)) {
        stationMap.set(key, [])
      }
      stationMap.get(key)!.push(task)
    })

    // 计算每个工位的利用率
    const stats = this.getStatistics()
    const totalDays = stats.dateRange.days
    // 每日工作小时数（默认 8 小时）
    const hoursPerDay = workConfig?.shifts.reduce((sum, shift) => {
      const minutes = (shift.endHour * 60 + shift.endMinute) - (shift.startHour * 60 + shift.startMinute)
      return sum + minutes / 60
    }, 0) || 8

    return Array.from(stationMap.entries()).map(([stationCode, tasks]) => {
      // 计算工位实际工作时长（基于工作日历）
      let totalHours = 0
      tasks.forEach(task => {
        const hours = calculateActualWorkHours(
          dayjs(task.planstart),
          dayjs(task.planend),
          workConfig
        )
        totalHours += hours
      })

      // 利用率 = 实际工作时长 / (总天数 * 每日工作小时)
      const utilization = (totalHours / (totalDays * hoursPerDay)) * 100

      return {
        stationCode,
        stationName: tasks[0]['station name'],
        tasks: tasks.sort((a, b) =>
          dayjs(a.planstart).valueOf() - dayjs(b.planstart).valueOf()
        ),
        utilization: Math.min(100, Math.round(utilization))
      }
    }).sort((a, b) => a.stationCode.localeCompare(b.stationCode))
  }

  /**
   * 获取班组工作负荷数据
   * @param workConfig 可选，工作日历配置
   */
  toTeamWorkload(workConfig?: WorkConfig): TeamWorkloadData[] {
    const teamMap = new Map<string, TaskPlan[]>()

    // 按班组分组任务
    this.data.task_plan.forEach(task => {
      const key = task.team_code
      if (!teamMap.has(key)) {
        teamMap.set(key, [])
      }
      teamMap.get(key)!.push(task)
    })

    return Array.from(teamMap.entries()).map(([teamCode, tasks]) => {
      // 计算班组实际工作时长（基于工作日历）
      let totalHours = 0
      tasks.forEach(task => {
        const hours = calculateActualWorkHours(
          dayjs(task.planstart),
          dayjs(task.planend),
          workConfig
        )
        totalHours += hours
      })

      return {
        teamCode,
        teamName: tasks[0]['team name'],
        tasks: tasks.sort((a, b) =>
          dayjs(a.planstart).valueOf() - dayjs(b.planstart).valueOf()
        ),
        totalHours: Math.round(totalHours)
      }
    }).sort((a, b) => a.teamCode.localeCompare(b.teamCode))
  }

  /**
   * 根据筛选条件过滤任务
   */
  filterTasks(
    orders: string[],
    stations: string[],
    teams: string[],
    dateRange: [string, string] | null
  ): TaskPlan[] {
    return this.data.task_plan.filter(task => {
      // 订单筛选
      if (orders.length > 0 && !orders.includes(task['order code'])) {
        return false
      }

      // 工位筛选
      if (stations.length > 0 && !stations.includes(task['station code'])) {
        return false
      }

      // 班组筛选
      if (teams.length > 0 && !teams.includes(task.team_code)) {
        return false
      }

      // 时间范围筛选
      if (dateRange) {
        const taskStart = dayjs(task.planstart)
        const taskEnd = dayjs(task.planend)
        const filterStart = dayjs(dateRange[0])
        const filterEnd = dayjs(dateRange[1])

        if (taskEnd.isBefore(filterStart) || taskStart.isAfter(filterEnd)) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 获取所有唯一的订单列表
   */
  getUniqueOrders(): Array<{ code: string; name: string }> {
    const orderSet = new Map<string, string>()
    this.data.task_plan.forEach(task => {
      orderSet.set(task['order code'], task.order_name)
    })
    return Array.from(orderSet.entries()).map(([code, name]) => ({ code, name }))
  }

  /**
   * 获取所有唯一的工位列表
   */
  getUniqueStations(): Array<{ code: string; name: string }> {
    const stationSet = new Map<string, string>()
    this.data.task_plan.forEach(task => {
      stationSet.set(task['station code'], task['station name'])
    })
    return Array.from(stationSet.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }

  /**
   * 获取所有唯一的班组列表
   */
  getUniqueTeams(): Array<{ code: string; name: string }> {
    const teamSet = new Map<string, string>()
    this.data.task_plan.forEach(task => {
      teamSet.set(task.team_code, task['team name'])
    })
    return Array.from(teamSet.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }
}
