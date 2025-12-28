import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Space,
    Button,
    Typography,
    Input,
    Modal,
    Form,
    Select,
    message,
    Row,
    Col,
    Popconfirm,
    InputNumber
} from 'antd';
import {
    BuildOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';
const { Text } = Typography;

interface Section {
    id: number;
    code: string;
    name: string;
    type: string;
    quantity: number;
    rocketId?: number | null;
    rocket?: {
        code: string;
    };
}

const SectionManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Section[]>([]);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [rockets, setRockets] = useState<any[]>([]);
    const [form] = Form.useForm();

    const fetchSections = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sections`);
            if (response.data.status === 'ok') {
                setData(response.data.data);
            }
        } catch (error) {
            message.error('获取舱段列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchRockets = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/rockets`);
            if (response.data.status === 'ok') {
                setRockets(response.data.data);
            }
        } catch (error) {
            console.error('Fetch rockets failed:', error);
        }
    };

    useEffect(() => {
        fetchSections();
        fetchRockets();
    }, []);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        fetchSections();
    };

    const handleOpenModal = (record?: Section) => {
        if (record) {
            setEditingSection(record);
            form.setFieldsValue(record);
        } else {
            setEditingSection(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editingSection) {
                await axios.put(`${API_BASE_URL}/api/sections/${editingSection.id}`, values);
                message.success('更新舱段成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/sections`, values);
                message.success('新增舱段成功');
            }
            setIsModalOpen(false);
            fetchSections();
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
        { title: '舱段编号', dataIndex: 'code', key: 'code', width: '15%' },
        { title: '名称', dataIndex: 'name', key: 'name', width: '20%' },
        { title: '类型', dataIndex: 'type', key: 'type', width: '15%' },
        { 
            title: '库存数量', 
            dataIndex: 'quantity', 
            key: 'quantity', 
            width: '15%',
            render: (val: number) => <Text strong>{val}</Text>
        },
        { title: '所属火箭编号', dataIndex: ['rocket', 'code'], key: 'rocket', width: '15%', render: (val: string) => val || <span className="text-gray-400">未关联</span> },
        {
            title: '操作',
            key: 'action',
            width: '20%',
            render: (_: any, record: Section) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
                    <Popconfirm title="确定删除该舱段？" onConfirm={async () => {
                        try {
                            await axios.delete(`${API_BASE_URL}/api/sections/${record.id}`);
                            message.success('删除成功');
                            fetchSections();
                        } catch (error) {
                            message.error('删除失败');
                        }
                    }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-4 p-2">
            {/* 筛选区域 */}
            <Card className="shadow-sm border-none" styles={{ body: { padding: '16px' } }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col>
                        <Space size="middle" wrap>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">舱段编号:</span>
                                <Input
                                    placeholder="请输入编号"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={fetchSections}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">舱段名称:</span>
                                <Input
                                    placeholder="请输入名称"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={fetchSections}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchSections}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 舱段列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <BuildOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>舱段列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增舱段</Button>
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
                    locale={{ emptyText: '暂无舱段数据' }}
                />
            </Card>

            <Modal
                title={editingSection ? "编辑舱段" : "新增舱段"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="code" label="舱段编号" rules={[{ required: true, message: '请输入舱段编号' }]}>
                        <Input placeholder="如: S-01" disabled={!!editingSection} />
                    </Form.Item>
                    <Form.Item name="name" label="舱段名称" rules={[{ required: true, message: '请输入舱段名称' }]}>
                        <Input placeholder="如: 一级舱段" />
                    </Form.Item>
                    <Form.Item name="type" label="类型">
                        <Input placeholder="如: 助推器" />
                    </Form.Item>
                    <Form.Item name="quantity" label="库存数量" initialValue={0} rules={[{ required: true, message: '请输入库存数量' }]}>
                        <InputNumber min={0} placeholder="请输入库存数量" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="rocketId" label="所属火箭">
                        <Select placeholder="请选择火箭" allowClear>
                            {rockets.map(rocket => (
                                <Select.Option key={rocket.id} value={rocket.id}>
                                    [{rocket.code}] {rocket.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SectionManagement;
