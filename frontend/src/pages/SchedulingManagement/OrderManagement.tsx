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
    Tag,
    Select,
    InputNumber,
    DatePicker
} from 'antd';
import {
    ProfileOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { ORDER_TYPE_OPTIONS, ORDER_STATUS_OPTIONS } from '../../config/dictionaries';

const API_BASE_URL = 'http://localhost:3001';

interface Product {
    id: number;
    code: string;
    name: string;
}

interface Order {
    id: number;
    code: string;
    name: string;
    type: number;
    productId: number;
    product: Product;
    quantity: number;
    deadline: string;
    status: number;
    createdAt: string;
}

const OrderManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Order[]>([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    
    // 基础数据
    const [products, setProducts] = useState<Product[]>([]);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterType, setFilterType] = useState<number | undefined>(undefined);
    const [filterProductCode, setFilterProductCode] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [form] = Form.useForm();

    const fetchOrders = async (page?: number, size?: number) => {
        setLoading(true);
        try {
            const params: any = {
                current: page || pagination.current,
                pageSize: size || pagination.pageSize
            };
            if (filterCode) params.code = filterCode;
            if (filterName) params.name = filterName;
            if (filterType !== undefined) params.type = filterType;
            if (filterProductCode) params.productCode = filterProductCode;

            const response = await axios.get(`${API_BASE_URL}/api/orders`, { params });
            if (response.data.status === 'ok') {
                const { list, total, current, pageSize } = response.data.data;
                setData(list);
                setPagination({ current, pageSize, total });
            }
        } catch (error) {
            message.error('获取订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products`, { params: { pageSize: 1000 } });
            if (response.data.status === 'ok') {
                setProducts(response.data.data.list || []);
            }
        } catch (error) {
            console.error('Fetch products failed:', error);
            setProducts([]);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, []);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        setFilterType(undefined);
        setFilterProductCode('');
        fetchOrders(1);
    };

    const handleOpenModal = (record?: Order) => {
        if (record) {
            setEditingOrder(record);
            form.setFieldsValue({
                ...record,
                deadline: dayjs(record.deadline),
                productName: record.product?.name // Pre-fill product name
            });
        } else {
            setEditingOrder(null);
            form.resetFields();
            form.setFieldsValue({ 
                type: 0, 
                quantity: 1,
                deadline: dayjs().add(7, 'day'),
                status: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleProductSelect = (productId: number) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            form.setFieldsValue({ productName: product.name });
        }
    };

    const handleSave = async (values: any) => {
        try {
            const payload = {
                ...values,
                deadline: values.deadline.toISOString()
            };

            if (editingOrder) {
                await axios.put(`${API_BASE_URL}/api/orders/${editingOrder.id}`, payload);
                message.success('更新订单成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/orders`, payload);
                message.success('新增订单成功');
            }
            setIsModalOpen(false);
            fetchOrders();
        } catch (error: any) {
            message.error(error.response?.data?.message || '保存失败');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/orders/${id}`);
            message.success('删除成功');
            fetchOrders();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const columns = [
        { 
            title: '订单编号', 
            dataIndex: 'code', 
            key: 'code', 
            width: 150,
            fixed: 'left' as const,
            render: (code: string) => <span className="business-code">{code}</span>
        },
        { title: '订单名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
        { 
            title: '订单类型', 
            dataIndex: 'type', 
            key: 'type', 
            width: 120,
            render: (type: number) => {
                const config = ORDER_TYPE_OPTIONS.find(opt => opt.value === type);
                return <Tag color={config?.color || 'default'}>{config?.label || '未知'}</Tag>;
            }
        },
        { 
            title: '产品编号', 
            dataIndex: ['product', 'code'], 
            key: 'productCode', 
            width: 150,
            render: (code: string) => <span className="business-code">{code}</span>
        },
        { 
            title: '产品名称', 
            dataIndex: ['product', 'name'], 
            key: 'productName', 
            width: 200,
            ellipsis: true 
        },
        { 
            title: '数量', 
            dataIndex: 'quantity', 
            key: 'quantity', 
            width: 100,
            render: (q: number) => <span className="font-mono font-bold">{q}</span>
        },
        { 
            title: '创建时间', 
            dataIndex: 'createdAt', 
            key: 'createdAt', 
            width: 130,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD')
        },
        { 
            title: '截止时间', 
            dataIndex: 'deadline', 
            key: 'deadline', 
            width: 150,
            render: (date: string) => (
                <Space size={4}>
                    {/* <CalendarOutlined className="text-gray-400" /> */}
                    <span className={dayjs(date).isBefore(dayjs()) ? 'text-red-500 font-medium' : ''}>
                        {dayjs(date).format('YYYY-MM-DD')}
                    </span>
                </Space>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            fixed: 'right' as const,
            render: (_: any, record: Order) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
                    <Popconfirm title="确定删除该订单？" onConfirm={() => handleDelete(record.id)}>
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
                                <span className="text-gray-500 whitespace-nowrap">订单编号:</span>
                                <Input
                                    placeholder="搜索编号"
                                    style={{ width: 140 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={() => fetchOrders(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">订单名称:</span>
                                <Input
                                    placeholder="搜索名称"
                                    style={{ width: 140 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={() => fetchOrders(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">产品编号:</span>
                                <Input
                                    placeholder="搜索产品编号"
                                    style={{ width: 140 }}
                                    allowClear
                                    value={filterProductCode}
                                    onChange={e => setFilterProductCode(e.target.value)}
                                    onPressEnter={() => fetchOrders(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">订单类型:</span>
                                <Select
                                    placeholder="全部类型"
                                    style={{ width: 120 }}
                                    allowClear
                                    value={filterType}
                                    onChange={setFilterType}
                                    options={ORDER_TYPE_OPTIONS}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchOrders(1)}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 订单列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <ProfileOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>订单列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增订单</Button>
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
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    scroll={{ x: 1350 }}
                    pagination={{
                        ...pagination,
                        position: ['bottomLeft'],
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        style: { marginLeft: '8px' },
                        onChange: (page, size) => fetchOrders(page, size)
                    }}
                />
            </Card>

            <Modal
                title={editingOrder ? "编辑订单" : "新增订单"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnHidden
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="订单编号" rules={[{ required: true, message: '请输入订单编号' }]}>
                                <Input placeholder="如: ORD-2025-001" disabled={!!editingOrder} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="订单名称" rules={[{ required: true, message: '请输入订单名称' }]}>
                                <Input placeholder="如: CZ-5 试制订单" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="productId" label="关联产品 (编号)" rules={[{ required: true, message: '请选择产品编号' }]}>
                                <Select
                                    placeholder="搜索/选择产品编号"
                                    showSearch
                                    optionFilterProp="label"
                                    optionLabelProp="label"
                                    onSelect={handleProductSelect}
                                >
                                    {products.map(p => (
                                        <Select.Option key={p.id} value={p.id} label={p.code}>
                                            <div className="flex justify-between">
                                                <span className="font-mono">{p.code}</span>
                                                <span className="text-gray-400 text-xs">{p.name}</span>
                                            </div>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="productName" label="产品名称">
                                <Input placeholder="选择编号后自动带出" disabled style={{ color: 'rgba(0, 0, 0, 0.65)', cursor: 'not-allowed' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="订单类型" rules={[{ required: true }]}>
                                <Select placeholder="请选择类型" options={ORDER_TYPE_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="quantity" label="订单数量" rules={[{ required: true, message: '请输入数量' }]}>
                                <InputNumber style={{ width: '100%' }} min={1} placeholder="输入正整数" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="deadline" label="截止日期" rules={[{ required: true, message: '请选择截止日期' }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        {editingOrder && (
                            <Col span={12}>
                                <Form.Item name="status" label="订单状态">
                                    <Select options={ORDER_STATUS_OPTIONS} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default OrderManagement;
