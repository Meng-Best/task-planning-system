import { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tabs,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Empty,
  Timeline,
  Tag,
  Typography,
  Statistic
} from 'antd'

const { Text } = Typography;
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ToolOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { 
  BASIC_DATA_STATUS, 
  getStatusConfig, 
  STATUS_VALUE,
  DEVICE_TYPE_OPTIONS,
  getDeviceTypeLabel
} from '../../config/dictionaries'

// 类型定义
interface Device {
  id: number
  code: string
  name: string
  type: number
  model?: string
  serialNumber?: string
  purchaseDate?: string
  status: number
  productionLineId?: number | null
  productionLine?: {
    id: number
    name: string
    code: string
  }
  createdAt: string
  updatedAt: string
}

interface MaintenanceRecord {
  id: number
  deviceId: number
  type: 'MANUAL' | 'AUTO'
  title: string
  content?: string
  startTime: string
  endTime?: string
  status: number
  createdAt: string
}

const API_BASE_URL = 'http://localhost:3001'

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [form] = Form.useForm()
  
  // 筛选状态
  const [filterCode, setFilterCode] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterType, setFilterType] = useState<number | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 统计状态
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0,
    occupied: 0
  })

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [loadingMaintenance, setLoadingMaintenance] = useState(false)

  // 统一渲染状态标签
  const renderStatusTag = (status: number) => {
    const config = getStatusConfig(status)
    return (
      <span
        style={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
          borderRadius: '4px',
          padding: '2px 10px',
          fontSize: '12px',
          display: 'inline-block'
        }}
      >
        {config.label}
      </span>
    )
  }

  // 加载数据
  const fetchDevices = async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      }
      
      // 优先使用覆盖参数，否则使用当前 state
      const code = overrides?.code !== undefined ? overrides.code : filterCode
      const name = overrides?.name !== undefined ? overrides.name : filterName
      const type = overrides?.type !== undefined ? overrides.type : filterType
      const status = overrides?.status !== undefined ? overrides.status : filterStatus

      if (code) params.code = code
      if (name) params.name = name
      if (type !== undefined) params.type = type
      if (status !== undefined) params.status = status

      const response = await axios.get(`${API_BASE_URL}/api/devices`, { params })
      if (response.data.status === 'ok') {
        const { list, total, availableCount, unavailableCount, occupiedCount, current, pageSize } = response.data.data
        setDevices(list)
        setPagination({
          current,
          pageSize,
          total
        })
        setStats({
          total,
          available: availableCount || 0,
          unavailable: unavailableCount || 0,
          occupied: occupiedCount || 0
        })
        // 如果当前选中的设备在列表中，更新它
        if (selectedDevice) {
          const updated = list.find((d: Device) => d.id === selectedDevice.id)
          setSelectedDevice(updated || null)
        }
      }
    } catch (error: any) {
      // 统一错误提示逻辑：仅提示友好信息，隐藏技术细节
      message.error("操作失败，系统繁忙或网络异常")
      console.error('API Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载维护记录
  const fetchMaintenanceRecords = async (deviceId: number) => {
    setLoadingMaintenance(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/devices/${deviceId}/maintenance`)
      if (response.data.status === 'ok') {
        setMaintenanceRecords(response.data.data)
      }
    } catch (error) {
      console.error('Fetch Maintenance Error:', error)
    } finally {
      setLoadingMaintenance(false)
    }
  }

  // 处理分页变化
  const handleTableChange = (page: number, pageSize: number) => {
    fetchDevices(page, pageSize)
  }

  useEffect(() => {
    fetchDevices(1) // 筛选条件变化时，重置到第一页
  }, [filterType, filterStatus])

  useEffect(() => {
    if (selectedDevice) {
      fetchMaintenanceRecords(selectedDevice.id)
    } else {
      setMaintenanceRecords([])
    }
  }, [selectedDevice]) // 监听整个对象变化，确保状态更新后自动刷新记录

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/devices/${id}`)
      message.success('设备已删除')
      if (selectedDevice?.id === id) setSelectedDevice(null)
      fetchDevices()
    } catch (error) {
      message.error("操作失败，系统繁忙或网络异常")
      console.error('Delete Error:', error)
    }
  }

  // 打开弹窗
  const handleOpenModal = (device?: Device) => {
    setEditingDevice(device || null)
    if (device) {
      form.setFieldsValue({
        ...device,
        purchaseDate: device.purchaseDate ? dayjs(device.purchaseDate) : null
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ status: STATUS_VALUE.AVAILABLE })
    }
    setModalOpen(true)
  }

  // 保存数据
  const handleSave = async (forceUnbind = false) => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        forceUnbind
      }

      if (editingDevice) {
        const response = await axios.put(`${API_BASE_URL}/api/devices/${editingDevice.id}`, data)
        if (response.data.status === 'ok') {
          message.success('设备信息已更新')
          fetchDevices()
          setModalOpen(false)
          form.resetFields()
        }
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/devices`, data)
        if (response.data.status === 'ok') {
          message.success('设备创建成功')
          fetchDevices(1)
          setModalOpen(false)
          form.resetFields()
        }
      }
    } catch (error: any) {
      // 处理解绑确认逻辑
      if (error.response?.data?.status === 'confirm_required') {
        Modal.confirm({
          title: '解除绑定确认',
          content: error.response.data.message,
          okText: '确认移除并修改',
          cancelText: '取消',
          onOk: () => handleSave(true) // 递归调用，带上强制解绑标志
        })
        return
      }

      // Ant Design Form 验证错误
      if (error.errorFields) {
        return // 表单验证失败，不显示错误提示
      }
      
      // API 错误
      const errorMessage = error.response?.data?.message || "操作失败，系统繁忙或网络异常"
      message.error(errorMessage)
      console.error('Save Error:', error)
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '设备编号',
      dataIndex: 'code',
      key: 'code',
      width: '14%',
      render: (text: string) => <span className="font-mono font-bold text-blue-600">{text}</span>
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: '18%',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '12%',
      render: (type: number) => getDeviceTypeLabel(type)
    },
    {
      title: '规格型号',
      dataIndex: 'model',
      key: 'model',
      width: '15%',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '出厂序列号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: '15%',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: number) => renderStatusTag(status)
    },
    {
      title: '操作',
      key: 'action',
      width: '14%',
      render: (_: any, record: Device) => (
        <Space size="middle">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleOpenModal(record)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此设备吗？"
            onConfirm={(e) => {
              e?.stopPropagation()
              handleDelete(record.id)
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="device-management flex flex-col gap-4 p-2">
      {/* 顶部：统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">设备总数</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">可占用</span>}
              value={stats.available}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">已占用</span>}
              value={stats.occupied}
              valueStyle={{ color: '#faad14', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">不可用</span>}
              value={stats.unavailable}
              valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card className="shadow-sm" styles={{ body: { padding: '16px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Space>
              <span className="text-gray-500">设备编号:</span>
              <Input 
                placeholder="请输入编号" 
                style={{ width: 140 }} 
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                onPressEnter={() => fetchDevices(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span className="text-gray-500">设备名称:</span>
              <Input 
                placeholder="请输入名称" 
                style={{ width: 140 }} 
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onPressEnter={() => fetchDevices(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span className="text-gray-500">类型:</span>
              <Select
                placeholder="全部类型"
                style={{ width: 130 }}
                allowClear
                onChange={setFilterType}
                value={filterType}
              >
                {DEVICE_TYPE_OPTIONS.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <span className="text-gray-500">状态:</span>
              <Select
                placeholder="全部状态"
                style={{ width: 130 }}
                allowClear
                onChange={setFilterStatus}
                value={filterStatus}
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
            <Space>
              <Button 
                type="primary"
                icon={<SearchOutlined />} 
                onClick={() => fetchDevices(1)}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  setFilterCode('')
                  setFilterName('')
                  setFilterType(undefined)
                  setFilterStatus(undefined)
                  fetchDevices(1, pagination.pageSize, { code: '', name: '', type: undefined, status: undefined })
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 列表区域 */}
      <Card 
        title={
          <div className="flex items-center justify-between">
            <Space size={8}>
              <ToolOutlined className="text-blue-500" />
              <span className="font-bold">设备列表</span>
            </Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              新建设备
            </Button>
          </div>
        }
        className="flex-none shadow-sm"
        styles={{ body: { padding: '16px' } }}
      >
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          bordered={false} // 去掉表格外边框，避免与卡片边框重叠
          pagination={{
            position: ['bottomLeft'], // 移动到左下角
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条数据`,
            pageSizeOptions: ['10', '20', '50', '100'],
            style: { marginLeft: '8px', marginTop: '16px' },
            onChange: handleTableChange,
            onShowSizeChange: handleTableChange
          }}
          onRow={(record) => {
            const statusConfig = getStatusConfig(record.status);
            return {
              onClick: () => setSelectedDevice(record),
              className: `cursor-pointer transition-all duration-200 device-row-status-${record.status} ${selectedDevice?.id === record.id ? 'selected-row' : ''}`,
              style: {
                borderLeft: `4px solid ${statusConfig.themeColor}`
              }
            };
          }}
        />
      </Card>

      {/* 下部：详情区域 (Tabs) */}
      <Card className="flex-1 shadow-sm overflow-hidden" styles={{ body: { height: '100%', padding: '0 24px' } }}>
        {selectedDevice ? (
          <Tabs defaultActiveKey="info" className="h-full">
            <Tabs.TabPane tab="基本信息" key="info">
              <div className="overflow-y-auto overflow-x-hidden py-8 px-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                <Row gutter={48}>
                  {/* 左侧：图标与核心标识 */}
                  <Col span={6}>
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 m-10">
                      {/* <Avatar 
                        size={120} 
                        icon={<ToolOutlined />} 
                        style={{ 
                          backgroundColor: getStatusConfig(selectedDevice.status).themeColor,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          marginBottom: '20px'
                        }} 
                      /> */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-800 mb-1">{selectedDevice.name}</div>
                        <Tag color="blue" className="font-mono px-5 py-1 rounded-full m-4">
                          {selectedDevice.code}
                        </Tag>
                      </div>
                    </div>
                  </Col>

                  {/* 右侧：详细参数 */}
                  <Col span={18}>
                    <div className="bg-white rounded-xl">
                      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <InfoCircleOutlined className="text-blue-500 text-lg" />
                        <span className="text-lg font-bold text-gray-700">技术规格与资产状态</span>
                      </div>
                      <Descriptions 
                        column={2} 
                        labelStyle={{ color: '#8c8c8c', width: '120px', fontWeight: 500 }}
                        contentStyle={{ color: '#262626', fontWeight: 500 }}
                      >
                        <Descriptions.Item label="设备类型">
                          <Tag color="cyan" className="m-0">{getDeviceTypeLabel(selectedDevice.type)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="当前状态">
                          {renderStatusTag(selectedDevice.status)}
                        </Descriptions.Item>
                        <Descriptions.Item label="规格型号">
                          <Text strong>{selectedDevice.model || '-'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="所属产线">
                          {selectedDevice.productionLine ? (
                            <Tag color="blue" icon={<ApartmentOutlined />}>
                              {selectedDevice.productionLine.name} ({selectedDevice.productionLine.code})
                            </Tag>
                          ) : (
                            <span className="text-gray-400">未绑定产线</span>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="出厂序列号">
                          <Text copyable={!!selectedDevice.serialNumber} className="font-mono">
                            {selectedDevice.serialNumber || '-'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="采购日期">
                          <span className="text-gray-600">
                            {selectedDevice.purchaseDate ? dayjs(selectedDevice.purchaseDate).format('YYYY-MM-DD') : '-'}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="最后更新">
                          <span className="text-gray-500 italic">
                            {dayjs(selectedDevice.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                          </span>
                        </Descriptions.Item>
                      </Descriptions>

                      {/* 底部补充信息 */}
                      <div className="mt-8 p-4 bg-blue-50/30 rounded-lg border border-blue-100/50 flex items-start gap-3">
                        <div className="bg-blue-500 rounded-full p-1 mt-0.5">
                          <CheckOutlined className="text-white text-[10px]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-blue-800 mb-0.5">资产合规性确认</div>
                          <div className="text-xs text-blue-600/80">该设备已录入系统，所有维护记录将自动关联至此唯一编号。</div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="维护记录" key="maintenance">
              <div 
                className="py-6 px-4" 
                style={{ 
                  maxHeight: 'calc(100vh - 500px)', 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  paddingBottom: '24px' 
                }}
              >
                {loadingMaintenance ? (
                  <div className="py-12 flex justify-center">
                    <Space direction="vertical" align="center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <Text type="secondary">正在加载维护历史...</Text>
                    </Space>
                  </div>
                ) : maintenanceRecords.length > 0 ? (
                  <Timeline
                    className="custom-maintenance-timeline"
                    items={maintenanceRecords.map((record, index) => {
                      const isOngoing = record.status === 0;
                      return {
                        color: isOngoing ? '#ff4d4f' : '#52c41a', // 红色代表停机，绿色代表恢复
                        dot: isOngoing ? 
                          <WarningOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} /> : 
                          <CheckCircleOutlined style={{ fontSize: '16px', color: '#52c41a' }} />,
                        children: (
                          <div className={`group mb-6 p-4 rounded-lg transition-all border ${isOngoing ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/50 border-gray-100'}`} style={{ textAlign: 'left' }}>
                            <div className="flex items-center justify-between mb-2">
                              <Space size="middle">
                                <Tag color={isOngoing ? 'error' : 'success'} className="font-bold">
                                  {isOngoing ? '当前不可用' : '已恢复可用'}
                                </Tag>
                                <Text strong className="text-gray-800" style={{ fontSize: '15px' }}>
                                  #{maintenanceRecords.length - index} {record.title}
                                </Text>
                              </Space>
                              <Text type="secondary" className="text-xs font-mono">
                                {dayjs(record.startTime).format('YYYY-MM-DD HH:mm:ss')}
                              </Text>
                            </div>
                            <div className="text-gray-500 leading-relaxed pl-1" style={{ fontSize: '13px' }}>
                              <InfoCircleOutlined className="mr-2 text-gray-400" />
                              {record.content}
                              {!isOngoing && record.endTime && (
                                <div className="mt-2 text-green-600 font-medium italic">
                                  ✨ 恢复时刻：{dayjs(record.endTime).format('YYYY-MM-DD HH:mm:ss')}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      };
                    })}
                  />
                ) : (
                  <Empty description="暂无停用记录" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-12" />
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="关联产线" key="lines">
              <div className="py-8 px-4">
                {selectedDevice.productionLine ? (
                  <Card 
                    className="max-w-2xl shadow-sm border-gray-100"
                    title={
                      <Space>
                        <ApartmentOutlined className="text-blue-500" />
                        <span className="font-bold">当前绑定产线</span>
                      </Space>
                    }
                  >
                    <Descriptions column={1} labelStyle={{ color: '#8c8c8c', width: '120px' }}>
                      <Descriptions.Item label="产线名称">
                        <Text strong style={{ fontSize: '16px' }}>{selectedDevice.productionLine.name}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="产线代码">
                        <Tag className="font-mono">{selectedDevice.productionLine.code}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="关联状态">
                        <Tag color="success">已绑定</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                    <div className="mt-6 pt-4 border-t border-gray-50 text-gray-400 text-xs flex items-center gap-2">
                      <InfoCircleOutlined />
                      <span>如需更改绑定关系，请前往“产线管理”模块进行操作。</span>
                    </div>
                  </Card>
                ) : (
                  <Empty 
                    description="该设备目前处于闲置状态，未绑定任何产线" 
                    className="py-12" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </Tabs.TabPane>
          </Tabs>
        ) : (
          <div className="h-full flex items-center justify-center py-12">
            <Empty description="请从上方列表中选择设备以查看详情" />
          </div>
        )}
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingDevice ? '编辑设备' : '新建设备'}
        open={modalOpen}
        onOk={() => handleSave()}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="设备编号"
                rules={[
                  { required: true, message: '请输入设备编号' },
                  { pattern: /^SB-/, message: '编号必须以 SB- 开头' }
                ]}
                tooltip="编号规范：SB-类别-序号"
              >
                <Input placeholder="例如：SB-CNC-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="例如：精密数控机床" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select
                  placeholder="请选择设备类型"
                  options={DEVICE_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="选择状态">
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
                <Input placeholder="规格型号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serialNumber" label="出厂序列号">
                <Input placeholder="序列号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="purchaseDate" label="采购日期">
            <DatePicker className="w-full" placeholder="选择日期" />
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
        .ant-table-row:hover {
          filter: brightness(0.98);
        }
        .custom-maintenance-timeline .ant-timeline-item-last > .ant-timeline-item-content {
          min-height: auto;
        }
      `}</style>
    </div>
  )
}

export default DeviceManagement

