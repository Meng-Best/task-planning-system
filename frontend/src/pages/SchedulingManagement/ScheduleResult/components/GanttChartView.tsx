import { Card, Radio, Divider, Switch, Tooltip } from 'antd'
import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { GanttItem } from '../types'
import dayjs from 'dayjs'
import { splitAllTasksByWorkHours, DEFAULT_WORK_CONFIG, type WorkConfig } from '../utils/splitTaskByWorkHours'

type TimeScale = 'day' | 'week' | 'month'

// 根据时间刻度获取时间范围
const getTimeRange = (scale: TimeScale, minTime: number, maxTime: number) => {
  const dataStart = dayjs(minTime)  // 使用数据的开始时间，而不是当前时间
  switch (scale) {
    case 'day':
      // 显示数据开始日期的那一天
      return { min: dataStart.startOf('day').valueOf(), max: dataStart.endOf('day').valueOf() }
    case 'week':
      // 显示数据开始日期所在的那一周
      return { min: dataStart.startOf('week').valueOf(), max: dataStart.endOf('week').valueOf() }
    case 'month':
    default:
      // 显示全部数据范围
      return { min: minTime, max: maxTime }
  }
}

interface GanttChartViewProps {
  dataByStation: GanttItem[]
  dataByTeam: GanttItem[]
  dataByOrder: GanttItem[]
  onTaskClick?: (task: GanttItem) => void
  workConfig?: WorkConfig  // 工作日历配置
  holidays?: string[]      // 节假日列表
}

type GroupMode = 'order' | 'station' | 'team'

// 根据订单编码生成颜色
const getColorByOrder = (orderCode: string): string => {
  const colors = [
    '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
    '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#5470C6'
  ]
  // 简单的哈希函数
  let hash = 0
  for (let i = 0; i < orderCode.length; i++) {
    hash = orderCode.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const GanttChartView: React.FC<GanttChartViewProps> = ({
  dataByStation,
  dataByTeam,
  dataByOrder,
  onTaskClick,
  workConfig,
  holidays = []
}) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('order')
  const [timeScale, setTimeScale] = useState<TimeScale>('month')
  const [enableWorkTimeSplit, setEnableWorkTimeSplit] = useState(false)  // 是否启用工作时间拆分

  // 合并工作日历配置
  const effectiveWorkConfig: WorkConfig = useMemo(() => ({
    shifts: workConfig?.shifts || DEFAULT_WORK_CONFIG.shifts,
    holidays: [...(workConfig?.holidays || []), ...holidays]
  }), [workConfig, holidays])

  const option = useMemo(() => {
    // 根据当前分组模式获取数据
    let rawData: GanttItem[] = []
    switch (groupMode) {
      case 'station':
        rawData = dataByStation
        break
      case 'team':
        rawData = dataByTeam
        break
      case 'order':
        rawData = dataByOrder
        break
      default:
        rawData = dataByOrder
    }

    // 如果启用了工作时间拆分，处理数据
    const data = enableWorkTimeSplit
      ? splitAllTasksByWorkHours(rawData, effectiveWorkConfig)
      : rawData

    // 如果没有数据，返回空配置
    if (!data || data.length === 0) {
      return {
        title: {
          text: '甘特图',
          subtext: '暂无数据',
          left: 'center'
        },
        xAxis: { type: 'time' },
        yAxis: { type: 'category', data: [] },
        series: []
      }
    }

    // 按分组字段分组
    const groupedMap = data.reduce((acc, item) => {
      // 确保 group 字段存在
      const groupKey = item.group || '未分组'
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(item)
      return acc
    }, {} as Record<string, GanttItem[]>)

    // 获取所有分组名称并排序
    const groups = Object.keys(groupedMap).sort()

    // 为每个分组生成系列数据
    const series = groups.map((group, groupIndex) => {
      const tasks = groupedMap[group]

      return tasks.map(task => {
        const start = dayjs(task.start)
        const end = dayjs(task.end)

        return {
          name: task.name,
          value: [
            groupIndex,
            start.valueOf(),
            end.valueOf(),
            end.diff(start, 'hour')
          ],
          itemStyle: {
            // 根据订单分配颜色
            color: getColorByOrder(task.orderCode)
          },
          // 附加任务信息，用于点击事件和提示框
          taskData: task
        }
      })
    }).flat()

    // 找出整体时间范围
    const allTimes = data.flatMap(item => [
      dayjs(item.start).valueOf(),
      dayjs(item.end).valueOf()
    ])
    const minTime = Math.min(...allTimes)
    const maxTime = Math.max(...allTimes)

    return {
      title: {
        text: '甘特图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const task = params.data.taskData
          if (!task) return ''

          const start = dayjs(task.start).format('MM-DD HH:mm')
          const end = dayjs(task.end).format('MM-DD HH:mm')
          const duration = params.data.value[3]

          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${task.name}</div>
            <div>任务编码: ${task.taskCode}</div>
            <div>工序编码: ${task.processCode}</div>
            <div>订单: ${task.orderCode} - ${task.orderName}</div>
            <div>班组: ${task.teamCode} - ${task.teamName}</div>
            <div>工位: ${task.stationCode} - ${task.stationName}</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
              开始: ${start}<br/>
              结束: ${end}<br/>
              时长: ${duration} 小时
            </div>
          `
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: 120,
        right: 50,
        top: 60,
        bottom: 60,
        containLabel: false
      },
      xAxis: {
        type: 'time',
        ...getTimeRange(timeScale, minTime, maxTime),
        axisLabel: {
          formatter: (value: number) => {
            if (timeScale === 'day') {
              return dayjs(value).format('HH:mm')
            } else if (timeScale === 'week') {
              return dayjs(value).format('ddd HH:mm')
            }
            return dayjs(value).format('MM-DD HH:mm')
          },
          rotate: 45
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#E8E8E8',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: groups,
        axisLabel: {
          width: 100,
          overflow: 'truncate',
          ellipsis: '...'
        },
        axisTick: {
          show: false
        },
        axisLine: {
          show: true
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#E8E8E8'
          }
        }
      },
      series: [
        {
          type: 'custom',
          clip: true,  // 裁剪超出图表区域的部分
          renderItem: (params: any, api: any) => {
            const categoryIndex = api.value(0)
            const startTime = api.value(1)
            const endTime = api.value(2)

            // 获取当前坐标系的范围
            const coordSys = params.coordSys
            const xAxisStart = coordSys.x
            const xAxisEnd = coordSys.x + coordSys.width

            const start = api.coord([startTime, categoryIndex])
            const end = api.coord([endTime, categoryIndex])
            const height = api.size([0, 1])[1] * 0.6

            // 限制任务条在可见区域内
            const clampedStartX = Math.max(start[0], xAxisStart)
            const clampedEndX = Math.min(end[0], xAxisEnd)
            const width = Math.max(clampedEndX - clampedStartX, 2)

            // 如果任务完全在可见区域外，不渲染
            if (clampedEndX <= xAxisStart || clampedStartX >= xAxisEnd) {
              return null
            }

            // 获取颜色，添加空值检查
            const color = params.data?.itemStyle?.color || '#5470C6'

            return {
              type: 'rect',
              shape: {
                x: clampedStartX,
                y: start[1] - height / 2,
                width: width,
                height: height
              },
              style: {
                fill: color
              }
            }
          },
          encode: {
            x: [1, 2],
            y: 0
          },
          data: series
        }
      ]
    }
  }, [groupMode, dataByStation, dataByTeam, dataByOrder, timeScale, enableWorkTimeSplit, effectiveWorkConfig])

  const onChartClick = (params: any) => {
    if (params.data?.taskData && onTaskClick) {
      onTaskClick(params.data.taskData)
    }
  }

  return (
    <Card
      title="甘特图"
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio.Group value={groupMode} onChange={(e) => setGroupMode(e.target.value)}>
            <Radio.Button value="order">按订单分组</Radio.Button>
            <Radio.Button value="station">按工位分组</Radio.Button>
            <Radio.Button value="team">按班组分组</Radio.Button>
          </Radio.Group>
          <Divider type="vertical" />
          <Radio.Group value={timeScale} onChange={(e) => setTimeScale(e.target.value)}>
            <Radio.Button value="day">日视图</Radio.Button>
            <Radio.Button value="week">周视图</Radio.Button>
            <Radio.Button value="month">月视图</Radio.Button>
          </Radio.Group>
          <Divider type="vertical" />
          <Tooltip title="按工作时间拆分任务（8:00-12:00, 14:00-18:00）">
            <Switch
              checked={enableWorkTimeSplit}
              onChange={setEnableWorkTimeSplit}
              checkedChildren="工时"
              unCheckedChildren="连续"
            />
          </Tooltip>
        </div>
      }
    >
      <ReactECharts
        option={option}
        style={{ height: '600px', width: '100%' }}
        onEvents={{
          click: onChartClick
        }}
      />
    </Card>
  )
}

export default GanttChartView
