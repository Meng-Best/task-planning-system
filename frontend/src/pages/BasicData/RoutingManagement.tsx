import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Space,
    Button,
    Input,
    Modal,
    Form,
    message,
    Row,
    Col,
    Popconfirm,
    Tabs,
    Tag,
    Select,
    InputNumber
} from 'antd';
import {
    PartitionOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

interface Routing {
    id: number;
    code: string;
    name: string;
    type: string;
    status: string;
    description: string;
}

interface RoutingProcess {
    id: number;
    routingId: number;
    seq: number;
    code: string;
    name: string;
    description: string;
}

interface Process {
    id: number;
    code: string;
    name: string;
    type: string;
    description: string;
}

const RoutingManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Routing[]>([]);
    const [selectedRouting, setSelectedRouting] = useState<Routing | null>(null);

    // 工序状态
    const [processes, setProcesses] = useState<RoutingProcess[]>([]);
    const [processesLoading, setProcessesLoading] = useState(false);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [editingProcess, setEditingProcess] = useState<RoutingProcess | null>(null);
    const [processForm] = Form.useForm();

    // 标准工序库
    const [standardProcesses, setStandardProcesses] = useState<Process[]>([]);
    const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRouting, setEditingRouting] = useState<Routing | null>(null);
    const [form] = Form.useForm();

    const fetchRoutings = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/routings`);
            if (response.data.status === 'ok') {
                setData(response.data.data);
            }
        } catch (error) {
            message.error('获取工艺路线列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchProcesses = async (routingId: number) => {
        setProcessesLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/routings/${routingId}/processes`);
            if (response.data.status === 'ok') {
                // 按seq排序
                const sortedProcesses = response.data.data.sort((a: RoutingProcess, b: RoutingProcess) => a.seq - b.seq);
                setProcesses(sortedProcesses);
            }
        } catch (error) {
            message.error('获取工序配置失败');
        } finally {
            setProcessesLoading(false);
        }
    };

    const fetchStandardProcesses = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/processes`);
            if (response.data.status === 'ok') {
                setStandardProcesses(response.data.data);
            }
        } catch (error) {
            message.error('获取标准工序库失败');
        }
    };

    useEffect(() => {
        fetchRoutings();
    }, []);

    useEffect(() => {
        if (selectedRouting) {
            fetchProcesses(selectedRouting.id);
        } else {
            setProcesses([]);
        }
    }, [selectedRouting]);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        fetchRoutings();
    };

    const handleOpenModal = (record?: Routing) => {
        if (record) {
            setEditingRouting(record);
            form.setFieldsValue(record);
        } else {
            setEditingRouting(null);
            form.resetFields();
            form.setFieldsValue({ status: 'active' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editingRouting) {
                await axios.put(`${API_BASE_URL}/api/routings/${editingRouting.id}`, values);
                message.success('更新工艺路线成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/routings`, values);
                message.success('新增工艺路线成功');
            }
            setIsModalOpen(false);
            fetchRoutings();
        } catch (error) {
            message.error('保存失败');
        }
    };

    const handleOpenProcessModal = (record?: RoutingProcess) => {
        if (record) {
            // 编辑模式
            setEditingProcess(record);
            setSelectedProcessId(null);
        } else {
            // 新增模式
            setEditingProcess(null);
            setSelectedProcessId(null);
            // 加载标准工序库
            fetchStandardProcesses();
        }
        setIsProcessModalOpen(true);
    };

    // Modal 打开后的回调，用于初始化表单
    const handleProcessModalAfterOpen = (open: boolean) => {
        if (open) {
            if (editingProcess) {
                processForm.setFieldsValue(editingProcess);
            } else {
                processForm.resetFields();
                // 自动计算下一个工序号
                const nextSeq = processes.length > 0 ? Math.max(...processes.map(p => p.seq)) + 10 : 10;
                processForm.setFieldsValue({ seq: nextSeq });
            }
        }
    };

    // 处理标准工序选择
    const handleProcessSelect = (processId: number) => {
        setSelectedProcessId(processId);
        const selectedProcess = standardProcesses.find(p => p.id === processId);
        if (selectedProcess) {
            processForm.setFieldsValue({
                code: selectedProcess.code,
                name: selectedProcess.name,
                description: selectedProcess.description
            });
        }
    };

    const handleSaveProcess = async (values: any) => {
        if (!selectedRouting) return;
        try {
            if (editingProcess) {
                await axios.put(`${API_BASE_URL}/api/routings/processes/${editingProcess.id}`, values);
                message.success('更新工序成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/routings/${selectedRouting.id}/processes`, values);
                message.success('新增工序成功');
            }
            setIsProcessModalOpen(false);
            fetchProcesses(selectedRouting.id);
        } catch (error) {
            message.error('保存工序失败');
        }
    };

    const handleDeleteProcess = async (id: number) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/routings/processes/${id}`);
            message.success('删除工序成功');
            if (selectedRouting) fetchProcesses(selectedRouting.id);
        } catch (error) {
            message.error('删除工序失败');
        }
    };

    const filteredData = data.filter(item => {
        const matchCode = (item.code || '').toLowerCase().includes(filterCode.toLowerCase());
        const matchName = (item.name || '').toLowerCase().includes(filterName.toLowerCase());
        return matchCode && matchName;
    });

    const columns = [
        { title: '工艺路线编号', dataIndex: 'code', key: 'code', width: '15%' },
        { title: '工艺路线名称', dataIndex: 'name', key: 'name', width: '20%' },
        { title: '工艺路线类型', dataIndex: 'type', key: 'type', width: '15%' },
        { 
            title: '状态', 
            dataIndex: 'status', 
            key: 'status', 
            width: '15%',
            render: (status: string) => {
                const color = status === 'active' ? 'green' : 'orange';
                const text = status === 'active' ? '启用' : '禁用';
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: '操作',
            key: 'action',
            width: '15%',
            render: (_: any, record: Routing) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenModal(record); }}>编辑</Button>
                    <Popconfirm title="确定删除该工艺路线？" onConfirm={async (e) => {
                        e?.stopPropagation();
                        try {
                            await axios.delete(`${API_BASE_URL}/api/routings/${record.id}`);
                            message.success('删除成功');
                            if (selectedRouting?.id === record.id) setSelectedRouting(null);
                            fetchRoutings();
                        } catch (error) {
                            message.error('删除失败');
                        }
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const processColumns = [
        {
            title: '顺序',
            dataIndex: 'seq',
            key: 'seq',
            width: '10%',
            render: (seq: number) => (
                <Tag color="blue" style={{ fontSize: '14px', fontWeight: 600 }}>
                    {seq}
                </Tag>
            )
        },
        { title: '工序编号', dataIndex: 'code', key: 'code', width: '18%' },
        { title: '工序名称', dataIndex: 'name', key: 'name', width: '22%' },
        { title: '描述', dataIndex: 'description', key: 'description' },
        {
            title: '操作',
            key: 'action',
            width: '150px',
            render: (_: any, record: RoutingProcess) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenProcessModal(record)}>编辑</Button>
                    <Popconfirm title="确定删除该工序？" onConfirm={() => handleDeleteProcess(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'basic',
            label: <span style={{ fontSize: '15px', fontWeight: 500 }}> 基础信息</span>,
            children: (
                <div className="py-6 px-4">
                    <Row gutter={24}>
                        <Col span={24}>
                            <div className="bg-gray-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                                <div className="text-gray-400 mb-2">工艺路线描述</div>
                                <div className="text-gray-700 whitespace-pre-wrap">
                                    {selectedRouting?.description || <span className="text-gray-300 italic">暂无工艺路线描述信息</span>}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            )
        },
        {
            key: 'processes',
            label: <span style={{ fontSize: '15px', fontWeight: 500 }}> 工序配置</span>,
            children: (
                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-gray-500 text-sm flex items-center gap-2">
                            <InfoCircleOutlined />
                            <span>工序按照顺序号排列执行，建议以10为间隔（10, 20, 30...）以便后期插入新工序</span>
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenProcessModal()}
                            style={{ height: '32px' }}
                        >
                            新增工序
                        </Button>
                    </div>
                    <Table
                        columns={processColumns}
                        dataSource={processes}
                        rowKey="id"
                        loading={processesLoading}
                        size="small"
                        pagination={false}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-4 p-2">
            {/* 筛选区域 */}
            <Card className="shadow-sm border-none" styles={{ body: { padding: '16px' } }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col>
                        <Space size="middle" wrap>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">路线编号:</span>
                                <Input
                                    placeholder="请输入编号"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={fetchRoutings}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">路线名称:</span>
                                <Input
                                    placeholder="请输入名称"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={fetchRoutings}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchRoutings}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 工艺路线列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <PartitionOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>工艺路线列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增工艺路线</Button>
                    </div>
                }
                className="shadow-sm border-none"
                styles={{
                    header: { borderBottom: '1px solid #f0f0f0', padding: '0 20px' },
                    body: { padding: '16px' }
                }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    pagination={{
                        position: ['bottomLeft'],
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        style: { marginLeft: '8px' }
                    }}
                    onRow={(record) => ({
                        onClick: () => setSelectedRouting(record),
                        className: `cursor-pointer transition-all ${selectedRouting?.id === record.id ? 'selected-row' : ''}`,
                        style: {
                            borderLeft: `4px solid #1890ff`,
                            marginBottom: '4px'
                        }
                    })}
                />
            </Card>

            {/* 详情页签区域 */}
            <Card className="flex-1 shadow-sm border-none" styles={{ body: { padding: '0 24px', minHeight: '300px' } }}>
                {!selectedRouting ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                        <p className="text-sm">请在上方列表中点击选中一个工艺路线以查看详情</p>
                    </div>
                ) : (
                    <Tabs defaultActiveKey="basic" items={tabItems} className="h-full" destroyOnHidden />
                )}
            </Card>

            {/* 工艺路线弹窗 */}
            <Modal
                title={editingRouting ? "编辑工艺路线" : "新增工艺路线"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="工艺路线编号" rules={[{ required: true, message: '请输入工艺路线编号' }]}>
                                <Input placeholder="如: ROUTE-001" disabled={!!editingRouting} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="工艺路线名称" rules={[{ required: true, message: '请输入工艺路线名称' }]}>
                                <Input placeholder="如: 主装配工艺" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="工艺路线类型">
                                <Input placeholder="如: 组装" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="active">启用</Select.Option>
                                    <Select.Option value="inactive">禁用</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="工艺路线描述">
                        <Input.TextArea rows={3} placeholder="请输入备注信息" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 工序配置弹窗 */}
            <Modal
                title={editingProcess ? "编辑工序" : "新增工序"}
                open={isProcessModalOpen}
                onOk={() => processForm.submit()}
                onCancel={() => setIsProcessModalOpen(false)}
                afterOpenChange={handleProcessModalAfterOpen}
                destroyOnHidden
                width={600}
            >
                <Form form={processForm} layout="vertical" onFinish={handleSaveProcess}>
                    {!editingProcess && (
                        <Form.Item label="选择标准工序" rules={[{ required: true, message: '请选择标准工序' }]}>
                            <Select
                                placeholder="请选择工序"
                                value={selectedProcessId}
                                onChange={handleProcessSelect}
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    ((option?.label ?? option?.children ?? '') as string)
                                      .toString()
                                      .toLowerCase()
                                      .includes(input.toLowerCase())
                                }
                            >
                                {standardProcesses.map(process => (
                                    <Select.Option key={process.id} value={process.id}>
                                        [{process.code}] {process.name} {process.type && `(${process.type})`}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="seq" label="工序号" rules={[{ required: true, message: '请输入工序号' }]} tooltip="工序号决定工序的执行顺序，建议以10为间隔递增（10, 20, 30...）">
                                <InputNumber style={{ width: '100%' }} placeholder="如: 10" min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="code" label="工序编号" rules={[{ required: true, message: '请输入工序编号' }]}>
                                <Input placeholder="如: OP-10" disabled={!editingProcess && !selectedProcessId} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="name" label="工序名称" rules={[{ required: true, message: '请输入工序名称' }]}>
                        <Input placeholder="如: 零部件准备" disabled={!editingProcess && !selectedProcessId} />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea rows={3} placeholder="请输入工序描述信息" disabled={!editingProcess && !selectedProcessId} />
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
    );
};

export default RoutingManagement;
