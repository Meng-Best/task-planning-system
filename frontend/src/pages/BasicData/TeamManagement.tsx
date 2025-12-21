import { useState, useEffect, useCallback } from 'react'
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
  Tree,
  Transfer,
  Badge,
  Avatar
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  AuditOutlined,
  BankOutlined,
  IdcardOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { 
  BASIC_DATA_STATUS, 
  getStatusConfig,
  getStaffLevelLabel,
  MAJOR_OPTIONS,
  SHIFT_TYPES
} from '../../config/dictionaries'

const { Text } = Typography;

// 接口定义
interface Staff {
  id: number;
  staffId: string;
  name: string;
  major: number;
  level: number;
  status: number;
}

interface ProductionLine {
  id: number;
  name: string;
  code: string;
  factory: {
    name: string;
  };
}

interface Team {
  id: number;
  code: string;
  name: string;
  leaderId: number | null;
  leader?: {
    name: string;
  };
  productionLineId: number | null;
  productionLine?: {
    name: string;
    code: string;
    factory: {
      name: string;
    };
  };
  status: number;
  shiftType: number;
  _count: {
    staffs: number;
  };
  staffs?: Staff[];
}

const API_BASE_URL = 'http://localhost:3001'

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [form] = Form.useForm()
  
  // 数据字典/选项
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [currentLeaderId, setCurrentLeaderId] = useState<number | undefined>(undefined)

  // 筛选状态
  const [filterCode, setFilterCode] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 渲染状态标签 (复用统一风格)
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

  // 加载班组列表
  const fetchTeams = async (page?: number, size?: number, overrides?: any) => {
    setLoading(true)
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      }
      
      const sCode = overrides?.code !== undefined ? overrides.code : filterCode
      const sName = overrides?.name !== undefined ? overrides.name : filterName
      const sStatus = overrides?.status !== undefined ? overrides.status : filterStatus

      if (sCode) params.code = sCode
      if (sName) params.name = sName
      if (sStatus !== undefined) params.status = sStatus

      const response = await axios.get(`${API_BASE_URL}/api/teams`, { params })
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize } = response.data.data
        setTeams(list)
        setPagination({ current, pageSize, total })
        
        // 如果有选中的，保持选中并更新其详细数据 (包含 staffs)
        if (selectedTeam) {
          const updated = list.find((t: Team) => t.id === selectedTeam.id)
          if (updated) {
            // 需要单独获取详情以包含组员
            const detailRes = await axios.get(`${API_BASE_URL}/api/teams`, { 
              params: { code: updated.code } 
            })
            if (detailRes.data.data.list.length > 0) {
              // 这里的后端 list 模式可能不直接返回全组员，
              // 但实际应用中，点击行时我们会再次处理或通过 include 获取
              // 简单处理：更新基础信息
              setSelectedTeam(detailRes.data.data.list[0])
            }
          }
        }
      }
    } catch (error) {
      message.error("获取班组列表失败")
    } finally {
      setLoading(false)
    }
  }

  // 获取产线列表
  const fetchProductionLines = async () => {
    try {
      // 注意：这里需要获取所有产线以供下拉框选择，不应分页，或者请求一个较大的 pageSize
      const res = await axios.get(`${API_BASE_URL}/api/production-lines`, {
        params: { current: 1, pageSize: 1000 }
      })
      if (res.data.status === 'ok') {
        // 兼容后端分页结构
        const lineList = Array.isArray(res.data.data) ? res.data.data : (res.data.data.list || [])
        setProductionLines(lineList)
      }
    } catch (error) {
      console.error("Fetch production lines failed", error)
    }
  }

  // 获取可选人员
  const fetchAvailableStaff = async (excludeTeamId?: number) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teams/available-staff`, {
        params: { excludeTeamId }
      })
      if (res.data.status === 'ok') {
        setAvailableStaff(res.data.data)
      }
    } catch (error) {
      console.error("Fetch available staff failed", error)
    }
  }

  useEffect(() => {
    fetchTeams(1)
    fetchProductionLines()
  }, [])

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/teams/${id}`)
      message.success('班组已删除')
      if (selectedTeam?.id === id) setSelectedTeam(null)
      fetchTeams()
    } catch (error) {
      message.error("删除失败")
    }
  }

  // 打开弹窗
  const handleOpenModal = (team?: Team) => {
    setEditingTeam(team || null)
    fetchAvailableStaff(team?.id)
    
    if (team) {
      const memberIds = team.staffs?.map(s => s.id) || []
      setSelectedMemberIds(memberIds)
      setCurrentLeaderId(team.leaderId || undefined)
      form.setFieldsValue({
        ...team,
        memberIds
      })
    } else {
      setSelectedMemberIds([])
      setCurrentLeaderId(undefined)
      form.resetFields()
      form.setFieldsValue({ status: 0, shiftType: 0 })
    }
    setModalOpen(true)
  }

  // 保存数据
  const handleSave = async (forceUnbind = false) => {
    try {
      const values = await form.validateFields()
      const postData = {
        ...values,
        memberIds: selectedMemberIds,
        leaderId: currentLeaderId,
        forceUnbind
      }

      if (editingTeam) {
        const response = await axios.put(`${API_BASE_URL}/api/teams/${editingTeam.id}`, postData)
        if (response.data.status === 'ok') {
          message.success('班组更新成功')
          setModalOpen(false)
          fetchTeams()
        }
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/teams`, postData)
        if (response.data.status === 'ok') {
          message.success('班组创建成功')
          setModalOpen(false)
          fetchTeams()
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

      if (error.response?.status === 409) {
        message.error(error.response.data.message)
      } else if (error.errorFields) {
        // 表单验证错误
        return
      } else {
        message.error("保存失败")
      }
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      width: '10%',
      render: (status: number) => renderStatusTag(status)
    },
    {
      title: '所属班次',
      dataIndex: 'shiftType',
      width: '12%',
      render: (type: number) => {
        const config = SHIFT_TYPES.find(s => s.value === type)
        return config ? (
          <Tag color={config.color} style={{ borderRadius: '4px' }}>
            {config.label}
          </Tag>
        ) : <Text type="secondary">-</Text>
      }
    },
    {
      title: '班组编号',
      dataIndex: 'code',
      width: '15%',
      render: (code: string) => <Text strong className="text-blue-600">{code}</Text>
    },
    {
      title: '班组名称',
      dataIndex: 'name',
      width: '15%',
    },
    {
      title: '绑定产线',
      dataIndex: 'productionLine',
      width: '20%',
      render: (line: any) => line ? (
        <Space direction="vertical" size={0}>
          <Text>{line.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{line.code}</Text>
        </Space>
      ) : <Text type="secondary">未分配</Text>
    },
    {
      title: '班组长',
      dataIndex: ['leader', 'name'],
      width: '12%',
      render: (name: string) => name || <Text type="secondary">-</Text>
    },
    {
      title: '人数',
      dataIndex: ['_count', 'staffs'],
      width: '10%',
      render: (count: number) => <span>{count}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (_: any, record: Team) => (
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
            title="确定要删除该班组吗？"
            description="删除班组后，所属人员将变为“未归属”状态。"
            onConfirm={(e) => {
              e?.stopPropagation()
              handleDelete(record.id)
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small"
              icon={<DeleteOutlined />} 
              danger 
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
    <div className="team-management flex flex-col gap-4 p-2">
      {/* 筛选区域 */}
      <Card className="shadow-sm border-0" styles={{ body: { padding: '16px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Space size={8}>
              <label className="text-gray-600">班组编号:</label>
              <Input
                placeholder="搜索编号"
                style={{ width: 140 }}
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                onPressEnter={() => fetchTeams(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space size={8}>
              <label className="text-gray-600">班组名称:</label>
              <Input
                placeholder="搜索名称"
                style={{ width: 140 }}
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onPressEnter={() => fetchTeams(1)}
              />
            </Space>
          </Col>
          <Col>
            <Space size={8}>
              <label className="text-gray-600">状态:</label>
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
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchTeams(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterCode('')
                setFilterName('')
                setFilterStatus(undefined)
                fetchTeams(1, pagination.pageSize, { code: '', name: '', status: undefined })
              }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主表格区域 */}
      <Card 
        className="shadow-sm" 
        title={
          <div className="flex items-center justify-between">
            <Space size={8}>
              <TeamOutlined className="text-blue-500" />
              <span className="font-bold">班组列表</span>
            </Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => handleOpenModal()}
            >
              新建班组
            </Button>
          </div>
        }
        styles={{ body: { padding: '16px' } }}
      >
        <Table
          dataSource={teams}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            position: ['bottomLeft'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            style: { marginLeft: '8px', marginTop: '16px' },
            onChange: (page, size) => fetchTeams(page, size)
          }}
          onRow={(record) => {
            const statusConfig = getStatusConfig(record.status);
            return {
              onClick: () => setSelectedTeam(record),
              className: `cursor-pointer transition-all duration-200 ${selectedTeam?.id === record.id ? 'selected-row' : ''}`,
              style: {
                borderLeft: `4px solid ${statusConfig.themeColor}`
              }
            };
          }}
          bordered={false}
          size="middle"
        />
      </Card>

      {/* 详情页签区域 */}
      <Card className="flex-1 shadow-sm overflow-hidden" styles={{ body: { padding: '0 24px' } }}>
        {selectedTeam ? (
          <Tabs 
            defaultActiveKey="members" 
            className="h-full"
            items={[
              {
                key: 'members',
                label: (
                  <Space>
                    <TeamOutlined />
                    组员列表
                    <Badge count={selectedTeam._count.staffs} size="small" style={{ backgroundColor: '#52c41a' }} />
                  </Space>
                ),
                children: (
                  <div className="overflow-y-auto overflow-x-hidden py-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                    <Table
                      dataSource={selectedTeam.staffs || []}
                      size="small"
                      pagination={false}
                      rowKey="id"
                      columns={[
                        { title: '工号', dataIndex: 'staffId', width: '25%' },
                        { title: '姓名', dataIndex: 'name', width: '25%' },
                        { 
                          title: '专业', 
                          dataIndex: 'major', 
                          width: '25%',
                          render: (m: number) => MAJOR_OPTIONS.find(o => o.value === m)?.label || '未知'
                        },
                        { 
                          title: '职级', 
                          render: (_: any, r: Staff) => getStaffLevelLabel(r.major, r.level) 
                        }
                      ]}
                    />
                  </div>
                )
              },
              {
                key: 'line',
                label: (
                  <Space>
                    <BankOutlined />
                    产线信息
                  </Space>
                ),
                children: (
                  <div className="overflow-y-auto overflow-x-hidden py-4" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                    {selectedTeam?.productionLine ? (
                      <div className="p-4 mt-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                        <Descriptions column={2} size="small">
                          <Descriptions.Item label="产线名称">{selectedTeam.productionLine.name}</Descriptions.Item>
                          <Descriptions.Item label="产线编码">{selectedTeam.productionLine.code}</Descriptions.Item>
                          <Descriptions.Item label="所属工厂">{selectedTeam.productionLine.factory.name}</Descriptions.Item>
                        </Descriptions>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该班组未绑定产线" />
                      </div>
                    )}
                  </div>
                )
              }
            ]}
          />
        ) : (
          <div className="h-full flex items-center justify-center py-12">
            <Empty description="请从上方列表中选择班组以查看详情" />
          </div>
        )}
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingTeam ? '编辑班组' : '新建班组'}
        open={modalOpen}
        onOk={() => handleSave()}
        onCancel={() => setModalOpen(false)}
        width={700}
        destroyOnHidden
        styles={{ body: { paddingTop: '20px' } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="班组名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如：总装一班" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="班组编号" rules={[{ required: true, message: '请输入编号' }]}>
                <Input placeholder="例如：TEAM-001" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="productionLineId" label="绑定产线">
                <Select 
                  placeholder="选择产线" 
                  allowClear
                  popupMatchSelectWidth={false}
                  styles={{ popup: { root: { minWidth: 350 } } }}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                >
                  {productionLines.map(line => (
                    <Select.Option 
                      key={line.id} 
                      value={line.id}
                      label={`[${line.code}] ${line.factory.name} - ${line.name}`}
                    >
                      <span className="text-gray-400">[{line.code}]</span> {line.factory.name} - {line.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="shiftType" label="所属班次" rules={[{ required: true, message: '请选择班次' }]}>
                <Select placeholder="选择班次">
                  {SHIFT_TYPES.map(s => (
                    <Select.Option key={s.value} value={s.value}>
                      <Space>
                        <Badge color={s.color} />
                        {s.label}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="status" label="状态">
                <Select placeholder="选择状态">
                  {BASIC_DATA_STATUS.map(s => (
                    <Select.Option key={s.value} value={s.value}>
                      <Space size={4}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.themeColor }} />
                        {s.label}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="选择组员" required tooltip="只能选择未分配班组的人员">
            <Transfer
              dataSource={availableStaff.map(s => ({
                key: s.id.toString(),
                title: s.name,
                staffId: s.staffId,
                major: s.major,
                majorLabel: MAJOR_OPTIONS.find(o => o.value === s.major)?.label
              }))}
              targetKeys={selectedMemberIds.map(id => id.toString())}
              onChange={(nextKeys) => {
                const nextIds = nextKeys.map(key => parseInt(key))
                setSelectedMemberIds(nextIds)
                if (currentLeaderId && !nextIds.includes(currentLeaderId)) {
                  setCurrentLeaderId(undefined)
                }
              }}
              render={item => item.title}
              showSelectAll={false}
              listStyle={{ width: '100%', height: 400 }}
              titles={['可选人员 (按专业)', '已选组员']}
            >
              {({ direction, onItemSelect, selectedKeys }) => {
                if (direction === 'left') {
                  const treeData = MAJOR_OPTIONS.map(major => ({
                    title: major.label,
                    key: `major-${major.value}`,
                    children: availableStaff
                      .filter(s => s.major === major.value)
                      .map(s => ({
                        title: `${s.name} (${s.staffId})`,
                        key: s.id.toString(),
                      }))
                  })).filter(m => m.children.length > 0);

                  return (
                    <div style={{ height: 340, overflowY: 'auto', padding: '4px 8px' }}>
                      <Tree
                        blockNode
                        checkable
                        checkStrictly
                        treeData={treeData}
                        checkedKeys={selectedKeys.concat(selectedMemberIds.map(id => id.toString()))}
                        onCheck={(_, { node: { key } }) => {
                          if (key?.toString().startsWith('major-')) return;
                          onItemSelect(key as string, !selectedKeys.includes(key as string));
                        }}
                        onSelect={(_, { node: { key } }) => {
                          if (key?.toString().startsWith('major-')) return;
                          onItemSelect(key as string, !selectedKeys.includes(key as string));
                        }}
                      />
                    </div>
                  );
                }
              }}
            </Transfer>
          </Form.Item>

          <Form.Item label="指定班组长" required tooltip="必须先选择组员，才能从组员中指定班组长">
            <Select
              placeholder={selectedMemberIds.length > 0 ? "从已选组员中指定班组长" : "请先选择组员"}
              disabled={selectedMemberIds.length === 0}
              value={currentLeaderId}
              onChange={setCurrentLeaderId}
              allowClear
            >
              {selectedMemberIds.map(id => {
                const staff = availableStaff.find(s => s.id === id)
                return (
                  <Select.Option key={id} value={id}>
                    <Space>
                      <UserOutlined />
                      {staff?.name} ({staff?.staffId})
                    </Space>
                  </Select.Option>
                )
              })}
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

export default TeamManagement

