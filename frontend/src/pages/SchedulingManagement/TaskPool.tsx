import React, { useState, useEffect } from 'react'
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
  Modal
} from 'antd'
import {
  ContainerOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  RollbackOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { ORDER_TYPE_OPTIONS } from '../../config/dictionaries'

const { Title } = Typography
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

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

const TaskPool: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProductionTask[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ orderCode: '', productCode: '' })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [withdrawing, setWithdrawing] = useState(false)

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
    </div>
  )
}

export default TaskPool
