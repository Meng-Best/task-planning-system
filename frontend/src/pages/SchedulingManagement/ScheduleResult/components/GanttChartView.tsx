import { Card, Radio } from 'antd'
import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { GanttItem } from '../types'
import dayjs from 'dayjs'

interface GanttChartViewProps {
  dataByStation: GanttItem[]
  dataByTeam: GanttItem[]
  dataByOrder: GanttItem[]
  onTaskClick?: (task: GanttItem) => void
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
  onTaskClick
}) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('order')

  const option = useMemo(() => {
    // 根据当前分组模式获取数据
    let data: GanttItem[] = []
    switch (groupMode) {
      case 'station':
        data = dataByStation
        break
      case 'team':
        data = dataByTeam
        break
      case 'order':
        data = dataByOrder
        break
      default:
        data = dataByOrder
    }

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
        min: minTime,
        max: maxTime,
        axisLabel: {
          formatter: (value: number) => {
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
          renderItem: (params: any, api: any) => {
            const categoryIndex = api.value(0)
            const start = api.coord([api.value(1), categoryIndex])
            const end = api.coord([api.value(2), categoryIndex])
            const height = api.size([0, 1])[1] * 0.6

            // 获取颜色，添加空值检查
            const color = params.data?.itemStyle?.color || '#5470C6'

            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
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
  }, [groupMode, dataByStation, dataByTeam, dataByOrder])

  const onChartClick = (params: any) => {
    if (params.data?.taskData && onTaskClick) {
      onTaskClick(params.data.taskData)
    }
  }

  return (
    <Card
      title="甘特图"
      extra={
        <Radio.Group value={groupMode} onChange={(e) => setGroupMode(e.target.value)}>
          <Radio.Button value="order">按订单分组</Radio.Button>
          <Radio.Button value="station">按工位分组</Radio.Button>
          <Radio.Button value="team">按班组分组</Radio.Button>
        </Radio.Group>
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
