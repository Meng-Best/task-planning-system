import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Tabs,
  Space,
  message,
  Empty,
  Alert,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Popconfirm,
  Modal,
  Form,
  InputNumber
} from 'antd'
import {
  InfoCircleOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClusterOutlined,
  LinkOutlined,
  DisconnectOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'

import axios from 'axios'
import { 
  getStatusConfig, 
  BASIC_DATA_STATUS,
  STATION_TYPE_OPTIONS,
  getStationTypeLabel
} from '../../config/dictionaries'

const API_BASE_URL = 'http://localhost:3001'

interface ProductionLine {
  id: number
  code: string
  name: string
  type: number
  status: number
  factoryId: number
  factory?: {
    name: string
  }
}

interface Station {
  id: number
  code: string
  name: string
  type: number
  status: number
  _count?: {
    devices: number
    teams: number
  }
}

const ProductionLineManagement: React.FC = () => {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [loading, setLoading] = useState(false)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm] = Form.useForm()
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const [associatedStations, setAssociatedStations] = useState<Station[]>([])
  
  // 绑定工位相关的状态
  const [bindStationModalOpen, setBindStationModalOpen] = useState(false)
  const [unboundStations, setUnboundStations] = useState<Station[]>([])
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>([])
  const [bindingLoading, setBindingLoading] = useState(false)

  // 筛选状态
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [filterCode, setFilterCode] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)

  const LINE_TYPE_OPTIONS = [
    { value: 0, label: '部装' },
    { value: 1, label: '整装' }
  ]

  const normalizeType = (val: any): number => {
    const num = typeof val === 'number' ? val : parseInt(val ?? 0, 10)
    return [0, 1].includes(num) ? num : 0
  }

  // 1. 优先定义工具函数
  const renderStatusTag = (status: number) => {
    const config = getStatusConfig(status)
    return (
      <Tag
        color={config.bgColor}
        style={{
          color: config.textColor,
          borderColor: 'transparent',
          fontWeight: 600,
          borderRadius: '4px',
          padding: '0 10px',
          fontSize: '12px',
          height: '24px',
          lineHeight: '22px',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {config.label}
      </Tag>
    )
  }

  // 2. 定义表格列
  const lineColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: '12%', 
      render: (status: number) => renderStatusTag(status) 
    },
    { 
      title: '产线代码', 
      dataIndex: 'code', 
      key: 'code', 
      width: '18%',
      render: (val: string) => <span className="text-gray-700" style={{ fontWeight: 500 }}>{val}</span>
    },
    { 
      title: '产线名称', 
      dataIndex: 'name', 
      key: 'name',
      width: '25%',
      render: (val: string) => <span className="text-gray-800">{val}</span>
    },
    { 
      title: '所属工厂', 
      dataIndex: ['factory', 'name'], 
      key: 'factoryName', 
      width: '25%',
      render: (val: any) => val ? <span className="text-gray-600">{val}</span> : <span className="text-gray-400 italic">未指定</span> 
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      width: '10%',
      render: (val: number) => {
        const option = LINE_TYPE_OPTIONS.find(o => o.value === normalizeType(val))
        return <span className="text-gray-600">{option?.label || '-'}</span>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: '10%',
      render: (_: any, record: ProductionLine) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Popconfirm 
            title="确定删除此产线吗？" 
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const fetchLines = async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
    setFetchError(null)
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      }

      const sQuery = overrides?.query !== undefined ? overrides.query : filterQuery
      const sCode = overrides?.code !== undefined ? overrides.code : filterCode
      const sStatus = overrides?.status !== undefined ? overrides.status : filterStatus

      if (sQuery) params.name = sQuery
      if (sCode) params.code = sCode
      if (sStatus !== undefined) params.status = sStatus

      const response = await axios.get(`${API_BASE_URL}/api/production-lines`, { params })
      if (response.data && response.data.status === 'ok') {
        const { list, total, current, pageSize } = response.data.data
        setLines(list.map((item: any) => ({ ...item, key: item.id })))
        setPagination({ current, pageSize, total })
      }
    } catch (error: any) {
      setFetchError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchResources = useCallback(async (lineId: number) => {
    setResourcesLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/production-lines/${lineId}/resources`)
      if (response.data.status === 'ok') {
        setAssociatedStations(response.data.data.stations || [])
      }
    } catch (error: any) {
      console.error('Fetch resources failed:', error)
      message.error('获取产线关联工位失败')
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchLines(1) 
  }, [filterStatus])

  useEffect(() => {
    if (selectedLineId) fetchResources(selectedLineId)
  }, [selectedLineId, fetchResources])

  const handleRowClick = (record: ProductionLine) => { setSelectedLineId(record.id) }

  const handleEdit = (record: ProductionLine) => {
    setEditingLine(record)
    editForm.setFieldsValue({
      code: record.code,
      name: record.name,
      type: normalizeType(record.type),
      status: record.status,
      capacity: record.capacity
    })
    setEditModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/factories/line/${id}`)
      message.success('产线已删除')
      fetchLines()
      if (selectedLineId === id) setSelectedLineId(null)
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 打开绑定工位弹窗
  const handleOpenBindStationModal = async () => {
    try {
      // 获取所有工位，筛选出未绑定产线的
      const response = await axios.get(`${API_BASE_URL}/api/stations`, { params: { limit: 1000 } })
      if (response.data.status === 'ok') {
        const allStations = response.data.data.list
        setUnboundStations(allStations.filter((s: any) => !s.productionLineId))
        setSelectedStationIds([])
        setBindStationModalOpen(true)
      }
    } catch (error) {
      message.error('获取未绑定工位失败')
    }
  }

  const handleSaveLineEdit = async () => {
    try {
      if (!editingLine) return
      const values = await editForm.validateFields()
      const payload = {
        ...values,
        type: normalizeType(values.type),
        // 如果未填写产能，则沿用原值，避免后端 undefined 解析错误
        capacity: values.capacity !== undefined && values.capacity !== null
          ? values.capacity
          : editingLine.capacity
      }
      await axios.put(`${API_BASE_URL}/api/factories/line/${editingLine.id}`, payload)
      message.success('产线信息已更新')
      setEditModalOpen(false)
      setEditingLine(null)
      fetchLines()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error('保存失败')
    }
  }

  // 执行绑定工位
  const handleBindStations = async () => {
    if (selectedStationIds.length === 0) {
      message.warning('请选择要绑定的工位')
      return
    }
    setBindingLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/api/production-lines/${selectedLineId}/bind-stations`, {
        stationIds: selectedStationIds
      })
      message.success('工位绑定成功')
      setBindStationModalOpen(false)
      if (selectedLineId) fetchResources(selectedLineId)
      fetchLines() // 刷新列表以更新计数（如果有计数的话）
    } catch (error) {
      message.error('绑定失败')
    } finally {
      setBindingLoading(false)
    }
  }

  // 解绑工位
  const handleUnbindStation = async (stationId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/production-lines/${selectedLineId}/unbind-station`, {
        stationId
      })
      message.success('工位解绑成功')
      if (selectedLineId) fetchResources(selectedLineId)
      fetchLines()
    } catch (error) {
      message.error('解绑失败')
    }
  }

  // 统计数据
  const stats = {
    total: pagination.total,
    available: lines.filter(l => l.status === 0).length,
    unavailable: lines.filter(l => l.status === 1).length
  }

  const tabItems = [
    {
      key: 'stations',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ClusterOutlined /> 关联工位 ({associatedStations.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4 flex justify-end">
            <Button 
              type="primary" 
              icon={<LinkOutlined />} 
              onClick={handleOpenBindStationModal}
            >
              添加工位
            </Button>
          </div>
          <Table 
            dataSource={associatedStations} 
            rowKey="id" 
            loading={resourcesLoading} 
            size="middle" 
            pagination={false}
            columns={[
              { title: '状态', dataIndex: 'status', key: 'status', width: '10%', render: (s: number) => renderStatusTag(s) },
              { title: '工位编号', dataIndex: 'code', key: 'code', width: '15%' },
              { title: '工位名称', dataIndex: 'name', key: 'name', width: '25%' },
              { 
                title: '类型', 
                dataIndex: 'type', 
                key: 'type', 
                width: '12%',
                render: (type: number) => {
                  const config = STATION_TYPE_OPTIONS.find(opt => opt.value === type)
                  return <Tag color={config?.color || 'default'}>{config?.label || '未知'}</Tag>
                }
              },
              { title: '关联设备', key: 'deviceCount', width: '13%', render: (_: any, record: Station) => record._count?.devices || 0 },
              { title: '关联班组', key: 'teamCount', width: '13%', render: (_: any, record: Station) => record._count?.teams || 0 },
              { 
                title: '操作', 
                key: 'action', 
                width: '12%',
                render: (_: any, record: Station) => (
                  <Popconfirm 
                    title="确定解绑此工位？" 
                    onConfirm={() => handleUnbindStation(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger size="small" icon={<DisconnectOutlined />}>解绑</Button>
                  </Popconfirm>
                )
              }
            ]} 
          />
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* 统计看板 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic 
              title={<span className="text-gray-500 font-medium">产线总数</span>} 
              value={stats.total} 
              valueStyle={{ color: '#1890ff', fontWeight: 700 }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">可用</span>}
              value={stats.available} 
              valueStyle={{ color: '#52c41a', fontWeight: 700 }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">不可用</span>} 
              value={stats.unavailable} 
              valueStyle={{ color: '#ff4d4f', fontWeight: 700 }} 
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card className="shadow-sm border-none" styles={{ body: { padding: '16px' } }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space size="middle">
              <span className="text-gray-500">产线编号:</span>
              <Input 
                placeholder="搜索编号" 
                style={{ width: 150 }}
                allowClear
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                onPressEnter={() => fetchLines(1)}
              />
              <span className="text-gray-500 ml-2">产线名称:</span>
              <Input 
                placeholder="搜索名称" 
                style={{ width: 150 }}
                allowClear
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                onPressEnter={() => fetchLines(1)}
              />
              <span className="text-gray-500 ml-2">产线状态:</span>
              <Select 
                placeholder="全部状态" 
                style={{ width: 120 }} 
                allowClear
                value={filterStatus}
                onChange={setFilterStatus}
              >
                {BASIC_DATA_STATUS.map(s => (
                  <Select.Option key={s.value} value={s.value}>
                    <Space size={4}>
                      <span 
                        style={{ 
                          display: 'inline-block', 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: s.themeColor 
                        }} 
                      />
                      {s.label}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col flex="auto" className="flex justify-end">
            <Space size="middle">
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchLines(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterQuery('')
                setFilterCode('')
                setFilterStatus(undefined)
                fetchLines(1, pagination.pageSize, { query: '', code: '', status: undefined })
              }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 诊断警示框 */}
      {fetchError && (
        <Alert
          message="数据加载异常"
          description={fetchError}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => fetchLines(1)}>重试</Button>
          }
        />
      )}

      {/* 上部：产线列表 */}
      <Card 
        title={
          <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
            <Space size={12}>
              <ApartmentOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>产线列表</span>
            </Space>
          </div>
        }
        className="shadow-sm border-none"
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '0 20px' },
          body: { padding: '16px' } 
        }}
      >
        <Table
          dataSource={lines}
          columns={lineColumns}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ 
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            position: ['bottomLeft'],
            showTotal: (total) => `共 ${total} 条记录`,
            style: { marginLeft: '8px', marginTop: '16px' },
            onChange: (page, size) => fetchLines(page, size)
          }}
          onRow={(record) => {
            const status = typeof record.status === 'number' ? record.status : 0;
            const config = getStatusConfig(status) || { themeColor: '#d9d9d9', textColor: '#d9d9d9' };
            
            return {
              onClick: () => handleRowClick(record),
              className: `cursor-pointer transition-all ${selectedLineId === record.id ? 'selected-row' : ''}`,
              style: {
                borderLeft: `4px solid ${config.themeColor || config.textColor || '#d9d9d9'}`,
                marginBottom: '4px'
              }
            };
          }}
          locale={{ 
            emptyText: loading ? '数据加载中...' : <Empty description="暂无产线数据，请前往工厂管理创建" /> 
          }}
        />
      </Card>

      <Card 
        className="flex-1 shadow-sm border-none" 
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: '0 24px', minHeight: '300px' } 
        }}
      >
        {!selectedLineId ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <p className="text-sm">请在上方列表中点击选中一条产线</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="stations" items={tabItems} className="h-full" />
        )}
      </Card>

      {/* 绑定工位 Modal */}
      <Modal
        title="关联工位到产线"
        open={bindStationModalOpen}
        onOk={handleBindStations}
        onCancel={() => setBindStationModalOpen(false)}
        confirmLoading={bindingLoading}
        width={600}
        destroyOnHidden
      >
        <div className="mb-4 text-gray-500 italic flex items-center gap-2">
          <InfoCircleOutlined />
          <span>仅显示当前未绑定任何产线的工位</span>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择要绑定的工位"
          value={selectedStationIds}
          onChange={setSelectedStationIds}
          optionLabelProp="label"
        >
          {unboundStations.map(station => (
            <Select.Option key={station.id} value={station.id} label={station.name}>
              <div className="flex justify-between items-center">
                <span>{station.name}</span>
                <span className="text-gray-400 text-xs font-mono">[{station.code}]</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Modal>

      {/* 编辑产线 Modal */}
      <Modal
        title="编辑产线"
        open={editModalOpen}
        onOk={handleSaveLineEdit}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingLine(null)
          editForm.resetFields()
        }}
        destroyOnHidden
        width={520}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="产线代码" name="code">
            <Input disabled />
          </Form.Item>
          <Form.Item label="产线名称" name="name" rules={[{ required: true, message: '请输入产线名称' }]}>
            <Input placeholder="请输入产线名称" />
          </Form.Item>
          <Form.Item label="产线类型" name="type" rules={[{ required: true, message: '请选择产线类型' }]}>
            <Select placeholder="请选择产线类型" options={LINE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="标准产能(件/天)" name="capacity">
            <InputNumber min={1} max={10000} style={{ width: '100%' }} placeholder="可选，默认保持不变" />
          </Form.Item>
          <Form.Item label="产线状态" name="status" rules={[{ required: true, message: '请选择产线状态' }]}>
            <Select placeholder="请选择产线状态">
              {BASIC_DATA_STATUS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .selected-row {
          background-color: #e6f7ff !important;
          box-shadow: inset 0 0 10px rgba(24, 144, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
          z-index: 1;
          position: relative;
        }
        .ant-table-row {
          transition: all 0.3s;
        }
        .ant-table-row:hover { 
          cursor: pointer;
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  )
}

export default ProductionLineManagement
