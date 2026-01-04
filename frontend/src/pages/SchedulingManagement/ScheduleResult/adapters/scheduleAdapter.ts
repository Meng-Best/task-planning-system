import dayjs from 'dayjs'
import type {
  ScheduleResultData,
  GanttItem,
  OrderTreeNode,
  StationTimelineData,
  TeamWorkloadData,
  StatisticData,
  TaskPlan
} from '../types'

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

    // 处理订单最佳产品序列
    this.data.order_best_product_sequences.forEach(seq => {
      const match = seq.match(/订单 (\w+) 最佳产品序列: \[(.*)\]/)
      if (match) {
        const orderCode = match[1]
        const productSeq = match[2].replace(/'/g, '').split(', ')

        const orderPlan = this.data.product_order_plan.find(
          p => p['Order code'] === orderCode
        )

        if (orderPlan) {
          orderMap.set(orderCode, {
            key: orderCode,
            orderCode: orderPlan['Order code'],
            orderName: orderPlan['Order name'],
            productSequence: productSeq,
            planStart: orderPlan.planstart,
            planEnd: orderPlan.planend,
            tasks: [],
            children: []
          })
        }
      }
    })

    // 添加任务到对应订单
    this.data.task_plan.forEach(task => {
      const orderNode = orderMap.get(task['order code'])
      if (orderNode) {
        orderNode.tasks.push(task)
      }
    })

    return Array.from(orderMap.values())
  }

  /**
   * 获取工位时间线数据
   * @param allStations 可选，所有工位列表（用于显示没有任务的工位）
   */
  toStationTimeline(allStations?: Array<{ code: string; name: string }>): StationTimelineData[] {
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

    // 如果传入了所有工位列表，确保没有任务的工位也包含在结果中
    if (allStations) {
      allStations.forEach(station => {
        if (!stationMap.has(station.code)) {
          stationMap.set(station.code, [])
        }
      })
    }

    // 创建工位名称映射（用于没有任务的工位）
    const stationNameMap = new Map<string, string>()
    if (allStations) {
      allStations.forEach(station => {
        stationNameMap.set(station.code, station.name)
      })
    }

    return Array.from(stationMap.entries()).map(([stationCode, tasks]) => {
      // 计算工位总工作时长（小时）
      let totalHours = 0
      tasks.forEach(task => {
        const duration = dayjs(task.planend).diff(dayjs(task.planstart), 'hour')
        totalHours += duration
      })

      // 利用率 = 工作时长 / (总天数 * 24小时)
      const utilization = tasks.length > 0 ? (totalHours / (totalDays * 24)) * 100 : 0

      // 获取工位名称：优先从任务中获取，否则从 allStations 中获取
      const stationName = tasks.length > 0
        ? tasks[0]['station name']
        : (stationNameMap.get(stationCode) || stationCode)

      return {
        stationCode,
        stationName,
        tasks: tasks.sort((a, b) =>
          dayjs(a.planstart).valueOf() - dayjs(b.planstart).valueOf()
        ),
        utilization: Math.min(100, Math.round(utilization))
      }
    }).sort((a, b) => a.stationCode.localeCompare(b.stationCode))
  }

  /**
   * 获取班组工作负荷数据
   */
  toTeamWorkload(): TeamWorkloadData[] {
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
      // 计算班组总工作时长（小时）
      let totalHours = 0
      tasks.forEach(task => {
        const duration = dayjs(task.planend).diff(dayjs(task.planstart), 'hour')
        totalHours += duration
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
