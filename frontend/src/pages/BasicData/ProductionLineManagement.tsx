import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Tabs,
  Space,
  Modal,
  Select,
  message,
  Popconfirm,
  Empty,
  Alert,
  Row,
  Col,
  Statistic,
  Input
} from 'antd'
import {
  ToolOutlined,
  TeamOutlined,
  LinkOutlined,
  DisconnectOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons'

import axios from 'axios'
import { 
  getStatusConfig, 
  getDeviceTypeLabel 
} from '../../config/dictionaries'

const API_BASE_URL = 'http://localhost:3001'

interface ProductionLine {
  id: number
  code: string
  name: string
  type: string
  status: number
  factoryId: number
  factory?: {
    name: string
  }
}

interface Device {
  id: number
  code: string
  name: string
  type: number
  model?: string
  status: number
  productionLineId?: number | null
}

interface Team {
  id: number
  code: string
  name: string
  status: number
  staffs?: any[]
  leader?: {
    name: string
  }
}

const ProductionLineManagement: React.FC = () => {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [associatedDevices, setAssociatedDevices] = useState<Device[]>([])
  const [associatedTeams, setAssociatedTeams] = useState<Team[]>([])
  
  const [bindModalOpen, setBindModalOpen] = useState(false)
  const [unboundDevices, setUnboundDevices] = useState<Device[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([])
  const [bindingLoading, setBindingLoading] = useState(false)

  // 统计数据
  const stats = {
    total: lines.length,
    available: lines.filter(l => l.status === 0).length,
    unavailable: lines.filter(l => l.status === 1).length,
    occupied: lines.filter(l => l.status === 2).length
  }

  const fetchLines = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/production-lines`)
      if (response.data && response.data.status === 'ok') {
        setLines(response.data.data.map((item: any) => ({ ...item, key: item.id })))
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
        setAssociatedDevices(response.data.data.devices || [])
        setAssociatedTeams(response.data.data.teams || [])
      }
    } catch (error: any) {
      console.error('Fetch resources failed:', error)
      message.error('后端资源查询失败 (500)，请确保数据库已执行 push 操作')
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  useEffect(() => { fetchLines() }, [])

  useEffect(() => {
    if (selectedLineId) fetchResources(selectedLineId)
  }, [selectedLineId, fetchResources])

  const handleRowClick = (record: ProductionLine) => { setSelectedLineId(record.id) }

  const handleOpenBindModal = () => {
    fetchUnboundDevices()
    setSelectedDeviceIds([])
    setBindModalOpen(true)
  }

  const fetchUnboundDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/devices?pageSize=1000`)
      if (response.data.status === 'ok') {
        setUnboundDevices(response.data.data.list.filter((d: any) => !d.productionLineId))
      }
    } catch (error) { message.error('获取未绑定设备失败') }
  }

  const handleBindDevices = async () => {
    if (selectedDeviceIds.length === 0) return
    setBindingLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/api/production-lines/${selectedLineId}/bind-devices`, { deviceIds: selectedDeviceIds })
      message.success('设备绑定成功')
      setBindModalOpen(false)
      if (selectedLineId) fetchResources(selectedLineId)
    } catch (error) { message.error('绑定失败') }
    finally { setBindingLoading(false) }
  }

  const handleUnbindDevice = async (deviceId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/production-lines/${selectedLineId}/unbind-device`, { deviceId })
      message.success('设备已解绑')
      if (selectedLineId) fetchResources(selectedLineId)
    } catch (error) { message.error('解绑失败') }
  }

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
      width: '20%',
      render: (val: string) => <span className="text-gray-600">{val}</span>
    }
  ]

  const deviceColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: '12%', 
      render: (status: number) => renderStatusTag(status) 
    },
    { 
      title: '编号', 
      dataIndex: 'code', 
      key: 'code', 
      width: '18%',
      render: (val: string) => <span className="text-gray-700" style={{ fontWeight: 500 }}>{val}</span>
    },
    { 
      title: '名称', 
      dataIndex: 'name', 
      key: 'name',
      width: '25%',
      render: (val: string) => <span className="text-gray-800">{val}</span>
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type', 
      width: '15%',
      render: (type: number) => <span className="text-gray-600">{getDeviceTypeLabel(type)}</span>
    },
    { 
      title: '型号', 
      dataIndex: 'model', 
      key: 'model',
      width: '20%',
      render: (val: string) => <span className="text-gray-600">{val || '-'}</span>
    },
    { 
      title: '操作', 
      key: 'action', 
      width: '10%', 
      render: (_: any, record: Device) => (
        <Popconfirm title="确定解绑此设备？" onConfirm={() => handleUnbindDevice(record.id)} okText="确定" cancelText="取消">
          <Button type="link" danger size="small" icon={<DisconnectOutlined />}>移除</Button>
        </Popconfirm>
      )
    }
  ]

  const teamColumns = [
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: '15%', 
      render: (status: number) => renderStatusTag(status) 
    },
    { 
      title: '班组名', 
      dataIndex: 'name', 
      key: 'name',
      width: '40%',
      render: (val: string) => <span className="text-gray-800 font-medium">{val}</span>
    },
    { 
      title: '班组长', 
      key: 'leader', 
      width: '25%',
      render: (_: any, record: any) => <span className="text-gray-600">{record.leader?.name || '-'}</span> 
    },
    { 
      title: '人数', 
      key: 'memberCount', 
      width: '20%',
      render: (_: any, record: any) => <span className="text-gray-600">{record.staffs?.length || 0}</span> 
    }
  ]

  const tabItems = [
    {
      key: 'devices',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ToolOutlined /> 关联设备 ({associatedDevices.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenBindModal}>添加设备</Button>
          </div>
          <Table dataSource={associatedDevices} columns={deviceColumns} rowKey="id" loading={resourcesLoading} size="middle" pagination={false} />
        </div>
      )
    },
    {
      key: 'teams',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><TeamOutlined /> 关联班组 ({associatedTeams.length})</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <div className="mb-4">
            <Tag color="blue" icon={<InfoCircleOutlined />} style={{ padding: '4px 12px', borderRadius: '4px' }}>提示：班组绑定产线请前往“班组管理”模块操作</Tag>
          </div>
          <Table dataSource={associatedTeams} columns={teamColumns} rowKey="id" loading={resourcesLoading} size="middle" pagination={false} />
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
              title={<span className="text-gray-500 font-medium">可占用</span>} 
              value={stats.available} 
              valueStyle={{ color: '#52c41a', fontWeight: 700 }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic 
              title={<span className="text-gray-500 font-medium">已占用</span>} 
              value={stats.occupied} 
              valueStyle={{ color: '#faad14', fontWeight: 700 }} 
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
              <span className="text-gray-500">搜索:</span>
              <Input 
                placeholder="产线名称/代码" 
                style={{ width: 200 }}
                allowClear
              />
              <span className="text-gray-500 ml-2">类型:</span>
              <Select placeholder="全部类型" style={{ width: 140 }} allowClear>
                {/* 动态选项可以在此添加 */}
              </Select>
              <span className="text-gray-500 ml-2">状态:</span>
              <Select placeholder="全部状态" style={{ width: 130 }} allowClear>
                <Select.Option value={0}>可占用</Select.Option>
                <Select.Option value={1}>不可用</Select.Option>
                <Select.Option value={2}>已占用</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space size="middle">
              <Button type="primary" icon={<SearchOutlined />}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchLines}>重置</Button>
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
            <Button size="small" danger onClick={fetchLines}>重试</Button>
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
            <Button 
              type="primary"
              ghost
              icon={<ReloadOutlined />} 
              onClick={fetchLines} 
              loading={loading}
              size="middle"
            >
              刷新列表
            </Button>
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
            pageSize: 5, 
            size: 'small', 
            position: ['bottomLeft'],
            showTotal: (total) => `共 ${total} 条产线`
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
          <Tabs defaultActiveKey="devices" items={tabItems} className="h-full" />
        )}
      </Card>

      <Modal
        title="绑定设备到产线"
        open={bindModalOpen}
        onOk={handleBindDevices}
        onCancel={() => setBindModalOpen(false)}
        confirmLoading={bindingLoading}
        width={600}
        destroyOnHidden
      >
        <div className="py-4">
          <p className="mb-4 text-gray-500">选择要绑定到当前产线的设备（仅显示闲置设备）：</p>
          <Select mode="multiple" style={{ width: '100%' }} placeholder="请选择设备" value={selectedDeviceIds} onChange={setSelectedDeviceIds} optionLabelProp="label">
            {unboundDevices.map(device => (
              <Select.Option key={device.id} value={device.id} label={`${device.name} (${device.code})`}>
                <div className="flex justify-between items-center">
                  <Space><span className="font-mono text-xs text-gray-400">[{device.code}]</span><span>{device.name}</span></Space>
                  <Tag>{getDeviceTypeLabel(device.type)}</Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </div>
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
