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
    ControlOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { PROCESS_TYPE_OPTIONS, getProcessTypeLabel } from '../../config/dictionaries';

const API_BASE_URL = 'http://localhost:3001';

interface Process {
    id: number;
    code: string;
    name: string;
    type: number;
    standardTime: number;
    description: string;
}

const ProcessManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Process[]>([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterType, setFilterType] = useState<number | undefined>(undefined);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProcess, setEditingProcess] = useState<Process | null>(null);
    const [form] = Form.useForm();

    const fetchProcesses = async (page?: number, size?: number) => {
        setLoading(true);
        try {
            const params: any = {
                current: page || pagination.current,
                pageSize: size || pagination.pageSize
            };
            if (filterCode) params.code = filterCode;
            if (filterName) params.name = filterName;
            if (filterType !== undefined) params.type = filterType;

            const response = await axios.get(`${API_BASE_URL}/api/processes`, { params });
            if (response.data.status === 'ok') {
                const { list, total, current, pageSize } = response.data.data;
                setData(list);
                setPagination({ current, pageSize, total });
            }
        } catch (error) {
            message.error('获取工序列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
    }, []);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        setFilterType(undefined);
        fetchProcesses(1);
    };

    const handleOpenModal = (record?: Process) => {
        if (record) {
            setEditingProcess(record);
            form.setFieldsValue(record);
        } else {
            setEditingProcess(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editingProcess) {
                await axios.put(`${API_BASE_URL}/api/processes/${editingProcess.id}`, values);
                message.success('更新工序成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/processes`, values);
                message.success('新增工序成功');
            }
            setIsModalOpen(false);
            fetchProcesses();
        } catch (error) {
            message.error('保存失败');
        }
    };

    const filteredData = data.filter(item => {
        const matchCode = (item.code || '').toLowerCase().includes(filterCode.toLowerCase());
        const matchName = (item.name || '').toLowerCase().includes(filterName.toLowerCase());
        return matchCode && matchName;
    });

    const columns = [
        { title: '工序编号', dataIndex: 'code', key: 'code', width: '20%' },
        { title: '工序名称', dataIndex: 'name', key: 'name', width: '25%' },
        { 
            title: '工序类型', 
            dataIndex: 'type', 
            key: 'type', 
            width: '15%',
            render: (type: number) => {
                const config = PROCESS_TYPE_OPTIONS.find(opt => opt.value === type);
                return <Tag color={config?.color || 'default'}>{config?.label || '未知'}</Tag>;
            }
        },
        { 
            title: '标准工时 (h)', 
            dataIndex: 'standardTime', 
            key: 'standardTime', 
            width: '15%',
            render: (time: number) => <span className="font-mono">{time || 0}</span>
        },
        {
            title: '操作',
            key: 'action',
            width: '15%',
            render: (_: any, record: Process) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenModal(record); }}>编辑</Button>
                    <Popconfirm
                        title="确定删除该工序？"
                        description="注意：如果该工序已被工艺路线使用，将无法删除"
                        onConfirm={async (e) => {
                            e?.stopPropagation();
                            try {
                                await axios.delete(`${API_BASE_URL}/api/processes/${record.id}`);
                                message.success('删除成功');
                                if (selectedProcess?.id === record.id) setSelectedProcess(null);
                                fetchProcesses();
                            } catch (error: any) {
                                // 显示后端返回的详细错误信息
                                const errorData = error?.response?.data;
                                const errorMsg = errorData?.message || '删除失败';

                                // 如果是被引用导致的删除失败，显示详细的 Modal
                                if (errorData?.usedCount && errorData?.routings) {
                                    Modal.error({
                                        title: '无法删除工序',
                                        width: 520,
                                        content: (
                                            <div>
                                                <p className="mb-3">{errorMsg}</p>
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <div className="text-sm text-gray-600 mb-2">引用该工序的工艺路线：</div>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {errorData.routings.map((routing: any) => (
                                                            <li key={routing.id} className="text-sm">
                                                                <span className="font-medium">{routing.name || routing.code}</span>
                                                                {routing.code && routing.name && <span className="text-gray-500"> ({routing.code})</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <p className="mt-3 text-sm text-gray-500">
                                                    提示：请先从这些工艺路线中移除该工序，或者保留此工序供继续使用。
                                                </p>
                                            </div>
                                        )
                                    });
                                } else {
                                    // 其他错误直接显示 message
                                    message.error({
                                        content: errorMsg,
                                        duration: 5
                                    });
                                }
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

    const tabItems = [
        {
            key: 'basic',
            label: <span style={{ fontSize: '15px', fontWeight: 500 }}> 基础信息</span>,
            children: (
                <div className="py-6 px-4">
                    <Row gutter={24}>
                        <Col span={24}>
                            <div className="bg-gray-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                                <div className="text-gray-400 mb-2">工序描述</div>
                                <div className="text-gray-700 whitespace-pre-wrap">
                                    {selectedProcess?.description || <span className="text-gray-300 italic">暂无工序描述信息</span>}
                                </div>
                            </div>
                        </Col>
                    </Row>
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
                                <span className="text-gray-500 whitespace-nowrap">工序编号:</span>
                                <Input
                                    placeholder="请输入编号"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={() => fetchProcesses(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">工序名称:</span>
                                <Input
                                    placeholder="请输入名称"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={() => fetchProcesses(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">工序类型:</span>
                                <Select
                                    placeholder="全部类型"
                                    style={{ width: 120 }}
                                    allowClear
                                    value={filterType}
                                    onChange={setFilterType}
                                    options={PROCESS_TYPE_OPTIONS}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchProcesses(1)}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 工序列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <ControlOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>工序列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增工序</Button>
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
                        ...pagination,
                        position: ['bottomLeft'],
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        style: { marginLeft: '8px' },
                        onChange: (page, size) => fetchProcesses(page, size)
                    }}
                    onRow={(record) => ({
                        onClick: () => setSelectedProcess(record),
                        className: `cursor-pointer transition-all ${selectedProcess?.id === record.id ? 'selected-row' : ''}`,
                        style: {
                            borderLeft: `4px solid #1890ff`,
                            marginBottom: '4px'
                        }
                    })}
                />
            </Card>

            {/* 详情页签区域 */}
            <Card className="flex-1 shadow-sm border-none" styles={{ body: { padding: '0 24px', minHeight: '300px' } }}>
                {!selectedProcess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                        <p className="text-sm">请在上方列表中点击选中一个工序以查看详情</p>
                    </div>
                ) : (
                    <Tabs defaultActiveKey="basic" items={tabItems} className="h-full" destroyOnHidden />
                )}
            </Card>

            <Modal
                title={editingProcess ? "编辑工序" : "新增工序"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="工序编号" rules={[{ required: true, message: '请输入工序编号' }]}>
                                <Input placeholder="如: PROC-001" disabled={!!editingProcess} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="工序名称" rules={[{ required: true, message: '请输入工序名称' }]}>
                                <Input placeholder="如: 零部件组装" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="工序类型" rules={[{ required: true, message: '请选择工序类型' }]}>
                                <Select placeholder="请选择工序类型" options={PROCESS_TYPE_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="standardTime" label="标准工时 (小时)" rules={[{ required: true, message: '请输入标准工时' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="小时" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="工序描述">
                        <Input.TextArea rows={3} placeholder="请输入备注信息" />
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

export default ProcessManagement;

