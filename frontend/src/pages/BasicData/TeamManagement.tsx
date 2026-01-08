import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Card, Button, Space, Tag, Modal, Form, 
  Input, Select, message, Tabs, Descriptions, 
  Empty, Typography, Row, Col, Statistic, Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  ReloadOutlined, 
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  ApartmentOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import axios from 'axios';
import {
  getStatusConfig,
  MAJOR_OPTIONS,
  getStaffLevelLabel,
  getProcessTypeLabel
} from '../../config/dictionaries';
import TreeTransfer from '../../components/TreeTransfer';

const { Text } = Typography;
const API_BASE_URL = '';

interface Staff {
  id: number;
  staffId: string;
  name: string;
  major: number;
  level: number;
  status: number;
}

interface Team {
  id: number;
  code: string;
  name: string;
  leaderId: number | null;
  leader?: {
    name: string;
  };
  stationId: number | null;
  station?: {
    id: number;
    name: string;
    code: string;
    status: number;
    productionLine?: {
      name: string;
      factory: {
        name: string;
      };
    };
  };
  shiftType: number;
  _count: {
    staffs: number;
  };
  staffs?: Staff[];
}

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [associatedCapabilities, setAssociatedCapabilities] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bindCapabilityModalOpen, setBindCapabilityModalOpen] = useState(false);
  const [unboundProcesses, setUnboundProcesses] = useState<any[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [form] = Form.useForm();
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 筛选状态
  const [filterCode, setFilterCode] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');


  // 联动数据
  const [stations, setStations] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // 渲染状态标签（用于显示工位状态等）
  const renderStatusTag = (status: number) => {
    const config = getStatusConfig(status);
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
    );
  };

  // 定义表格列
  const columns = [
    {
      title: '班组编号',
      dataIndex: 'code',
      key: 'code',
      width: '12%',
      render: (text: string) => <span className="business-code">{text}</span>
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: '12%'
    },
    {
      title: '绑定工位',
      dataIndex: 'station',
      key: 'station',
      width: '20%',
      render: (station: any) => station ? (
        <Space direction="vertical" size={0}>
          <Text>{station.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{station.code}</Text>
        </Space>
      ) : <Text type="secondary">未分配</Text>
    },
    {
      title: '班组长',
      dataIndex: ['leader', 'name'],
      key: 'leader',
      width: '10%',
      render: (val: string) => val || <Text type="secondary">-</Text>
    },
    {
      title: '人数',
      dataIndex: ['_count', 'staffs'],
      key: 'memberCount',
      width: '8%'
    },
    {
      title: '操作',
      key: 'action',
      width: '12%',
      render: (_: any, record: Team) => (
        <Space size="middle">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Popconfirm
            title="确定删除此班组吗？"
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const fetchTeams = useCallback(async (page?: number, size?: number, overrides?: any) => {
    setLoading(true);
    try {
      const params: any = {
        current: page || pagination.current,
        pageSize: size || pagination.pageSize
      };

      const sCode = overrides?.code !== undefined ? overrides.code : filterCode;
      const sName = overrides?.name !== undefined ? overrides.name : filterName;

      if (sCode) params.code = sCode;
      if (sName) params.name = sName;

      const response = await axios.get(`${API_BASE_URL}/api/teams`, { params });
      if (response.data.status === 'ok') {
        const { list, total, current, pageSize: pSize } = response.data.data;
        setTeams(list);
        setPagination({
          current,
          pageSize: pSize,
          total
        });

        // 如果当前有选中的班组，刷新其资源数据
        if (selectedTeam) {
          fetchResources(selectedTeam.id);
        }
      }
    } catch (error) {
      console.error('Fetch teams failed:', error);
      message.error('加载班组列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filterCode, filterName, selectedTeam]);

  const fetchResources = useCallback(async (id: number) => {
    setResourcesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams/${id}/resources`);
      if (response.data.status === 'ok') {
        setAssociatedCapabilities(response.data.data.capabilities || []);
        // 同步更新 selectedTeam 的 staffs，确保成员列表是最新的
        if (selectedTeam && selectedTeam.id === id) {
          setSelectedTeam(prev => prev ? { ...prev, staffs: response.data.data.staffs } : null);
        }
      }
    } catch (error) {
      message.error('加载班组资源失败');
    } finally {
      setResourcesLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchTeams(1);
  }, []);

  const fetchStations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stations`, { params: { limit: 1000 } });
      if (response.data.status === 'ok') {
        setStations(response.data.data.list);
      }
    } catch (error) {
      console.error('Fetch stations failed:', error);
    }
  };

  const fetchAvailableStaff = async (excludeTeamId?: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams/available-staff`, {
        params: excludeTeamId ? { excludeTeamId } : undefined
      });
      if (response.data.status === 'ok') {
        setAvailableStaff(response.data.data);
      }
    } catch (error) {
      console.error('Fetch staff failed:', error);
    }
  };

  const handleAdd = () => {
    setSelectedTeam(null);
    setSelectedMemberIds([]);
    form.resetFields();
    fetchStations();
    fetchAvailableStaff();
    setModalOpen(true);
  };

  const handleEdit = (record: Team) => {
    setSelectedTeam(record);
    const memberIds = record.staffs?.map(s => s.id) || [];
    setSelectedMemberIds(memberIds);
    fetchStations();
    // 编辑时需要把“当前班组成员”也放进可选列表里，否则穿梭框无法显示已选成员
    fetchAvailableStaff(record.id);
    form.setFieldsValue({
      ...record,
      memberIds
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/teams/${id}`);
      message.success('班组已删除');
      if (selectedTeam?.id === id) setSelectedTeam(null);
      fetchTeams();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async (forceUnbind = false) => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        shiftType: selectedTeam?.shiftType ?? 0,
        forceUnbind
      };

      if (selectedTeam) {
        await axios.put(`${API_BASE_URL}/api/teams/${selectedTeam.id}`, data);
        message.success('班组已更新');
      } else {
        await axios.post(`${API_BASE_URL}/api/teams`, data);
        message.success('班组已创建');
      }
      setModalOpen(false);
      fetchTeams();
    } catch (error: any) {
      if (error.response?.data?.error === 'UNBIND_CONFIRM_REQUIRED') {
        const stationName = error.response.data.stationName || '当前工位';
        Modal.confirm({
          title: '解绑确认',
          content: `该班组当前绑定在工位 [${stationName}] 上。将其状态改为"可用"将自动解除该绑定，是否继续？`,
          onOk: () => handleSave(true)
        });
      } else {
        message.error(error.response?.data?.message || '保存失败');
      }
    }
  };

  const updateTeamWithSafePayload = async (teamId: number, overrides: any = {}) => {
    // ⚠️ 注意：后端 updateTeam 的 memberIds 默认是 []，若不传会导致"清空组员"
    if (!selectedTeam) return;

    const memberIds = selectedTeam.staffs?.map(s => s.id) || [];
    const payload = {
      code: selectedTeam.code,
      name: selectedTeam.name,
      leaderId: selectedTeam.leaderId,
      stationId: selectedTeam.stationId,
      shiftType: selectedTeam.shiftType,
      memberIds,
      ...overrides
    };

    await axios.put(`${API_BASE_URL}/api/teams/${teamId}`, payload);
  };

  const handleUnbindMember = async (staffId: number) => {
    if (!selectedTeam) return;
    const currentMemberIds = selectedTeam.staffs?.map(s => s.id) || [];
    const nextMemberIds = currentMemberIds.filter(id => id !== staffId);
    const nextLeaderId =
      selectedTeam.leaderId && nextMemberIds.includes(selectedTeam.leaderId) ? selectedTeam.leaderId : null;

    try {
      await updateTeamWithSafePayload(selectedTeam.id, {
        memberIds: nextMemberIds,
        leaderId: nextLeaderId
      });
      message.success('组员已解绑');
      fetchTeams();
    } catch (error) {
      console.error('Unbind member failed:', error);
      message.error('解绑组员失败');
    }
  };

  const handleUnbindStation = async () => {
    if (!selectedTeam) return;
    try {
      await updateTeamWithSafePayload(selectedTeam.id, {
        stationId: null
      });
      message.success('工位已解绑');
      fetchTeams();
    } catch (error) {
      console.error('Unbind station failed:', error);
      message.error('解绑工位失败');
    }
  };

  const handleUnbindCapability = async (processId: number) => {
    if (!selectedTeam) return;
    try {
      await axios.post(`${API_BASE_URL}/api/teams/${selectedTeam.id}/unbind-capability`, { processId });
      message.success('能力标签已移除');
      fetchResources(selectedTeam.id);
    } catch (error) {
      message.error('移除失败');
    }
  };

  const handleOpenBindCapabilityModal = async () => {
    if (!selectedTeam) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/processes`, { params: { pageSize: 1000 } });
      const allProcesses = response.data.data.list;
      const associatedIds = associatedCapabilities.map(c => c.id);
      setUnboundProcesses(allProcesses.filter((p: any) => !associatedIds.includes(p.id)));
      setSelectedResourceIds([]);
      setBindCapabilityModalOpen(true);
    } catch (error) {
      message.error('加载工序列表失败');
    }
  };

  const handleBindCapabilities = async () => {
    if (!selectedTeam || selectedResourceIds.length === 0) return;
    try {
      await axios.post(`${API_BASE_URL}/api/teams/${selectedTeam.id}/bind-capabilities`, { processIds: selectedResourceIds });
      message.success('班组能力绑定成功');
      setBindCapabilityModalOpen(false);
      fetchResources(selectedTeam.id);
    } catch (error) {
      message.error('绑定失败');
    }
  };

  const handleTransferChange = (nextTargetKeys: any[]) => {
    const ids = nextTargetKeys.map(k => parseInt(k.toString()));
    setSelectedMemberIds(ids);
    form.setFieldsValue({ memberIds: ids });
    
    // 如果当前选中的 leader 不在新的成员列表中，清除 leader
    const currentLeaderId = form.getFieldValue('leaderId');
    if (currentLeaderId && !ids.includes(currentLeaderId)) {
      form.setFieldsValue({ leaderId: null });
    }
  };

  const tabItems = [
    {
      key: 'members',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><UserOutlined /> 组员列表 ({selectedTeam?.staffs?.length || 0})</span>,
      children: (
        <div className="py-4">
          <Table
            dataSource={selectedTeam?.staffs || []}
            rowKey="id"
            size="middle"
            pagination={false}
            columns={[
              { title: '姓名', dataIndex: 'name', key: 'name', width: '20%' },
              { 
                title: '工号', 
                dataIndex: 'staffId', 
                key: 'staffId', 
                width: '25%',
                render: (text: string) => <span className="business-code">{text}</span>
              },
              { 
                title: '专业', 
                dataIndex: 'major', 
                key: 'major',
                width: '25%',
                render: (val: number) => {
                  const major = MAJOR_OPTIONS.find(o => o.value === val);
                  return major?.label || '未知';
                }
              },
              { 
                title: '职级', 
                key: 'level',
                width: '22%',
                render: (_: any, record: Staff) => getStaffLevelLabel(record.major, record.level)
              },
              {
                title: '操作',
                key: 'action',
                width: '8%',
                render: (_: any, record: Staff) => (
                  <Popconfirm
                    title="确定解绑该组员？"
                    okText="确定"
                    cancelText="取消"
                    onConfirm={() => handleUnbindMember(record.id)}
                  >
                    <Button type="link" danger size="small" icon={<DisconnectOutlined />}>解绑</Button>
                  </Popconfirm>
                )
              }
            ]}
            locale={{ emptyText: <Empty description="该班组暂无成员" /> }}
          />
        </div>
      )
    },
    {
      key: 'capabilities',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ApartmentOutlined /> 班组能力 ({associatedCapabilities.length})</span>,
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
              { title: '工序类型', dataIndex: 'type', key: 'type', width: '30%', render: (val: number) => val !== undefined && val !== null ? getProcessTypeLabel(val) : '-' },
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
    },
    {
      key: 'station',
      label: <span style={{ fontSize: '15px', fontWeight: 500 }}><ApartmentOutlined /> 工位信息</span>,
      children: (
        <div className="py-8 px-4">
          {selectedTeam?.station ? (
            <Card className="shadow-sm border-gray-100">
              <Descriptions
                title={
                  <div className="flex items-center justify-between">
                    <span>关联工位详情</span>
                    <Popconfirm
                      title="确定解绑该工位？"
                      okText="确定"
                      cancelText="取消"
                      onConfirm={handleUnbindStation}
                    >
                      <Button danger type="link" size="small" icon={<DisconnectOutlined />}>解绑工位</Button>
                    </Popconfirm>
                  </div>
                }
                column={2}
                bordered
                size="small"
              >
                <Descriptions.Item label="工位名称" span={2}>{selectedTeam.station.name}</Descriptions.Item>
                <Descriptions.Item label="工位代码">{selectedTeam.station.code}</Descriptions.Item>
                <Descriptions.Item label="当前状态">{renderStatusTag(selectedTeam.station.status)}</Descriptions.Item>
                <Descriptions.Item label="所属产线">{selectedTeam.station.productionLine?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="所属工厂">{selectedTeam.station.productionLine?.factory?.name || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Empty description="该班组尚未绑定工位" className="py-12" />
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* 统计看板 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic title="班组总数" value={pagination.total} valueStyle={{ color: '#1890ff', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic title="已绑定工位" value={teams.filter(t => t.stationId).length} valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
            <Statistic title="未绑定工位" value={teams.filter(t => !t.stationId).length} valueStyle={{ color: '#faad14', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card className="shadow-sm border-none" styles={{ body: { padding: '16px' } }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space size="middle">
              <span className="text-gray-500">班组编号:</span>
              <Input 
                placeholder="搜索编号" 
                style={{ width: 160 }}
                allowClear
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                onPressEnter={() => fetchTeams(1)}
              />
              <span className="text-gray-500 ml-2">班组名称:</span>
              <Input
                placeholder="搜索名称"
                style={{ width: 160 }}
                allowClear
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onPressEnter={() => fetchTeams(1)}
              />
            </Space>
          </Col>
          <Col flex="auto" className="flex justify-end">
            <Space size="middle">
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchTeams(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => {
                setFilterCode('');
                setFilterName('');
                fetchTeams(1, pagination.pageSize, { code: '', name: '' });
              }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 班组列表 */}
      <Card 
        title={
          <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
            <Space size={12}>
              <TeamOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>班组列表</span>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建班组</Button>
          </div>
        }
        className="shadow-sm border-none"
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '0 20px' }, body: { padding: '16px' } }}
      >
        <Table
          dataSource={teams}
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
            onChange: (page, size) => fetchTeams(page, size)
          }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedTeam(record);
              fetchResources(record.id);
            },
            className: `cursor-pointer transition-all ${selectedTeam?.id === record.id ? 'selected-row' : ''}`,
            style: {
              borderLeft: `4px solid #1890ff`,
              marginBottom: '4px'
            }
          })}
        />
      </Card>

      {/* 详情页签 */}
      <Card className="flex-1 shadow-sm border-none" styles={{ body: { padding: '0 24px', minHeight: '300px' } }}>
        {!selectedTeam ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <p className="text-sm">请在上方列表中点击选中一个班组</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="members" items={tabItems} className="h-full" destroyOnHidden />
        )}
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={selectedTeam ? '编辑班组' : '新建班组'}
        open={modalOpen}
        onOk={() => handleSave()}
        onCancel={() => setModalOpen(false)}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="班组编号" rules={[{ required: true }]}>
                <Input placeholder="输入编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="班组名称" rules={[{ required: true }]}>
                <Input placeholder="输入名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stationId" label="绑定工位">
                <Select
                  placeholder="选择工位"
                  allowClear
                  popupMatchSelectWidth={false}
                  styles={{ popup: { root: { minWidth: 350 } } }}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                >
                  {stations.map(s => (
                    <Select.Option
                      key={s.id}
                      value={s.id}
                      label={`[${s.code}] ${s.name} ${s.productionLine ? `- ${s.productionLine.name}` : ''}`}
                    >
                      <span className="text-gray-400">[{s.code}]</span> {s.name} {s.productionLine ? `- ${s.productionLine.name}` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="leaderId" label="指定班组长">
                <Select placeholder="请先选择组员" allowClear popupMatchSelectWidth={false}>
                  {(availableStaff.filter(s => selectedMemberIds.includes(s.id)) || []).map(s => (
                    <Select.Option key={s.id} value={s.id}>{s.name} ({s.staffId})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="memberIds" label="选择组员" rules={[{ required: true, message: '请至少选择一名组员' }]}>
            <TreeTransfer
              dataSource={availableStaff}
              targetKeys={selectedMemberIds.map(id => id.toString())}
              onChange={handleTransferChange}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 绑定能力/工序 Modal */}
      <Modal
        title="为班组添加能力标签"
        open={bindCapabilityModalOpen}
        onOk={handleBindCapabilities}
        onCancel={() => setBindCapabilityModalOpen(false)}
        width={600}
      >
        <div className="mb-4 text-gray-500 italic flex items-center gap-2">
          <InfoCircleOutlined />
          <span>请从标准工序库中选择该班组具备处理能力的工序</span>
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
  );
};

export default TeamManagement;
