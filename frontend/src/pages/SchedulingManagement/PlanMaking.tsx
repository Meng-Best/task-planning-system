import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Typography,
  Empty,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Badge,
  Spin,
  Button,
  message,
  Modal
} from 'antd'
import {
  DeploymentUnitOutlined,
  ApartmentOutlined,
  ClusterOutlined,
  ReloadOutlined,
  FieldTimeOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { ORDER_TYPE_OPTIONS, PRODUCTION_TASK_STATUS_OPTIONS } from '../../config/dictionaries'

const { Text, Title } = Typography
const { RangePicker } = DatePicker
const API_BASE_URL = 'http://localhost:3001'

interface Product {
  id: number
  code: string
  name: string
  type?: string
  routings?: {
    routing: {
      id: number
      code: string
      name: string
      processes?: { id: number; seq: number; code: string; name: string }[]
    }
  }[]
}

interface ScheduleStep {
  id: number
  seq: number
  type: number
  productId?: number
  product?: Product
  name?: string
}

interface ProductionTask {
  id: number
  code: string
  orderId: number
  productId: number
  quantity: number
  status: number
  deadline: string
  order: {
    code: string
    name: string
    type: number
  }
  product: Product
  steps: ScheduleStep[]
}

const PlanMaking: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 9, total: 0 })
  const [stats, setStats] = useState({ pending: 0, scheduling: 0 })
  const [revertingId, setRevertingId] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<{
    orderCode?: string
    productCode?: string
    deadline?: [dayjs.Dayjs, dayjs.Dayjs] | null
  }>({ deadline: null })

  const fetchData = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const params: any = {
        current: page,
        pageSize
      }

      params.status = 1 // 只显示已拆分
      if (filters.orderCode) params.orderCode = filters.orderCode
      if (filters.productCode) params.productCode = filters.productCode
      if (filters.deadline && filters.deadline.length === 2) {
        params.deadlineStart = filters.deadline[0].startOf('day').toISOString()
        params.deadlineEnd = filters.deadline[1].endOf('day').toISOString()
      }

      const response = await axios.get(`${API_BASE_URL}/api/production-tasks/with-schedule`, { params })
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize: size, pendingCount, schedulingCount } = response.data.data
        setTasks(list)
        setPagination({ current, pageSize: size, total })
        setStats({ pending: pendingCount, scheduling: schedulingCount })
      }
    } catch (error) {
      // 静默失败，页面内展示 Empty/卡片
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => fetchData(1)
  const handleReset = () => {
    setFilters({ orderCode: undefined, productCode: undefined, deadline: null })
    fetchData(1)
  }

  const handleRevert = (taskId: number) => {
    Modal.confirm({
      title: '确认打回拆分？',
      content: '将删除该任务的所有拆分步骤，并把任务退回“待拆分”清单。',
      okText: '打回',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setRevertingId(taskId)
        try {
          await axios.delete(`${API_BASE_URL}/api/schedules/${taskId}`)
          message.success('已打回到待拆分')
          fetchData()
        } catch (error: any) {
          message.error(error?.response?.data?.message || '打回失败')
        } finally {
          setRevertingId(null)
        }
      }
    })
  }

  const renderRouteBox = (p?: Product) => {
    const routings = p?.routings || []
    const hasRouting = routings.length > 0
    const display = routings.slice(0, 2)

    return (
      <div
        style={{
          width: 240,
          padding: '12px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, 
            height: 24, 
            borderRadius: 6, 
            background: '#f5f3ff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <ApartmentOutlined style={{ color: '#8b5cf6', fontSize: 12 }} />
          </div>
          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
            工艺路线
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hasRouting ? (
            display.map((r) => (
              <div key={r.routing.id} style={{ 
                padding: '10px 12px', 
                background: '#fcfcfd', 
                border: '1px solid #f1f5f9',
                borderRadius: 8,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>编码:</Text>
                  <span className="business-code" style={{ fontSize: 11, color: '#5b21b6', padding: '1px 6px', fontWeight: 600 }}>
                    {r.routing.code}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>名称:</Text>
                  <Text strong style={{ fontSize: 12, color: '#4c1d95', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }} title={r.routing.name}>
                    {r.routing.name}
                  </Text>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '12px 0', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>
              <Text type="secondary" italic style={{ fontSize: 11 }}>未配置路线</Text>
            </div>
          )}
          
          {hasRouting && routings.length > 2 && (
            <div style={{ 
              textAlign: 'center', 
              paddingTop: 2,
              borderTop: '1px dashed #f1f5f9'
            }}>
              <Text type="secondary" style={{ fontSize: 10 }}>
                其余 {routings.length - 2} 条路线已隐藏
              </Text>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderProcessBox = (p?: Product) => {
    const routings = p?.routings || []
    if (!routings.length) return null

    const primary = routings[0].routing
    const processes = primary.processes || []

    return (
      <div
        style={{
          flex: 1,
          minWidth: 400,
          padding: '12px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          fontSize: 13,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 24, 
              height: 24, 
              borderRadius: 6, 
              background: '#eff6ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <ClusterOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
            </div>
            <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
              工序流转
            </Text>
          </div>
          {routings.length > 1 && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              共 {routings.length} 条路由，仅展其一
            </Text>
          )}
        </div>
        
        <div 
          style={{ 
            overflowX: 'auto', 
            padding: '4px 0 8px 0',
            display: 'flex', 
            alignItems: 'flex-start'
          }}
        >
          {processes.length > 0 ? (
            processes.map((proc, index) => (
              <div key={proc.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  width: 130,
                  position: 'relative'
                }}>
                  {/* Connector Line */}
                  {index < processes.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: 15,
                      left: 80,
                      width: 100,
                      height: 2,
                      background: 'linear-gradient(to right, #3b82f6, #e2e8f0)',
                      zIndex: 1
                    }}>
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: -3,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: '6px solid #e2e8f0'
                      }} />
                    </div>
                  )}
                  
                  {/* Node */}
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '2px solid #3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                    fontWeight: 700,
                    fontSize: 12,
                    zIndex: 2,
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.12)',
                    transition: 'all 0.2s'
                  }}>
                    {proc.seq}
                  </div>
                  
                  {/* Labels */}
                  <div style={{ marginTop: 8, textAlign: 'center', width: '100%', padding: '0 4px' }}>
                    <div className="business-code" style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '1px 6px' }} title={proc.code}>
                      {proc.code}
                    </div>
                    <div style={{ 
                      color: '#475569', 
                      fontSize: 10, 
                      marginTop: 4,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: 28,
                      fontWeight: 500
                    }}>
                      {proc.name}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '16px 0', width: '100%', textAlign: 'center' }}>
              <Text type="secondary" italic style={{ fontSize: 12 }}>未配置工序</Text>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderProductCard = (p: Product | undefined, typeLabel: string, typeColor: string, defaultCode: string, defaultName: string) => (
    <div
      style={{
        width: 240,
        padding: '12px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 24, 
            height: 24, 
            borderRadius: 6, 
            background: typeColor === 'blue' ? '#eff6ff' : '#ecfdf5',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {typeColor === 'blue' ? (
              <DeploymentUnitOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
            ) : (
              <ClusterOutlined style={{ color: '#10b981', fontSize: 12 }} />
            )}
          </div>
          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
            {typeLabel}
          </Text>
        </div>
        {p?.type && (
          <Tag color="geekblue" style={{ fontSize: 10, margin: 0, borderRadius: 4, padding: '0 6px', opacity: 0.8 }}>
            {p.type}
          </Tag>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ 
          padding: '10px 12px', 
          background: '#fcfcfd', 
          border: '1px solid #f1f5f9',
          borderRadius: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>编码:</Text>
            <span className="business-code" style={{ fontSize: 11, color: typeColor === 'blue' ? '#1e40af' : '#065f46', padding: '1px 6px' }}>
              {p?.code || defaultCode}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>名称:</Text>
            <Text strong style={{ fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p?.name || defaultName}>
              {p?.name || defaultName}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAssemblyNode = (task: ProductionTask) => {
    const assemblyStep =
      task.steps.find(step => step.type === 1) || ({
        type: 1,
        product: task.product,
        name: `${task.product.name}总装`
      } as ScheduleStep)

    return (
      <div style={{ display: 'flex', gap: 20, position: 'relative', paddingBottom: 0 }}>
        <div style={{ 
          width: 32, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center'
        }}>
          <div style={{ 
            width: 28, 
            height: 28, 
            borderRadius: '50%', 
            background: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            zIndex: 2,
            boxShadow: '0 0 0 4px #eff6ff',
            fontSize: 12
          }}>
            <DeploymentUnitOutlined />
          </div>
          <div style={{ 
            flex: 1, 
            width: 2, 
            background: 'linear-gradient(to bottom, #3b82f6 0%, #e2e8f0 100%)', 
            margin: '2px 0' 
          }} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14, color: '#1e293b' }}>总装阶段（需等待部装阶段完成）</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>
            {renderProductCard(assemblyStep.product, '总装产品', 'blue', task.product.code, task.product.name)}
            {renderRouteBox(assemblyStep.product)}
            {renderProcessBox(assemblyStep.product)}
          </div>
        </div>
      </div>
    )
  }

  const renderSegmentNodes = (task: ProductionTask) => {
    const segments = task.steps.filter(step => step.type === 0)
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ 
            width: 32, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center'
          }}>
            <div style={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%', 
              background: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
              zIndex: 2,
              boxShadow: '0 0 0 4px #ecfdf5',
              fontSize: 12
            }}>
              <ClusterOutlined />
            </div>
          </div>
          <div style={{ flex: 1, marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14, color: '#1e293b' }}>部装阶段（各舱段间不区分先后顺序）</Text>
            {segments.length === 0 && <Tag color="orange" style={{ marginLeft: 12, fontSize: 11 }}>未配置舱段</Tag>}
          </div>
        </div>

        <div style={{ marginLeft: 15, borderLeft: '2px solid #e2e8f0', paddingLeft: 37, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {segments.map((segment, idx) => (
            <div key={segment.id || idx} style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: -37, 
                top: 20, 
                width: 37, 
                height: 2, 
                background: '#e2e8f0' 
              }} />
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>
                {renderProductCard(segment.product, '部装产品', 'green', '未配置编码', '未配置名称')}
                {renderRouteBox(segment.product)}
                {renderProcessBox(segment.product)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const taskCards = useMemo(() => {
    if (tasks.length === 0) {
      return (
        <Col span={24}>
          <Empty
            style={{ padding: '60px 0' }}
            description={<Text type="secondary">暂无拆分后的生产任务</Text>}
          />
        </Col>
      )
    }

    return tasks.map(task => {
      const statusConfig = PRODUCTION_TASK_STATUS_OPTIONS.find(opt => opt.value === task.status)
      const orderTypeConfig = ORDER_TYPE_OPTIONS.find(opt => opt.value === task.order.type)
      const segments = task.steps.filter(step => step.type === 0)

      const isExpanded = expandedIds.has(task.id)
      return (
        <Col key={task.id} span={24}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 12,
                  width: '100%'
                }}
              >
                <Badge color="#1890ff" />
                <Text strong className="business-code">
                  {task.code}
                </Text>
                <Tag color={orderTypeConfig?.color || 'default'}>{orderTypeConfig?.label || '订单'}</Tag>
                <Tag color={statusConfig?.color || 'default'}>{statusConfig?.label || '未知状态'}</Tag>
                {segments.length === 0 && <Tag color="orange">拆分不完整</Tag>}
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                  订单: {task.order.name} ({task.order.code})
                </span>
              </div>
            }
            extra={
              <Space size={12}>
                <Space size={8}>
                  <FieldTimeOutlined style={{ color: '#999' }} />
                  <Text style={{ color: dayjs(task.deadline).isBefore(dayjs()) ? '#ff4d4f' : '#666' }}>
                    订单截至日期：{dayjs(task.deadline).format('YYYY-MM-DD')}
                  </Text>
                </Space>
                <Button
                  danger
                  size="small"
                  loading={revertingId === task.id}
                  onClick={() => handleRevert(task.id)}
                >
                  打回拆分
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setExpandedIds(prev => {
                      const next = new Set(prev)
                      if (next.has(task.id)) {
                        next.delete(task.id)
                      } else {
                        next.add(task.id)
                      }
                      return next
                    })
                  }}
                >
                  {isExpanded ? '收起' : '展开'}
                </Button>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
            className="shadow-sm border-none overflow-hidden"
            style={{ borderRadius: 12 }}
          >
            <div style={{ padding: '16px 24px' }}>
              {/* Content of the card header if needed, but it's already in title/extra */}
            </div>
            {isExpanded && (
              <div style={{ 
                padding: '16px 24px', 
                background: '#fcfcfd', 
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                {renderAssemblyNode(task)}
                {renderSegmentNodes(task)}
              </div>
            )}
          </Card>
        </Col>
      )
    })
  }, [tasks, expandedIds, revertingId])

  return (
    <div className="flex flex-col gap-4 p-2">
      <Card className="shadow-sm border-none">
        <div className="flex items-center justify-between">
          <Space>
            <DeploymentUnitOutlined className="text-blue-500" style={{ fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>
              生产计划总览
            </Title>
          </Space>
        </div>
      </Card>

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
          <Col flex="420px">
            <Space style={{ width: '100%' }} align="center">
              <span style={{ color: '#595959', minWidth: 80, textAlign: 'right' }}>截止日期：</span>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.deadline || undefined}
                onChange={value => setFilters(prev => ({ ...prev, deadline: value as any }))}
              />
            </Space>
          </Col>
          <Col flex="auto" className="flex justify-end">
            <Space>
              <Button type="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>{taskCards}</Row>
      </Spin>
    </div>
  )
}

export default PlanMaking
