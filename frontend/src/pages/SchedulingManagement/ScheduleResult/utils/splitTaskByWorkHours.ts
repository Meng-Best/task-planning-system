/**
 * 工作时间拆分工具函数
 * 将连续的任务时间段按照工作日历拆分成多个工作时段
 */
import dayjs, { Dayjs } from 'dayjs'
import type { GanttItem } from '../types'

// 工作班次配置
export interface WorkShift {
    startHour: number
    startMinute: number
    endHour: number
    endMinute: number
}

// 工作日历配置
export interface WorkConfig {
    shifts: WorkShift[]  // 每日工作班次
    holidays: string[]   // 假期日期列表 (格式: YYYY-MM-DD)
}

// 默认工作时间配置：上午 8:00-12:00，下午 14:00-18:00
export const DEFAULT_WORK_CONFIG: WorkConfig = {
    shifts: [
        { startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 },   // 上午班
        { startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }   // 下午班
    ],
    holidays: []
}

/**
 * 判断指定日期是否为工作日
 * @param date 日期
 * @param holidays 假期列表
 * @returns 是否为工作日
 */
function isWorkDay(date: Dayjs, holidays: string[]): boolean {
    const dateStr = date.format('YYYY-MM-DD')

    // 检查是否在假期列表中
    if (holidays.includes(dateStr)) {
        return false
    }

    // 默认周六日为休息日
    const dayOfWeek = date.day()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false
    }

    return true
}

/**
 * 获取指定日期的工作时段
 * @param date 日期
 * @param shifts 班次配置
 * @returns 当天的工作时段列表
 */
function getWorkPeriodsForDay(date: Dayjs, shifts: WorkShift[]): { start: Dayjs; end: Dayjs }[] {
    return shifts.map(shift => ({
        start: date.hour(shift.startHour).minute(shift.startMinute).second(0).millisecond(0),
        end: date.hour(shift.endHour).minute(shift.endMinute).second(0).millisecond(0)
    }))
}

/**
 * 计算两个时间段的交集
 * @param taskStart 任务开始时间
 * @param taskEnd 任务结束时间
 * @param periodStart 工作时段开始时间
 * @param periodEnd 工作时段结束时间
 * @returns 交集时间段，如果没有交集则返回 null
 */
function getTimeIntersection(
    taskStart: Dayjs,
    taskEnd: Dayjs,
    periodStart: Dayjs,
    periodEnd: Dayjs
): { start: Dayjs; end: Dayjs } | null {
    const start = taskStart.isAfter(periodStart) ? taskStart : periodStart
    const end = taskEnd.isBefore(periodEnd) ? taskEnd : periodEnd

    if (start.isBefore(end)) {
        return { start, end }
    }

    return null
}

/**
 * 将单个任务按工作时间拆分成多个时段
 * @param task 原始任务
 * @param workConfig 工作日历配置
 * @returns 拆分后的任务数组
 */
export function splitTaskByWorkHours(
    task: GanttItem,
    workConfig: WorkConfig = DEFAULT_WORK_CONFIG
): GanttItem[] {
    const taskStart = dayjs(task.start)
    const taskEnd = dayjs(task.end)

    // 如果任务时间无效，直接返回原任务
    if (!taskStart.isValid() || !taskEnd.isValid() || taskEnd.isBefore(taskStart)) {
        return [task]
    }

    const result: GanttItem[] = []
    let currentDay = taskStart.startOf('day')
    const endDay = taskEnd.startOf('day')
    let segmentIndex = 0

    // 遍历任务跨越的每一天
    while (currentDay.isBefore(endDay) || currentDay.isSame(endDay, 'day')) {
        // 检查是否为工作日
        if (isWorkDay(currentDay, workConfig.holidays)) {
            // 获取当天的工作时段
            const workPeriods = getWorkPeriodsForDay(currentDay, workConfig.shifts)

            // 检查每个工作时段与任务的交集
            for (const period of workPeriods) {
                const intersection = getTimeIntersection(taskStart, taskEnd, period.start, period.end)

                if (intersection) {
                    // 创建拆分后的任务段
                    result.push({
                        ...task,
                        id: `${task.id}_seg_${segmentIndex}`,
                        start: intersection.start.toDate(),
                        end: intersection.end.toDate()
                    })
                    segmentIndex++
                }
            }
        }

        // 移动到下一天
        currentDay = currentDay.add(1, 'day')
    }

    // 如果没有拆分出任何时段（可能全部在休息时间），返回原任务
    if (result.length === 0) {
        return [task]
    }

    return result
}

/**
 * 批量拆分任务列表
 * @param tasks 原始任务列表
 * @param workConfig 工作日历配置
 * @returns 拆分后的任务列表
 */
export function splitAllTasksByWorkHours(
    tasks: GanttItem[],
    workConfig: WorkConfig = DEFAULT_WORK_CONFIG
): GanttItem[] {
    return tasks.flatMap(task => splitTaskByWorkHours(task, workConfig))
}
