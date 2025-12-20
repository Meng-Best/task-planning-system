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
  Tabs,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Empty,
  Tag,
  Typography,
  Statistic
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  IdcardOutlined,
  AuditOutlined
} from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import { 
  BASIC_DATA_STATUS, 
  getStatusConfig, 
  MAJOR_OPTIONS,
  getStaffLevelLabel,
  getStaffLevelOptions
} from '../../config/dictionaries'

const { Text } = Typography;

// 人员接口定义
interface Staff {
  id: number
  staffId: string
  name: string
  major: number
  level: number
  status: number
  createdAt: string
  updatedAt: string
}

const API_BASE_URL = 'http://localhost:3001'

const StaffManagement: React.FC = () => {
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [form] = Form.useForm()
  
  // 筛选状态
  const [filterStaffId, setFilterStaffId] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterMajor, setFilterMajor] = useState<number | undefined>(undefined)
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

  // 动态职级选项
  const [currentMajorInForm, setCurrentMajorInForm] = useState<number>(0)

  // 统一渲染状态标签
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

  // 加载数据
  const fetchStaffs = async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      }
      
      // 处理筛选条件（支持外部覆盖，用于重置）
      const sId = overrides?.staffId !== undefined ? overrides.staffId : filterStaffId
      const sName = overrides?.name !== undefined ? overrides.name : filterName
      const sMajor = overrides?.major !== undefined ? overrides.major : filterMajor
      const sStatus = overrides?.status !== undefined ? overrides.status : filterStatus

      if (sId) params.staffId = sId
      if (sName) params.name = sName
      if (sMajor !== undefined) params.major = sMajor
      if (sStatus !== undefined) params.status = sStatus

      const response = await axios.get(`${API_BASE_URL}/api/staffs`, { params })
      if (response.data.status === 'ok') {
        const { list, total, availableCount, unavailableCount, occupiedCount, current, pageSize } = response.data.data
        setStaffs(list)
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
        
        // 更新选中的人员
        if (selectedStaff) {
          const updated = list.find((s: Staff) => s.id === selectedStaff.id)
          setSelectedStaff(updated || null)
        }
      }
    } catch (error: any) {
      message.error("获取人员列表失败")
      console.error('Fetch Staffs Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffs(1)
  }, [filterMajor, filterStatus])

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/staffs/${id}`)
      message.success('人员已删除')
      if (selectedStaff?.id === id) setSelectedStaff(null)
      fetchStaffs()
    } catch (error) {
      message.error("删除失败")
    }
  }

  // 打开弹窗
  const handleOpenModal = (staff?: Staff) => {
    setEditingStaff(staff || null)
    if (staff) {
      setCurrentMajorInForm(staff.major)
      form.setFieldsValue(staff)
    } else {
      setCurrentMajorInForm(0)
      form.resetFields()
      form.setFieldsValue({ status: 0, major: 0, level: 0 })
    }
    setModalOpen(true)
  }

  // 保存数据
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingStaff) {
        await axios.put(`${API_BASE_URL}/api/staffs/${editingStaff.id}`, values)
        message.success('人员信息已更新')
      } else {
        await axios.post(`${API_BASE_URL}/api/staffs`, values)
        message.success('人员创建成功')
      }
      setModalOpen(false)
      fetchStaffs()
    } catch (error: any) {
      const msg = error.response?.data?.message || "保存失败"
      message.error(msg)
    }
  }

  const columns = [
    {
      title: '工号',
      dataIndex: 'staffId',
      key: 'staffId',
      width: '15%',
      render: (text: string) => <span className="font-mono font-bold text-blue-600">{text}</span>
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: '15%',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      width: '15%',
      render: (major: number) => MAJOR_OPTIONS.find(o => o.value === major)?.label
    },
    {
      title: '职级/职称',
      key: 'level',
      width: '20%',
      render: (_: any, record: Staff) => getStaffLevelLabel(record.major, record.level)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status: number) => renderStatusTag(status)
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (_: any, record: Staff) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenModal(record); }}>编辑</Button>
          <Popconfirm title="确定删除此人员吗？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="staff-management flex flex-col gap-4 p-2">
      {/* 顶部：统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="shadow-sm border-0" bodyStyle={{ padding: '20px' }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">人员总数</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" bodyStyle={{ padding: '20px' }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">可上岗</span>}
              value={stats.available}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" bodyStyle={{ padding: '20px' }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">已上岗</span>}
              value={stats.occupied}
              valueStyle={{ color: '#faad14', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-0" bodyStyle={{ padding: '20px' }}>
            <Statistic
              title={<span className="text-gray-500 font-medium">休息中</span>}
              value={stats.unavailable}
              valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card className="shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Space>
              <span className="text-gray-500">工号:</span>
              <Input 
                placeholder="请输入工号" 
                style={{ width: 140 }} 
                value={filterStaffId}
                onChange={e => setFilterStaffId(e.target.value)}
                onPressEnter={() => fetchStaffs(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span className="text-gray-500">姓名:</span>
              <Input 
                placeholder="请输入姓名" 
                style={{ width: 140 }} 
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onPressEnter={() => fetchStaffs(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span className="text-gray-500">专业:</span>
              <Select
                placeholder="全部专业"
                style={{ width: 130 }}
                allowClear
                options={MAJOR_OPTIONS}
                onChange={setFilterMajor}
                value={filterMajor}
              />
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
                onClick={() => fetchStaffs(1)}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  setFilterStaffId('')
                  setFilterName('')
                  setFilterMajor(undefined)
                  setFilterStatus(undefined)
                  fetchStaffs(1, pagination.pageSize, { staffId: '', name: '', major: undefined, status: undefined })
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
              <UserOutlined className="text-blue-500" />
              <span className="font-bold">人员列表</span>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              新建人员
            </Button>
          </div>
        }
        className="shadow-sm"
        bodyStyle={{ padding: '16px' }}
      >
        <Table
          dataSource={staffs}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          bordered={false}
          pagination={{
            position: ['bottomLeft'],
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条数据`,
            style: { marginLeft: '8px', marginTop: '16px' },
            onChange: (page, size) => fetchStaffs(page, size)
          }}
          onRow={(record) => {
            const statusConfig = getStatusConfig(record.status);
            return {
              onClick: () => setSelectedStaff(record),
              className: `cursor-pointer transition-all duration-200 ${selectedStaff?.id === record.id ? 'selected-row' : ''}`,
              style: {
                borderLeft: `4px solid ${statusConfig.themeColor}`
              }
            };
          }}
        />
      </Card>

      {/* 详情区域 */}
      <Card className="flex-1 shadow-sm overflow-hidden" bodyStyle={{ height: '100%', padding: '0 24px' }}>
        {selectedStaff ? (
          <Tabs defaultActiveKey="info" className="h-full">
            <Tabs.TabPane tab="基本信息" key="info">
              <div className="overflow-y-auto overflow-x-hidden py-8 px-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                <Row gutter={48}>
                  <Col span={6}>
                    <div className="flex flex-col items-center justify-center p-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 m-12">
                      {/* <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <TeamOutlined className="text-4xl text-blue-500" />
                      </div> */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-800 mb-1">{selectedStaff.name}</div>
                        <Tag color="blue" className="font-mono rounded-full m-4">{selectedStaff.staffId}</Tag>
                      </div>
                    </div>
                  </Col>
                  <Col span={18}>
                    <div className="bg-white rounded-xl">
                      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <IdcardOutlined className="text-blue-500 text-lg" />
                        <span className="text-lg font-bold text-gray-700">人事档案摘要</span>
                      </div>
                      <Descriptions column={2} labelStyle={{ color: '#8c8c8c', width: '120px' }}>
                        <Descriptions.Item label="人员姓名"><Text strong>{selectedStaff.name}</Text></Descriptions.Item>
                        <Descriptions.Item label="人员工号"><Text className="font-mono">{selectedStaff.staffId}</Text></Descriptions.Item>
                        <Descriptions.Item label="所属专业">
                          <Tag color="cyan">{MAJOR_OPTIONS.find(o => o.value === selectedStaff.major)?.label}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="职级/职称">
                          <Tag color="purple">{getStaffLevelLabel(selectedStaff.major, selectedStaff.level)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="当前状态">{renderStatusTag(selectedStaff.status)}</Descriptions.Item>
                        <Descriptions.Item label="最后更新">{dayjs(selectedStaff.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                      </Descriptions>
                      <div className="mt-8 p-4 bg-blue-50/30 rounded-lg border border-blue-100/50 flex items-start gap-3">
                        <AuditOutlined className="text-blue-500 mt-1" />
                        <div>
                          <div className="text-sm font-bold text-blue-800 mb-0.5">资源分配状态</div>
                          <div className="text-xs text-blue-600/80">该人员目前状态为{getStatusConfig(selectedStaff.status).label}，参与任务排程时将遵循此状态。</div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Tabs.TabPane>
          </Tabs>
        ) : (
          <div className="h-full flex items-center justify-center py-12">
            <Empty description="请从上方列表中选择人员以查看详情" />
          </div>
        )}
      </Card>

      {/* 弹窗 */}
      <Modal
        title={editingStaff ? '编辑人员' : '新建人员'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="staffId" label="工号" rules={[{ required: true, message: '请输入工号' }]}>
                <Input placeholder="请输入工号" disabled={!!editingStaff} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="major" label="专业" rules={[{ required: true }]}>
                <Select options={MAJOR_OPTIONS} onChange={val => setCurrentMajorInForm(val)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="职级/职称" rules={[{ required: true }]}>
                <Select options={getStaffLevelOptions(currentMajorInForm)} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
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
        </Form>
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

export default StaffManagement

