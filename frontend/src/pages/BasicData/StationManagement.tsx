import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Tabs,
  Space,
  message,
  Row,
  Col,
  Statistic,
  Input,
  Modal,
  Form,
  Select,
  Popconfirm
} from 'antd'
import {
  InfoCircleOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ToolOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'

import axios from 'axios'
import { 
  getStatusConfig, 
  getDeviceTypeLabel, 
  BASIC_DATA_STATUS,
  STATION_TYPE_OPTIONS,
  getStationTypeLabel
} from '../../config/dictionaries'

const API_BASE_URL = 'http://localhost:3001'

interface Device {
  id: number
  code: string
  name: string
  type: number
  status: number
}

interface Team {
  id: number
  code: string
  name: string
  leader?: {
    name: string
  }
  staffs?: any[]
}

interface Station {
  id: number
  code: string
  name: string
  type: number
  description: string | null
  status: number
  productionLineId: number | null
  productionLine?: {
    id: number
    name: string
    code: string
  }
  _count?: {
    devices: number
    teams: number
  }
}

const StationManagement: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(false)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  
  // 详情数据
  const [associatedDevices, setAssociatedDevices] = useState<Device[]>([])
  const [associatedTeams, setAssociatedTeams] = useState<Team[]>([])
  const [associatedCapabilities, setAssociatedCapabilities] = useState<any[]>([])
  
  // 分页
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  
  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0
  })
  
  // 筛选
  const [filterQuery, setFilterQuery] = useState('')
  const [filterCode, setFilterCode] = useState('')
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)
  const [filterType, setFilterType] = useState<number | undefined>(undefined)
  const [filterLineId, setFilterLineId] = useState<number | undefined>(undefined)

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [bindDeviceModalOpen, setBindDeviceModalOpen] = useState(false)
  const [bindTeamModalOpen, setBindTeamModalOpen] = useState(false)
  const [bindCapabilityModalOpen, setBindCapabilityModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [productionLines, setProductionLines] = useState<any[]>([])
  
  // 未绑定资源
  const [unboundDevices, setUnboundDevices] = useState<Device[]>([])
  const [unboundTeams, setUnboundTeams] = useState<Team[]>([])
  const [unboundProcesses, setUnboundProcesses] = useState<any[]>([])
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([])

  // 1. 优先定义状态渲染函数
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
  const stationColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: '10%', 
      render: (s: number) => renderStatusTag(s) 
    },
    { 
      title: '工位类型', 
      dataIndex: 'type', 
      key: 'type', 
      width: 120,
      render: (type: number) => {
        const config = STATION_TYPE_OPTIONS.find(opt => opt.value === type)
        return <Tag color={config?.color || 'default'} style={{ fontWeight: 600 }}>{config?.label || '未知'}</Tag>
      }
    },
    { 
      title: '工位编号', 
      dataIndex: 'code', 
      key: 'code', 
      width: 140,
      render: (code: string) => <span className="business-code">{code}</span>
    },
    { title: '工位名称', dataIndex: 'name', key: 'name', width: 180 },
    { 
      title: '所属产线', 
      dataIndex: ['productionLine', 'name'], 
      key: 'line', 
      width: 180,
      render: (val: string) => val || <span className="text-gray-400">未关联</span>
    },
    { title: '关联设备', key: 'devices', width: '12%', render: (_: any, record: Station) => record._count?.devices || 0 },
    { title: '关联班组', key: 'teams', width: '12%', render: (_: any, record: Station) => record._count?.teams || 0 },
    {
      title: '操作',
      key: 'action',
      width: '13%',
      render: (_: any, record: Station) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Popconfirm title="确定删除该工位？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const fetchStations = async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
    try {
      // 核心修复：显式判断 overrides 中是否存在该键，以支持 undefined (重置)
      const hasOverride = (key: string) => overrides && Object.prototype.hasOwnProperty.call(overrides, key);

      const params = {
        page: page || pagination.current,
        limit: size || pagination.pageSize,
        name: hasOverride('query') ? overrides.query : filterQuery,
        code: hasOverride('code') ? overrides.code : filterCode,
        status: hasOverride('status') ? overrides.status : filterStatus,
        type: hasOverride('type') ? overrides.type : filterType,
        productionLineId: hasOverride('lineId') ? overrides.lineId : filterLineId
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/stations`, { params })
      if (response.data.status === 'ok') {
        const { list, total, page: current, limit: pageSize, availableCount, unavailableCount, allTotal } = response.data.data
        setStations(list)
        setPagination({ current, pageSize, total })
        setStats({
          total: allTotal,
          available: availableCount,
          unavailable: unavailableCount
        })
      }
    } catch (error: any) {
      console.error('Fetch stations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchResources = useCallback(async (id: number) => {
    setResourcesLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stations/${id}/resources`)
      if (response.data.status === 'ok') {
        setAssociatedDevices(response.data.data.devices || [])
        setAssociatedTeams(response.data.data.teams || [])
        setAssociatedCapabilities(response.data.data.capabilities || [])
      }
    } catch (error) {
      message.error('加载工位资源失败')
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  const fetchProductionLines = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/production-lines`, { params: { pageSize: 1000 } })
      if (response.data.status === 'ok') {
        setProductionLines(response.data.data.list)
      }
    } catch (error) {
      console.error('Fetch lines error:', error)
    }
  }

  // 1. 初始加载
  useEffect(() => { 
    fetchStations(1);
    fetchProductionLines(); 
  }, []);

  // 2. 联动筛选（状态、类型和产线变化时自动触发）
  useEffect(() => {
    // 只有当已经加载过数据后，才在筛选条件变化时触发
    if (stations.length > 0 || filterStatus !== undefined || filterType !== undefined || filterLineId !== undefined) {
      fetchStations(1);
    }
  }, [filterStatus, filterType, filterLineId]);

  const handleRowClick = (record: Station) => {
    setSelectedStation(record)
    fetchResources(record.id)
  }

  const handleAdd = () => {
    setEditingStation(null)
    form.resetFields()
    fetchProductionLines()
    setModalOpen(true)
  }

  const handleEdit = (record: Station) => {
    setEditingStation(record)
    fetchProductionLines()
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/stations/${id}`)
      message.success('删除成功')
      if (selectedStation?.id === id) setSelectedStation(null)
      if (editingStation?.id === id) setEditingStation(null)
      fetchStations()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingStation) {
        await axios.put(`${API_BASE_URL}/api/stations/${editingStation.id}`, values)
      } else {
        await axios.post(`${API_BASE_URL}/api/stations`, values)
      }
      message.success('保存成功')
      setModalOpen(false)
      fetchStations()
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const handleUnbindDevice = async (deviceId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/unbind-device`, { deviceId })
      message.success('设备已解绑')
      if (selectedStation) fetchResources(selectedStation.id)
      fetchStations() // 刷新计数
    } catch (error) {
      message.error('解绑失败')
    }
  }

  const handleUnbindTeam = async (teamId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/unbind-team`, { teamId })
      message.success('班组已解绑')
      if (selectedStation) fetchResources(selectedStation.id)
      fetchStations() // 刷新计数
    } catch (error) {
      message.error('解绑失败')
    }
  }

  const handleUnbindCapability = async (processId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/unbind-capability`, { processId })
      message.success('能力标签已移除')
      if (selectedStation) fetchResources(selectedStation.id)
    } catch (error) {
      message.error('移除失败')
    }
  }

  const handleOpenBindDeviceModal = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/devices`, { params: { pageSize: 1000 } })
      const allDevices = response.data.data.list
      setUnboundDevices(allDevices.filter((d: any) => !d.stationId))
      setSelectedResourceIds([])
      setBindDeviceModalOpen(true)
    } catch (error) {
      message.error('加载设备列表失败')
    }
  }

  const handleOpenBindTeamModal = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams`, { params: { pageSize: 1000 } })
      const allTeams = response.data.data.list
      setUnboundTeams(allTeams.filter((t: any) => !t.stationId))
      setSelectedResourceIds([])
      setBindTeamModalOpen(true)
    } catch (error) {
      message.error('加载班组列表失败')
    }
  }

  const handleOpenBindCapabilityModal = async () => {
    try {
      // 获取所有标准工序
      const response = await axios.get(`${API_BASE_URL}/api/processes`, { params: { pageSize: 1000 } })
      const allProcesses = response.data.data.list
      
      // 过滤掉已经绑定的工序
      const associatedIds = associatedCapabilities.map(c => c.id)
      setUnboundProcesses(allProcesses.filter((p: any) => !associatedIds.includes(p.id)))
      
      setSelectedResourceIds([])
      setBindCapabilityModalOpen(true)
    } catch (error) {
      message.error('加载工序列表失败')
    }
  }

  const handleBindDevices = async () => {
    if (selectedResourceIds.length === 0) return
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/bind-devices`, { deviceIds: selectedResourceIds })
      message.success('设备绑定成功')
      setBindDeviceModalOpen(false)
      if (selectedStation) fetchResources(selectedStation.id)
      fetchStations()
    } catch (error) {
      message.error('绑定失败')
    }
  }

  const handleBindTeams = async () => {
    if (selectedResourceIds.length === 0) return
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/bind-teams`, { teamIds: selectedResourceIds })
      message.success('班组绑定成功')
      setBindTeamModalOpen(false)
      if (selectedStation) fetchResources(selectedStation.id)
      fetchStations()
    } catch (error) {
      message.error('绑定失败')
    }
  }

  const handleBindCapabilities = async () => {
    if (selectedResourceIds.length === 0) return
    try {
      await axios.post(`${API_BASE_URL}/api/stations/${selectedStation?.id}/bind-capabilities`, { processIds: selectedResourceIds })
      message.success('工位能力绑定成功')
      setBindCapabilityModalOpen(false)
      if (selectedStation) fetchResources(selectedStation.id)
    } catch (error) {
      message.error('绑定失败')
    }
  }

  const tabItems = [
    {
      key: 'devices',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ToolOutlined /> 关联设备 ({associatedDevices.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenBindDeviceModal}>添加设备</Button>
          </div>
          <Table
            dataSource={associatedDevices}
            rowKey="id"
            loading={resourcesLoading}
            size="middle"
            pagination={false}
            columns={[
              { 
                title: '编号', 
                dataIndex: 'code', 
                key: 'code', 
                width: '20%',
                render: (code: string) => <span className="business-code">{code}</span>
              },
              { title: '名称', dataIndex: 'name', key: 'name', width: '30%' },
              { title: '类型', dataIndex: 'type', key: 'type', width: '30%', render: (t: number) => getDeviceTypeLabel(t) },
              {
                title: '操作',
                key: 'action',
                width: '20%',
                render: (_: any, record: Device) => (
                  <Popconfirm title="确定解绑此设备？" onConfirm={() => handleUnbindDevice(record.id)}>
                    <Button type="link" danger size="small" icon={<DisconnectOutlined />}>解绑</Button>
                  </Popconfirm>
                )
              }
            ]}
          />
        </div>
      )
    },
    {
      key: 'teams',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><TeamOutlined /> 关联班组 ({associatedTeams.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenBindTeamModal}>添加班组</Button>
          </div>
          <Table
            dataSource={associatedTeams}
            rowKey="id"
            loading={resourcesLoading}
            size="middle"
            pagination={false}
            columns={[
              { 
                title: '班组编号', 
                dataIndex: 'code', 
                key: 'code', 
                width: '20%',
                render: (code: string) => <span className="business-code">{code}</span>
              },
              { title: '班组名', dataIndex: 'name', key: 'name', width: '30%' },
              { title: '班组长', dataIndex: ['leader', 'name'], key: 'leader', width: '20%', render: (val: string) => val || '-' },
              { title: '人数', key: 'memberCount', width: '15%', render: (_: any, record: Team) => record.staffs?.length || 0 },
              {
                title: '操作',
                key: 'action',
                width: '15%',
                render: (_: any, record: Team) => (
                  <Popconfirm title="确定解绑此班组？" onConfirm={() => handleUnbindTeam(record.id)}>
                    <Button type="link" danger size="small" icon={<DisconnectOutlined />}>解绑</Button>
                  </Popconfirm>
                )
              }
            ]}
          />
        </div>
      )
    },
    {
      key: 'capabilities',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ApartmentOutlined /> 工位能力 ({associatedCapabilities.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenBindCapabilityModal}>添加工序能力</Button>
          </div>
          <Table
            dataSource={associatedCapabilities}
            rowKey="id"
            loading={resourcesLoading}
            size="middle"
            pagination={false}
            columns={[
              { 
                title: '工序编号', 
                dataIndex: 'code', 
                key: 'code', 
                width: '20%',
                render: (code: string) => <span className="business-code">{code}</span>
              },
              { title: '工序名称', dataIndex: 'name', key: 'name', width: '30%' },
              { title: '工序类型', dataIndex: 'type', key: 'type', width: '30%', render: (val: string) => val || '-' },
              {
                title: '操作',
                key: 'action',
                width: '20%',
                render: (_: any, record: any) => (
                  <Popconfirm title="确定移除此工序能力？" onConfirm={() => handleUnbindCapability(record.id)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
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
              title={<span className="text-gray-500 font-medium">工位总数</span>} 
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
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Space size="middle" wrap>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 whitespace-nowrap">工位编号:</span>
                <Input 
                  placeholder="请输入编号" 
                  style={{ width: 140 }}
                  allowClear
                  value={filterCode}
                  onChange={e => setFilterCode(e.target.value)}
                  onPressEnter={() => fetchStations(1)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 whitespace-nowrap">工位名称:</span>
                <Input 
                  placeholder="请输入名称" 
                  style={{ width: 140 }}
                  allowClear
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  onPressEnter={() => fetchStations(1)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 whitespace-nowrap">工位类型:</span>
                <Select 
                  placeholder="全部类型" 
                  style={{ width: 120 }} 
                  allowClear
                  value={filterType}
                  onChange={setFilterType}
                  options={STATION_TYPE_OPTIONS}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 whitespace-nowrap">所属产线:</span>
                <Select 
                  placeholder="全部产线" 
                  style={{ width: 160 }} 
                  allowClear
                  value={filterLineId}
                  onChange={setFilterLineId}
                >
                  {productionLines.map(line => (
                    <Select.Option key={line.id} value={line.id}>
                      {line.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 whitespace-nowrap">工位状态:</span>
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
              </div>
            </Space>
          </Col>
          <Col flex="auto" className="flex justify-end">
            <Space size="middle">
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchStations(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterQuery('')
                setFilterCode('')
                setFilterStatus(undefined)
                setFilterType(undefined)
                setFilterLineId(undefined)
                fetchStations(1, pagination.pageSize, { query: '', code: '', status: undefined, type: undefined, lineId: undefined })
              }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 工位列表 */}
      <Card 
        title={
          <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
            <Space size={12}>
              <ApartmentOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>工位列表</span>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增工位</Button>
          </div>
        }
        className="shadow-sm border-none"
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '0 20px' },
          body: { padding: '16px' } 
        }}
      >
        <Table
          dataSource={stations}
          columns={stationColumns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ 
            ...pagination,
            showSizeChanger: true,
            position: ['bottomLeft'],
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => fetchStations(page, size)
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: `cursor-pointer transition-all ${selectedStation?.id === record.id ? 'selected-row' : ''}`,
            style: {
              borderLeft: `4px solid ${getStatusConfig(record.status).themeColor || '#d9d9d9'}`,
              marginBottom: '4px'
            }
          })}
        />
      </Card>

      {/* 下部详情 */}
      <Card className="flex-1 shadow-sm border-none" styles={{ body: { padding: '0 24px', minHeight: '300px' } }}>
        {!selectedStation ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <p className="text-sm">请在上方列表中点击选中一个工位</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="devices" items={tabItems} className="h-full" destroyOnHidden />
        )}
      </Card>

      {/* 新增/编辑 Modal */}
      <Modal
        title={editingStation ? '编辑工位' : '新增工位'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false)
          setEditingStation(null)
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ status: 0 }}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="code" label="工位编号" rules={[{ required: true }]}>
            <Input placeholder="请输入工位编号" />
          </Form.Item>
          <Form.Item name="name" label="工位名称" rules={[{ required: true }]}>
            <Input placeholder="请输入工位名称" />
          </Form.Item>
          <Form.Item name="type" label="工位类型" rules={[{ required: true, message: '请选择工位类型' }]}>
            <Select placeholder="请选择类型" options={STATION_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="productionLineId" label="关联产线">
            <Select placeholder="请选择产线" allowClear>
              {productionLines.map(line => (
                <Select.Option key={line.id} value={line.id}>
                  [{line.code}] {line.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value={0}>可用</Select.Option>
              <Select.Option value={1}>不可用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述信息" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 绑定设备 Modal */}
      <Modal
        title="绑定设备到工位"
        open={bindDeviceModalOpen}
        onOk={handleBindDevices}
        onCancel={() => setBindDeviceModalOpen(false)}
        width={600}
      >
        <div className="mb-4 text-gray-500 italic flex items-center gap-2">
          <InfoCircleOutlined />
          <span>仅显示当前未绑定任何工位的可用设备</span>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择要绑定的设备"
          value={selectedResourceIds}
          onChange={setSelectedResourceIds}
          optionLabelProp="label"
        >
          {unboundDevices.map(device => (
            <Select.Option key={device.id} value={device.id} label={device.name}>
              <div className="flex justify-between items-center">
                <span>{device.name}</span>
                <span className="text-gray-400 text-xs font-mono">[{device.code}]</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Modal>

      {/* 绑定班组 Modal */}
      <Modal
        title="绑定班组到工位"
        open={bindTeamModalOpen}
        onOk={handleBindTeams}
        onCancel={() => setBindTeamModalOpen(false)}
        width={600}
      >
        <div className="mb-4 text-gray-500 italic flex items-center gap-2">
          <InfoCircleOutlined />
          <span>仅显示当前未绑定任何工位的可用班组</span>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择要绑定的班组"
          value={selectedResourceIds}
          onChange={setSelectedResourceIds}
          optionLabelProp="label"
        >
          {unboundTeams.map(team => (
            <Select.Option key={team.id} value={team.id} label={team.name}>
              <div className="flex justify-between items-center">
                <span>{team.name}</span>
                <span className="text-gray-400 text-xs font-mono">[{team.code}]</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Modal>

      {/* 绑定能力/工序 Modal */}
      <Modal
        title="为工位添加能力标签"
        open={bindCapabilityModalOpen}
        onOk={handleBindCapabilities}
        onCancel={() => setBindCapabilityModalOpen(false)}
        width={600}
      >
        <div className="mb-4 text-gray-500 italic flex items-center gap-2">
          <InfoCircleOutlined />
          <span>请从标准工序库中选择该工位具备处理能力的工序</span>
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择工序能力"
          value={selectedResourceIds}
          onChange={setSelectedResourceIds}
          optionLabelProp="label"
        >
          {unboundProcesses.map(process => (
            <Select.Option key={process.id} value={process.id} label={process.name}>
              <div className="flex justify-between items-center">
                <span>{process.name}</span>
                <span className="text-gray-400 text-xs font-mono">[{process.code}]</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Modal>

      <style>{`
        .selected-row {
          background-color: #e6f7ff !important;
          box-shadow: inset 0 0 10px rgba(24, 144, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
          z-index: 1;
          position: relative;
        }
      `}</style>
    </div>
  )
}

export default StationManagement
