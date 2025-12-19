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
  Typography
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
  CheckCircleOutlined
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
  const [filterType, setFilterType] = useState<number | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [loadingMaintenance, setLoadingMaintenance] = useState(false)

  // 统一渲染状态标签（复用工厂管理的逻辑，但为了组件独立性在此重写或可后续提取为公共组件）
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
  const fetchDevices = async (page?: number, size?: number) => {
    setLoading(true)
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      }
      if (filterType !== undefined) params.type = filterType
      if (filterStatus !== undefined) params.status = filterStatus

      const response = await axios.get(`${API_BASE_URL}/api/devices`, { params })
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize } = response.data.data
        setDevices(list)
        setPagination({
          current,
          pageSize,
          total
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
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null
      }

      if (editingDevice) {
        await axios.put(`${API_BASE_URL}/api/devices/${editingDevice.id}`, data)
        message.success('设备信息已更新')
        // 编辑后刷新当前页
        fetchDevices()
      } else {
        await axios.post(`${API_BASE_URL}/api/devices`, data)
        message.success('设备创建成功')
        // 新建后跳转到第一页以查看新设备
        fetchDevices(1)
      }

      setModalOpen(false)
      form.resetFields()
    } catch (error: any) {
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

  // 获取所有设备类型用于筛选
  const uniqueTypes = Array.from(new Set(devices.map(d => d.type)))

  return (
    <div className="device-management flex flex-col gap-4 h-full p-2">
      {/* 上部：表格区域 */}
      <Card 
        title={
          <div className="flex items-center justify-between">
            <Space>
              <SearchOutlined />
              <span>设备列表</span>
            </Space>
            <Space>
              <Select
                placeholder="全部类型"
                style={{ width: 150 }}
                allowClear
                onChange={setFilterType}
                value={filterType}
              >
                {DEVICE_TYPE_OPTIONS.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
              <Select
                placeholder="全部状态"
                style={{ width: 150 }}
                allowClear
                onChange={setFilterStatus}
                value={filterStatus}
              >
                {BASIC_DATA_STATUS.map(s => (
                  <Select.Option key={s.value} value={s.value}>
                    <Space>
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
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  setFilterType(undefined)
                  setFilterStatus(undefined)
                  fetchDevices(1, pagination.pageSize)
                }}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                新建设备
              </Button>
            </Space>
          </div>
        }
        className="flex-none shadow-sm"
        bodyStyle={{ padding: '16px' }} // 统一内边距，解决边框重叠
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
          onRow={(record) => ({
            onClick: () => setSelectedDevice(record),
            className: `cursor-pointer transition-colors ${selectedDevice?.id === record.id ? 'bg-blue-50' : ''}`
          })}
        />
      </Card>

      {/* 下部：详情区域 (Tabs) */}
      <Card className="flex-1 shadow-sm overflow-hidden" bodyStyle={{ height: '100%', padding: '0 24px' }}>
        {selectedDevice ? (
          <Tabs defaultActiveKey="info" className="h-full">
            <Tabs.TabPane tab="基本信息" key="info">
              <div className="py-4">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="设备编号">{selectedDevice.code}</Descriptions.Item>
                  <Descriptions.Item label="设备名称">{selectedDevice.name}</Descriptions.Item>
                  <Descriptions.Item label="设备类型">{getDeviceTypeLabel(selectedDevice.type)}</Descriptions.Item>
                  <Descriptions.Item label="状态">{renderStatusTag(selectedDevice.status)}</Descriptions.Item>
                  <Descriptions.Item label="规格型号">{selectedDevice.model || '-'}</Descriptions.Item>
                  <Descriptions.Item label="出厂序列号">{selectedDevice.serialNumber || '-'}</Descriptions.Item>
                  <Descriptions.Item label="采购日期">
                    {selectedDevice.purchaseDate ? dayjs(selectedDevice.purchaseDate).format('YYYY-MM-DD') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="最后更新">{dayjs(selectedDevice.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                </Descriptions>
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab="维护记录" key="maintenance">
              <div 
                className="py-6 px-4" 
                style={{ 
                  maxHeight: 'calc(100vh - 450px)', // 使用最大高度，内容少时不占位
                  overflowY: 'auto', 
                  paddingBottom: '24px' // 底部留白，防止被裁剪
                }}
              >
                {maintenanceRecords.length > 0 ? (
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
              <Empty description="暂无关联产线" className="py-12" />
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
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
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
    </div>
  )
}

export default DeviceManagement

