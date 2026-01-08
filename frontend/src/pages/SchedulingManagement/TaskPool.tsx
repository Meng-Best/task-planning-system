import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Row,
  Col,
  Statistic,
  message,
  Typography,
  Modal,
  Segmented,
  Empty,
  Collapse
} from 'antd'
import {
  ContainerOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  RollbackOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CaretRightOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import * as XLSX from 'xlsx'
import { ORDER_TYPE_OPTIONS } from '../../config/dictionaries'

dayjs.extend(isoWeek)

const { Title } = Typography
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface ProductionTask {
  id: number
  code: string
  orderId: number
  productId: number
  quantity: number
  status: number
  deadline: string
  order: {
    id: number
    code: string
    name: string
    type: number
  }
  product: {
    id: number
    code: string
    name: string
  }
  steps: Array<{
    id: number
    seq: number
    type: number
    product?: { id: number; code: string; name: string }
  }>
}

// output.json 中的任务计划类型
interface TaskPlan {
  'order code': string
  order_name: string
  product_code: string
  product_name: string
  'task id': string
  task_code: string
  process_code: string
  name: string
  planstart: string
  planend: string
  'team id': string
  team_code: string
  'team name': string
  'station id': string
  'station code': string
  'station name': string
  'machine id': string
  machine_code: string
  machine_name: string
}

interface OutputData {
  best_order_sequence: string[]
  product_order_plan: Array<{
    'Order code': string
    'Order name': string
    planstart: string
    planend: string
  }>
  task_plan: TaskPlan[]
}

// 按日期分组的任务
interface DayTasks {
  date: string
  dayLabel: string
  tasks: TaskPlan[]
}

type TimeRange = 'week' | 'month' | 'all'

const TaskPool: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProductionTask[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ orderCode: '', productCode: '' })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [withdrawing, setWithdrawing] = useState(false)

  // 看板相关状态
  const [scheduleData, setScheduleData] = useState<OutputData | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  // 加载排程结果数据
  const fetchScheduleData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schedules/output/result`)
      if (response.data.status === 'ok') {
        setScheduleData(response.data.data)
      }
    } catch {
      console.warn('无法加载排程数据')
    }
  }

  // 获取星期几的中文标签
  const getWeekdayLabel = (date: dayjs.Dayjs): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.day()]
  }

  // 获取日期的相对标签（今天/明天/后天）
  const getRelativeLabel = (date: dayjs.Dayjs): string => {
    const today = dayjs().startOf('day')
    const diff = date.startOf('day').diff(today, 'day')
    if (diff === 0) return '今天'
    if (diff === 1) return '明天'
    if (diff === 2) return '后天'
    return ''
  }

  // 按日期分组任务数据
  const groupedTasks = useMemo((): DayTasks[] => {
    if (!scheduleData?.task_plan?.length) return []

    const taskPlan = scheduleData.task_plan
    const today = dayjs().startOf('day')

    // 根据时间范围过滤
    let filteredTasks = taskPlan
    if (timeRange === 'week') {
      const weekEnd = today.endOf('isoWeek')
      filteredTasks = taskPlan.filter(task => {
        const taskDate = dayjs(task.planstart)
        return taskDate.isBefore(weekEnd.add(1, 'day')) && taskDate.isAfter(today.subtract(1, 'day'))
      })
    } else if (timeRange === 'month') {
      const monthEnd = today.endOf('month')
      filteredTasks = taskPlan.filter(task => {
        const taskDate = dayjs(task.planstart)
        return taskDate.isBefore(monthEnd.add(1, 'day')) && taskDate.isAfter(today.subtract(1, 'day'))
      })
    }

    // 按日期分组
    const grouped: Record<string, TaskPlan[]> = {}
    filteredTasks.forEach(task => {
      const dateKey = dayjs(task.planstart).format('YYYY-MM-DD')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })

    // 转换为数组并排序
    return Object.keys(grouped)
      .sort()
      .map(date => {
        const d = dayjs(date)
        const relative = getRelativeLabel(d)
        const weekday = getWeekdayLabel(d)
        return {
          date,
          dayLabel: relative ? `${date} ${weekday} (${relative})` : `${date} ${weekday}`,
          tasks: grouped[date].sort((a, b) =>
            dayjs(a.planstart).valueOf() - dayjs(b.planstart).valueOf()
          )
        }
      })
  }, [scheduleData, timeRange])

  // 导出 Excel
  const handleExportExcel = () => {
    if (!groupedTasks.length) {
      message.warning('没有可导出的数据')
      return
    }

    // 准备导出数据
    const exportData: Array<Record<string, string>> = []
    groupedTasks.forEach(day => {
      day.tasks.forEach(task => {
        const startTime = dayjs(task.planstart).format('HH:mm')
        const endTime = dayjs(task.planend).isSame(dayjs(task.planstart), 'day')
          ? dayjs(task.planend).format('HH:mm')
          : '18:00'
        exportData.push({
          '日期': day.date,
          '时间': `${startTime}-${endTime}`,
          '工序名称': task.name,
          '产品名称': task.product_name,
          '班组': task['team name'],
          '工位': task['station name']
        })
      })
    })

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '任务日历')

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, // 日期
      { wch: 14 }, // 时间
      { wch: 25 }, // 工序名称
      { wch: 25 }, // 产品名称
      { wch: 15 }, // 班组
      { wch: 25 }  // 工位
    ]

    // 导出文件
    const rangeLabel = timeRange === 'week' ? '本周' : timeRange === 'month' ? '本月' : '全部'
    XLSX.writeFile(wb, `任务日历_${rangeLabel}_${dayjs().format('YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  }

  const fetchData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { current: page, pageSize }
      if (filters.orderCode) params.orderCode = filters.orderCode
      if (filters.productCode) params.productCode = filters.productCode

      const response = await axios.get(`${API_BASE_URL}/api/production-tasks/pending-production`, { params })
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize: size } = response.data.data
        setData(list)
        setPagination({ current, pageSize: size, total })
        setSelectedRowKeys([])
      }
    } catch (error) {
      message.error('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchScheduleData()
  }, [])

  const handleSearch = () => fetchData(1)
  const handleReset = () => {
    setFilters({ orderCode: '', productCode: '' })
    fetchData(1)
  }

  // 撤回单个任务
  const handleWithdraw = (taskId: number) => {
    Modal.confirm({
      title: '确认撤回任务',
      icon: <ExclamationCircleOutlined />,
      content: '撤回后任务将回到"已拆分"状态，可重新参与排程。确认撤回？',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/schedules/withdraw`, {
            taskIds: [taskId]
          })
          if (response.data.status === 'ok') {
            message.success('任务已撤回')
            fetchData(pagination.current, pagination.pageSize)
            fetchScheduleData() // 刷新看板数据
          }
        } catch (error) {
          message.error('撤回失败')
        }
      }
    })
  }

  // 批量撤回
  const handleBatchWithdraw = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要撤回的任务')
      return
    }

    Modal.confirm({
      title: '确认批量撤回',
      icon: <ExclamationCircleOutlined />,
      content: `确认撤回选中的 ${selectedRowKeys.length} 个任务？撤回后任务将回到"已拆分"状态。`,
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        setWithdrawing(true)
        try {
          const response = await axios.post(`${API_BASE_URL}/api/schedules/withdraw`, {
            taskIds: selectedRowKeys
          })
          if (response.data.status === 'ok') {
            message.success(`成功撤回 ${response.data.data.withdrawnCount} 个任务`)
            fetchData(pagination.current, pagination.pageSize)
            fetchScheduleData() // 刷新看板数据
          }
        } catch (error) {
          message.error('批量撤回失败')
        } finally {
          setWithdrawing(false)
        }
      }
    })
  }

  const columns = [
    {
      title: '任务编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string) => <span className="business-code">{code}</span>
    },
    {
      title: '订单编号',
      dataIndex: ['order', 'code'],
      key: 'orderCode',
      width: 150,
      render: (code: string) => <span className="business-code">{code}</span>
    },
    {
      title: '订单名称',
      dataIndex: ['order', 'name'],
      key: 'orderName',
      width: 150,
      ellipsis: true
    },
    {
      title: '订单类型',
      dataIndex: ['order', 'type'],
      key: 'orderType',
      width: 100,
      render: (type: number) => {
        const config = ORDER_TYPE_OPTIONS.find(opt => opt.value === type)
        return <Tag color={config?.color}>{config?.label}</Tag>
      }
    },
    {
      title: '产品编号',
      dataIndex: ['product', 'code'],
      key: 'productCode',
      width: 140,
      render: (code: string) => <span className="business-code">{code}</span>
    },
    {
      title: '产品名称',
      dataIndex: ['product', 'name'],
      key: 'productName',
      width: 200,
      ellipsis: true
    },
    {
      title: '舱段数',
      dataIndex: 'steps',
      key: 'stepCount',
      width: 80,
      render: (steps: ProductionTask['steps']) => (
        <Tag color="blue">{steps?.filter(s => s.type === 0).length || 0}</Tag>
      )
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string) => {
        const isPast = dayjs(date).isBefore(dayjs())
        return (
          <span className={isPast ? 'text-red-500 font-medium' : ''}>
            {dayjs(date).format('YYYY-MM-DD')}
          </span>
        )
      }
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          待生产
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ProductionTask) => (
        <Button
          type="link"
          size="small"
          icon={<RollbackOutlined />}
          onClick={() => handleWithdraw(record.id)}
        >
          撤回
        </Button>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card className="shadow-sm border-none">
            <Statistic
              title="生产任务池总数"
              value={pagination.total}
              prefix={<ContainerOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选条件 */}
      <Card className="shadow-sm border-none" styles={{ body: { padding: 12 } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col flex="300px">
            <Space style={{ width: '100%' }} align="center">
              <span style={{ color: '#595959', minWidth: 80, textAlign: 'right' }}>订单编号：</span>
              <Input
                allowClear
                placeholder="请输入订单编号"
                value={filters.orderCode}
                onChange={e => setFilters(prev => ({ ...prev, orderCode: e.target.value }))}
              />
            </Space>
          </Col>
          <Col flex="300px">
            <Space style={{ width: '100%' }} align="center">
              <span style={{ color: '#595959', minWidth: 80, textAlign: 'right' }}>产品编号：</span>
              <Input
                allowClear
                placeholder="请输入产品编号"
                value={filters.productCode}
                onChange={e => setFilters(prev => ({ ...prev, productCode: e.target.value }))}
              />
            </Space>
          </Col>
          <Col flex="auto" className="flex justify-end">
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card
        title={
          <Space>
            <ContainerOutlined className="text-green-500" style={{ fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>
              生产任务池
            </Title>
          </Space>
        }
        extra={
          <Button
            danger
            icon={<RollbackOutlined />}
            onClick={handleBatchWithdraw}
            disabled={selectedRowKeys.length === 0}
            loading={withdrawing}
          >
            批量撤回 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
          </Button>
        }
        className="shadow-sm border-none"
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1400 }}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条记录`,
            onChange: (page, size) => fetchData(page, size)
          }}
        />
      </Card>

      {/* 任务日历看板 - 仅当生产任务池有数据时显示 */}
      {data.length > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '4px',
                  height: '20px',
                  borderRadius: '2px',
                  background: 'linear-gradient(180deg, #1677ff 0%, #4096ff 100%)',
                  marginRight: '12px',
                }}
              />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
                任务日历看板
              </span>
              {groupedTasks.length > 0 && (
                <Tag color="blue" style={{ marginLeft: 12 }}>
                  {groupedTasks.reduce((sum, day) => sum + day.tasks.length, 0)} 个任务
                </Tag>
              )}
              <span style={{ marginLeft: 16, fontSize: 12, color: '#8c8c8c' }}>
                (工作时间 8:00-12:00, 14:00-18:00，午休 12:00-14:00)
              </span>
            </div>
          }
          extra={
            <Space>
              <Segmented
                value={timeRange}
                onChange={(value) => setTimeRange(value as TimeRange)}
                options={[
                  { label: '本周', value: 'week' },
                  { label: '本月', value: 'month' },
                  { label: '全部', value: 'all' }
                ]}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={groupedTasks.length === 0}
              >
                导出EXCEL
              </Button>
            </Space>
          }
          className="shadow-sm border-none"
          styles={{ body: { padding: '12px 24px 24px' } }}
        >
          {groupedTasks.length === 0 ? (
            <Empty description="暂无排程数据" />
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <Collapse
                bordered={false}
                defaultActiveKey={groupedTasks.slice(0, 3).map(d => d.date)}
                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                style={{ background: 'transparent' }}
                items={groupedTasks.map((day) => {
                  const isToday = dayjs(day.date).isSame(dayjs(), 'day')
                  return {
                    key: day.date,
                    style: {
                      marginBottom: 12,
                      background: isToday ? '#f6ffed' : '#fafafa',
                      borderRadius: 8,
                      border: isToday ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                    },
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CalendarOutlined style={{ color: isToday ? '#52c41a' : '#1890ff' }} />
                        <span style={{
                          fontWeight: 600,
                          color: isToday ? '#52c41a' : '#1890ff'
                        }}>
                          {day.dayLabel}
                        </span>
                        <Tag color={isToday ? 'success' : 'processing'}>
                          {day.tasks.length} 个任务
                        </Tag>
                      </div>
                    ),
                    children: (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 12
                      }}>
                        {day.tasks.map((task, index) => (
                          <div
                            key={`${task['task id']}-${index}`}
                            style={{
                              background: '#fff',
                              borderRadius: 8,
                              padding: '12px 14px',
                              border: '1px solid #e8e8e8',
                              transition: 'all 0.2s',
                              cursor: 'default',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                              e.currentTarget.style.borderColor = '#1890ff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = 'none'
                              e.currentTarget.style.borderColor = '#e8e8e8'
                            }}
                          >
                            {/* 第一行：工序名称 + 时间 */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8
                            }}>
                              <span style={{
                                fontWeight: 500,
                                color: '#262626',
                                fontSize: 14,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                marginRight: 8
                              }}>
                                {task.name}
                              </span>
                              <span style={{
                                color: '#52c41a',
                                fontWeight: 500,
                                fontSize: 13,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <ClockCircleOutlined />
                                {dayjs(task.planstart).format('HH:mm')}-{
                                  dayjs(task.planend).isSame(dayjs(task.planstart), 'day')
                                    ? dayjs(task.planend).format('HH:mm')
                                    : '18:00'
                                }
                              </span>
                            </div>
                            {/* 第二行：产品名称 */}
                            <div style={{
                              color: '#8c8c8c',
                              fontSize: 12,
                              marginBottom: 8,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {task.product_name}
                            </div>
                            {/* 第三行：班组 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#595959',
                              fontSize: 12,
                              marginBottom: 4
                            }}>
                              <TeamOutlined style={{ color: '#1890ff' }} />
                              <span>{task['team name']}</span>
                            </div>
                            {/* 第四行：工位 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#595959',
                              fontSize: 12
                            }}>
                              <EnvironmentOutlined style={{ color: '#faad14' }} />
                              <span>{task['station name']}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                })}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default TaskPool
