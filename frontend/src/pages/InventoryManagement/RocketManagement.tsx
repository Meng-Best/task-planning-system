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
    message,
    Row,
    Col,
    Popconfirm,
    InputNumber
} from 'antd';
import {
    RocketOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';
const { Text } = Typography;

interface Rocket {
    id: number;
    code: string;
    name: string;
    model: string;
    quantity: number;
}

const RocketManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Rocket[]>([]);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRocket, setEditingRocket] = useState<Rocket | null>(null);
    const [form] = Form.useForm();

    const fetchRockets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/rockets`);
            if (response.data.status === 'ok') {
                setData(response.data.data);
            }
        } catch (error) {
            message.error('获取火箭列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRockets();
    }, []);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        fetchRockets();
    };

    const handleOpenModal = (record?: Rocket) => {
        if (record) {
            setEditingRocket(record);
            form.setFieldsValue(record);
        } else {
            setEditingRocket(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editingRocket) {
                await axios.put(`${API_BASE_URL}/api/rockets/${editingRocket.id}`, values);
                message.success('更新火箭成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/rockets`, values);
                message.success('新增火箭成功');
            }
            setIsModalOpen(false);
            fetchRockets();
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
        { title: '火箭编号', dataIndex: 'code', key: 'code', width: '20%' },
        { title: '名称', dataIndex: 'name', key: 'name', width: '25%' },
        { title: '型号', dataIndex: 'model', key: 'model', width: '20%' },
        { 
            title: '库存数量', 
            dataIndex: 'quantity', 
            key: 'quantity', 
            width: '15%',
            render: (val: number) => <Text strong>{val}</Text>
        },
        {
            title: '操作',
            key: 'action',
            width: '20%',
            render: (_: any, record: Rocket) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
                    <Popconfirm title="确定删除该火箭？" onConfirm={async () => {
                        try {
                            await axios.delete(`${API_BASE_URL}/api/rockets/${record.id}`);
                            message.success('删除成功');
                            fetchRockets();
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
                                <span className="text-gray-500 whitespace-nowrap">火箭编号:</span>
                                <Input
                                    placeholder="请输入编号"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={fetchRockets}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">火箭名称:</span>
                                <Input
                                    placeholder="请输入名称"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={fetchRockets}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchRockets}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 火箭列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <RocketOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>火箭列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增火箭</Button>
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
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                    locale={{ emptyText: '暂无火箭数据' }}
                />
            </Card>

            <Modal
                title={editingRocket ? "编辑火箭" : "新增火箭"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="code" label="火箭编号" rules={[{ required: true, message: '请输入火箭编号' }]}>
                        <Input placeholder="如: CZ-5-01" disabled={!!editingRocket} />
                    </Form.Item>
                    <Form.Item name="name" label="火箭名称" rules={[{ required: true, message: '请输入火箭名称' }]}>
                        <Input placeholder="如: 长征五号" />
                    </Form.Item>
                    <Form.Item name="model" label="型号">
                        <Input placeholder="如: Y1" />
                    </Form.Item>
                    <Form.Item name="quantity" label="库存数量" initialValue={0} rules={[{ required: true, message: '请输入库存数量' }]}>
                        <InputNumber min={0} placeholder="请输入库存数量" style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RocketManagement;
