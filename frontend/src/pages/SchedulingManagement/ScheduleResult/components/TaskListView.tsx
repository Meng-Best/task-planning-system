import { Card, Radio, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import type { GanttItem } from '../types'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TaskListViewProps {
  dataByStation: GanttItem[]
  dataByTeam: GanttItem[]
  dataByOrder: GanttItem[]
  onTaskClick?: (task: GanttItem) => void
}

type GroupMode = 'station' | 'team' | 'order'

const TaskListView: React.FC<TaskListViewProps> = ({
  dataByStation,
  dataByTeam,
  dataByOrder,
  onTaskClick
}) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('order')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const getCurrentData = () => {
    switch (groupMode) {
      case 'station':
        return dataByStation
      case 'team':
        return dataByTeam
      case 'order':
        return dataByOrder
      default:
        return dataByOrder
    }
  }

  // 根据分组模式获取分组编码
  const getGroupCode = (record: GanttItem) => {
    switch (groupMode) {
      case 'station':
        return record.stationCode
      case 'team':
        return record.teamCode
      case 'order':
        return record.orderCode
      default:
        return record.orderCode
    }
  }

  // 根据分组模式获取分组名称（用于Tooltip）
  const getGroupName = (record: GanttItem) => {
    switch (groupMode) {
      case 'station':
        return record.stationName
      case 'team':
        return record.teamName
      case 'order':
        return record.orderName
      default:
        return record.orderName
    }
  }

  const columns: ColumnsType<GanttItem> = [
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      fixed: 'left',
      render: (_, record) => (
        <Tooltip title={getGroupName(record)}>
          <Tag color="blue">{getGroupCode(record)}</Tag>
        </Tooltip>
      )
    },
    {
      title: '订单',
      dataIndex: 'orderName',
      key: 'orderName',
      width: 150,
      render: (text, record) => (
        <Tooltip title={record.orderCode}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '任务',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Tooltip title={`${record.taskCode} - ${record.processCode}`}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '开始时间',
      dataIndex: 'start',
      key: 'start',
      width: 150,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '结束时间',
      dataIndex: 'end',
      key: 'end',
      width: 150,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '时长',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        const hours = dayjs(record.end).diff(dayjs(record.start), 'hour')
        const days = Math.floor(hours / 24)
        const remainHours = hours % 24
        return days > 0 ? `${days}天${remainHours}时` : `${remainHours}时`
      }
    },
    {
      title: '班组',
      dataIndex: 'teamName',
      key: 'teamName',
      width: 120,
      render: (_, record) => (
        <Tag color="green">{record.teamCode}</Tag>
      )
    },
    {
      title: '工位',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 150,
      render: (_, record) => (
        <Tag color="purple">{record.stationCode}</Tag>
      )
    }
  ]

  // 按分组字段对数据进行分组
  const groupedData = getCurrentData().reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, GanttItem[]>)

  // 转换为表格数据，添加分组标记
  const tableData = Object.entries(groupedData).flatMap(([, items]) => {
    return items
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((item, index) => ({
        ...item,
        isGroupStart: index === 0
      }))
  })

  return (
    <Card
      title="任务列表"
      extra={
        <Radio.Group value={groupMode} onChange={(e) => {
          setGroupMode(e.target.value)
          setCurrentPage(1) // 切换分组模式时重置页码
        }}>
          <Radio.Button value="order">按订单分组</Radio.Button>
          <Radio.Button value="station">按工位分组</Radio.Button>
          <Radio.Button value="team">按班组分组</Radio.Button>
        </Radio.Group>
      }
    >
      <Table
        size="small"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          pageSizeOptions: [20, 50, 100, 200],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条任务`,
          onChange: (page, size) => {
            setCurrentPage(page)
            setPageSize(size)
          }
        }}
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onClick: () => onTaskClick?.(record),
          style: { cursor: onTaskClick ? 'pointer' : 'default' }
        })}
      />
    </Card>
  )
}

export default TaskListView
