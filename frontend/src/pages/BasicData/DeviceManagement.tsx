import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  message,
  Tabs,
  Descriptions,
  Empty,
  Typography,
  Row,
  Col,
  Statistic,
  Avatar,
  Timeline,
  Popconfirm
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { 
  DEVICE_TYPES, 
  BASIC_DATA_STATUS,
  getStatusConfig,
  getDeviceTypeLabel 
} from '../../config/dictionaries'

const { Text } = Typography
const API_BASE_URL = 'http://localhost:3001'

interface Device {
  id: number
  code: string
  name: string
  type: number
  model?: string
  serialNumber?: string
  purchaseDate?: string
  status: number
  stationId?: number | null
  station?: {
    id: number
    name: string
    code: string
    productionLine?: {
      name: string
    }
  }
  maintenanceRecords?: any[]
  createdAt: string
  updatedAt: string
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [stations, setStations] = useState<any[]>([])

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 筛选状态
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [filterCode, setFilterCode] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)

  // 1. 优先定义渲染函数
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
  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: number) => renderStatusTag(status)
    },
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
      width: '15%',
      render: (text: string) => <Text strong className="font-mono">{text}</Text>
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: '18%',
      ellipsis: true
    },
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
      width: '12%',
      render: (type: number) => (
        <Tag color="blue" bordered={false}>
          {getDeviceTypeLabel(type)}
        </Tag>
      )
    },
    {
      title: '规格型号',
      dataIndex: 'model',
      key: 'model',
      width: '15%',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">-</Text>
    },
    {
      title: '所属工位',
      dataIndex: ['station', 'name'],
      key: 'stationName',
      width: '15%',
      render: (val: string, record: Device) => val ? (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '13px' }}>{val}</Text>
          {record.station?.productionLine && (
            <Text type="secondary" style={{ fontSize: '10px' }}>({record.station.productionLine.name})</Text>
          )}
        </Space>
      ) : <Text type="secondary">未绑定</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: '12%',
      render: (_: any, record: Device) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Popconfirm
            title="确定删除此设备吗？"
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

  const fetchDevices = useCallback(async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
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

      const response = await axios.get(`${API_BASE_URL}/api/devices`, { params })
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize: pSize } = response.data.data
        setDevices(list)
        setPagination({
          current,
          pageSize: pSize,
          total
        })
      }
    } catch (error) {
      console.error('Fetch devices failed:', error)
      message.error('加载设备列表失败')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filterQuery, filterCode, filterStatus])

  const fetchStations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stations`, { params: { limit: 1000 } })
      if (response.data.status === 'ok') {
        setStations(response.data.data.list)
      }
    } catch (error) {
      console.error('Fetch stations failed:', error)
    }
  }

  useEffect(() => {
    fetchDevices(1)
  }, [filterStatus])

  const handleAdd = () => {
    setSelectedDevice(null)
    form.resetFields()
    fetchStations()
    setModalOpen(true)
  }

  const handleEdit = (record: Device) => {
    setSelectedDevice(record)
    fetchStations()
    form.setFieldsValue({
      ...record,
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/devices/${id}`)
      message.success('设备已删除')
      fetchDevices()
      if (selectedDevice?.id === id) {
        setSelectedDevice(null)
      }
    } catch (error) {
      message.error('删除设备失败')
    }
  }

  const handleSave = async (forceUnbind = false) => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : null,
        forceUnbind // 传递强制解绑标志
      }

      if (selectedDevice) {
        await axios.put(`${API_BASE_URL}/api/devices/${selectedDevice.id}`, data)
        message.success('设备信息已更新')
      } else {
        await axios.post(`${API_BASE_URL}/api/devices`, data)
        message.success('新设备已添加')
      }
      setModalOpen(false)
      fetchDevices()
    } catch (error: any) {
      if (error.response?.data?.error === 'UNBIND_CONFIRM_REQUIRED') {
        const stationName = error.response.data.stationName || '当前工位';
        Modal.confirm({
          title: '解绑确认',
          icon: <AlertOutlined style={{ color: '#faad14' }} />,
          content: `该设备当前绑定在工位 [${stationName}] 上。将其状态改为“可占用”将自动解除该绑定，是否继续？`,
          okText: '确认解绑并保存',
          cancelText: '取消',
          onOk: () => handleSave(true)
        });
      } else {
        message.error(error.response?.data?.message || '保存失败')
      }
    }
  }

  const handleRowClick = (record: Device) => {
    setSelectedDevice(record)
  }

  const stats = {
    total: pagination.total,
    available: devices.filter(d => d.status === 0).length,
    unavailable: devices.filter(d => d.status === 1).length,
    occupied: devices.filter(d => d.status === 2).length
  }

  const tabItems = [
    {
      key: 'basic',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><FileTextOutlined /> 基础信息</span>,
      children: selectedDevice ? (
        <div className="py-8">
          <Row gutter={48}>
            <Col span={8}>
              <div className="bg-gray-50 rounded-xl flex items-center justify-center p-12 mb-4">
                <Avatar 
                  size={120} 
                  shape="square" 
                  icon={<ToolOutlined />} 
                  style={{ backgroundColor: '#f0f0f0', color: '#bfbfbf' }} 
                />
              </div>
              <div className="text-center">
                <Text type="secondary">设备照片待上传</Text>
              </div>
            </Col>
            <Col span={16}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold m-0">{selectedDevice.name}</h2>
                {renderStatusTag(selectedDevice.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <div className="text-gray-400 text-sm mb-1">设备编号</div>
                  <div className="text-gray-800 font-mono text-lg">{selectedDevice.code}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">设备类型</div>
                  <Tag color="blue" className="text-sm px-3 py-1">{getDeviceTypeLabel(selectedDevice.type)}</Tag>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">规格型号</div>
                  <div className="text-gray-800 text-lg">{selectedDevice.model || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">序列号</div>
                  <div className="text-gray-800 font-mono">{selectedDevice.serialNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">所属工位</div>
                  {selectedDevice.station ? (
                    <Tag color="blue" icon={<ApartmentOutlined />} className="text-sm px-2">
                      {selectedDevice.station.name} ({selectedDevice.station.code})
                      {selectedDevice.station.productionLine && (
                        <span className="ml-2 text-gray-500">({selectedDevice.station.productionLine.name})</span>
                      )}
                    </Tag>
                  ) : (
                    <span className="text-gray-400">未绑定工位</span>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">采购日期</div>
                  <div className="text-gray-800">
                    {selectedDevice.purchaseDate ? dayjs(selectedDevice.purchaseDate).format('YYYY-MM-DD') : '-'}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      ) : null
    },
    {
      key: 'maintenance',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><HistoryOutlined /> 维护履历</span>,
      children: selectedDevice ? (
        <div className="py-8 px-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {selectedDevice.maintenanceRecords && selectedDevice.maintenanceRecords.length > 0 ? (
            <Timeline 
              mode="left"
              items={selectedDevice.maintenanceRecords.map((record: any) => ({
                color: record.status === 1 ? 'green' : 'orange',
                label: <Text type="secondary">{dayjs(record.startTime).format('YYYY-MM-DD HH:mm')}</Text>,
                children: (
                  <Card size="small" className="mb-4 shadow-sm" style={{ borderLeft: `3px solid ${record.status === 1 ? '#52c41a' : '#faad14'}` }}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <Text strong style={{ fontSize: '15px' }}>
                          {record.status === 0 ? (
                            <ClockCircleOutlined className="mr-2 text-orange-500 animate-pulse" />
                          ) : (
                            <CheckCircleOutlined className="mr-2 text-green-500" />
                          )}
                          {record.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>类型: {record.type === 'AUTO' ? '系统自动触发' : '人工登记'}</Text>
                        {record.content && <Text className="mt-2 block bg-gray-50 p-2 rounded">{record.content}</Text>}
                        {record.endTime && (
                          <div className="mt-2 text-xs text-gray-400">
                            完成时间: {dayjs(record.endTime).format('YYYY-MM-DD HH:mm')}
                          </div>
                        )}
                      </div>
                      <Tag color={record.status === 1 ? 'success' : 'processing'} style={{ borderRadius: '10px' }}>
                        {record.status === 1 ? '已完成' : '维护中'}
                      </Tag>
                    </div>
                  </Card>
                )
              }))}
            />
          ) : (
            <Empty 
              description="该设备尚无维护记录" 
              className="py-12" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      ) : null
    },
    {
      key: 'station',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ApartmentOutlined /> 关联工位</span>,
      children: (
        <div className="py-8 px-4">
          {selectedDevice?.station ? (
            <Card 
              className="max-w-2xl shadow-sm border-gray-100"
              title={
                <Space>
                  <ApartmentOutlined className="text-blue-500" />
                  <span className="font-bold">当前绑定工位</span>
                </Space>
              }
            >
              <Descriptions column={1} labelStyle={{ color: '#8c8c8c', width: '120px' }}>
                <Descriptions.Item label="工位名称">
                  <Text strong style={{ fontSize: '16px' }}>{selectedDevice.station.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="工位代码">
                  <Tag className="font-mono">{selectedDevice.station.code}</Tag>
                </Descriptions.Item>
                {selectedDevice.station.productionLine && (
                  <Descriptions.Item label="所属产线">
                    <Text>{selectedDevice.station.productionLine.name}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="关联状态">
                  <Tag color="success">已绑定</Tag>
                </Descriptions.Item>
              </Descriptions>
              <div className="mt-6 pt-4 border-t border-gray-50 text-gray-400 text-xs flex items-center gap-2">
                <InfoCircleOutlined />
                <span>如需更改绑定关系，请前往“工位管理”模块进行操作。</span>
              </div>
            </Card>
          ) : (
            <Empty 
              description="该设备目前处于闲置状态，未绑定任何工位" 
              className="py-12" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* 顶部统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic 
              title={<span className="text-gray-500 font-medium">设备总数</span>} 
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
              <span className="text-gray-500">设备编号:</span>
              <Input 
                placeholder="搜索编号" 
                style={{ width: 150 }}
                allowClear
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                onPressEnter={() => fetchDevices(1)}
              />
              <span className="text-gray-500 ml-2">设备名称:</span>
              <Input 
                placeholder="搜索名称" 
                style={{ width: 150 }}
                allowClear
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                onPressEnter={() => fetchDevices(1)}
              />
              <span className="text-gray-500 ml-2">设备状态:</span>
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
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchDevices(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterQuery('')
                setFilterCode('')
                setFilterStatus(undefined)
                fetchDevices(1, pagination.pageSize, { query: '', code: '', status: undefined })
              }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 上部：设备列表 */}
      <Card 
        title={
          <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
            <Space size={12}>
              <ToolOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>设备列表</span>
            </Space>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增设备
              </Button>
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
          dataSource={devices}
          columns={columns}
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
            onChange: (page, size) => fetchDevices(page, size)
          }}
          onRow={(record) => {
            const config = getStatusConfig(record.status);
            return {
              onClick: () => handleRowClick(record),
              className: `cursor-pointer transition-all ${selectedDevice?.id === record.id ? 'selected-row' : ''}`,
              style: {
                borderLeft: `4px solid ${config.themeColor || '#d9d9d9'}`,
                marginBottom: '4px'
              }
            };
          }}
          locale={{ 
            emptyText: loading ? '数据加载中...' : <Empty description="暂无设备数据" /> 
          }}
        />
      </Card>

      {/* 下部：设备详情（页签式） */}
      <Card 
        className="flex-1 shadow-sm border-none" 
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: '0 24px', minHeight: '300px' } 
        }}
      >
        {!selectedDevice ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <p className="text-sm">请在上方列表中点击选中一台设备查看详情</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="basic" items={tabItems} className="h-full" destroyInactiveTabPane />
        )}
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={selectedDevice ? '编辑设备' : '新增设备'}
        open={modalOpen}
        onOk={() => handleSave()}
        onCancel={() => setModalOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ status: 0 }} className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="设备编号" rules={[{ required: true, message: '请输入设备编号' }]}>
                <Input placeholder="如: SB-001" disabled={!!selectedDevice} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
                <Select placeholder="请选择类型">
                  {DEVICE_TYPES.map(type => (
                    <Select.Option key={type.id} value={type.id}>{type.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="当前状态" rules={[{ required: true }]}>
                <Select placeholder="请选择状态">
                  {BASIC_DATA_STATUS.map(s => (
                    <Select.Option key={s.value} value={s.value}>
                      <Space>
                        <span 
                          style={{ 
                            display: 'inline-block', 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: s.themeColor 
                          }} 
                        />
                        {s.label}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model" label="规格型号">
                <Input placeholder="如: Standard-V1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serialNumber" label="出厂序列号">
                <Input placeholder="请输入序列号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchaseDate" label="采购日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stationId" label="关联工位">
                <Select placeholder="选择所属工位" allowClear>
                  {stations.map(s => (
                    <Select.Option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 全局样式 */}
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

export default DeviceManagement
