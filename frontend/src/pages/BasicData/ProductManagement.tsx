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
    Tabs,
    Empty,
    Select,
    Tag
} from 'antd';
import {
    ProjectOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    PartitionOutlined,
    LinkOutlined,
    DisconnectOutlined
} from '@ant-design/icons';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

interface Product {
    id: number;
    code: string;
    name: string;
    type: string;
    model: string;
    description: string;
}

interface Routing {
    id: number;
    code: string;
    name: string;
    type: string;
    status: string;
    description: string;
}

interface ProductRouting {
    id: number;
    productId: number;
    routingId: number;
    routing?: Routing;
}

const ProductManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // 工艺路线相关状态
    const [productRoutings, setProductRoutings] = useState<ProductRouting[]>([]);
    const [routingsLoading, setRoutingsLoading] = useState(false);
    const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);
    const [availableRoutings, setAvailableRoutings] = useState<Routing[]>([]);
    const [selectedRoutingIds, setSelectedRoutingIds] = useState<number[]>([]);

    // 筛选状态
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products`);
            if (response.data.status === 'ok') {
                setData(response.data.data);
            }
        } catch (error) {
            message.error('获取产品列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 获取产品的工艺路线配置
    const fetchProductRoutings = async (productId: number) => {
        setRoutingsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products/${productId}/routings`);
            if (response.data.status === 'ok') {
                setProductRoutings(response.data.data);
            }
        } catch (error) {
            console.error('获取产品工艺路线失败:', error);
            setProductRoutings([]);
        } finally {
            setRoutingsLoading(false);
        }
    };

    // 获取可用的工艺路线列表
    const fetchAvailableRoutings = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/routings`);
            if (response.data.status === 'ok') {
                // 只显示启用状态的工艺路线
                const activeRoutings = response.data.data.filter((r: Routing) => r.status === 'active');
                setAvailableRoutings(activeRoutings);
            }
        } catch (error) {
            message.error('获取工艺路线列表失败');
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            fetchProductRoutings(selectedProduct.id);
        } else {
            setProductRoutings([]);
        }
    }, [selectedProduct]);

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        fetchProducts();
    };

    const handleOpenModal = (record?: Product) => {
        if (record) {
            setEditingProduct(record);
            form.setFieldsValue(record);
        } else {
            setEditingProduct(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editingProduct) {
                await axios.put(`${API_BASE_URL}/api/products/${editingProduct.id}`, values);
                message.success('更新产品成功');
            } else {
                await axios.post(`${API_BASE_URL}/api/products`, values);
                message.success('新增产品成功');
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            message.error('保存失败');
        }
    };

    // 打开配置工艺路线弹窗
    const handleOpenRoutingModal = async () => {
        if (!selectedProduct) return;
        await fetchAvailableRoutings();
        setSelectedRoutingIds([]);
        setIsRoutingModalOpen(true);
    };

    // 绑定工艺路线
    const handleBindRoutings = async () => {
        if (!selectedProduct || selectedRoutingIds.length === 0) {
            message.warning('请至少选择一个工艺路线');
            return;
        }
        try {
            await axios.post(`${API_BASE_URL}/api/products/${selectedProduct.id}/routings`, {
                routingIds: selectedRoutingIds
            });
            message.success('工艺路线配置成功');
            setIsRoutingModalOpen(false);
            fetchProductRoutings(selectedProduct.id);
        } catch (error) {
            message.error('配置失败');
        }
    };

    // 解绑工艺路线
    const handleUnbindRouting = async (productRoutingId: number) => {
        if (!selectedProduct) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/products/routings/${productRoutingId}`);
            message.success('工艺路线已解绑');
            fetchProductRoutings(selectedProduct.id);
        } catch (error) {
            message.error('解绑失败');
        }
    };

    const filteredData = data.filter(item => {
        const matchCode = (item.code || '').toLowerCase().includes(filterCode.toLowerCase());
        const matchName = (item.name || '').toLowerCase().includes(filterName.toLowerCase());
        return matchCode && matchName;
    });

    const columns = [
        { title: '产品编号', dataIndex: 'code', key: 'code', width: '15%' },
        { title: '产品名称', dataIndex: 'name', key: 'name', width: '20%' },
        { title: '产品类型', dataIndex: 'type', key: 'type', width: '15%' },
        { title: '产品型号', dataIndex: 'model', key: 'model', width: '15%' },
        {
            title: '操作',
            key: 'action',
            width: '15%',
            render: (_: any, record: Product) => (
                <Space size="middle">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenModal(record); }}>编辑</Button>
                    <Popconfirm title="确定删除该产品？" onConfirm={async (e) => {
                        e?.stopPropagation();
                        try {
                            await axios.delete(`${API_BASE_URL}/api/products/${record.id}`);
                            message.success('删除成功');
                            if (selectedProduct?.id === record.id) setSelectedProduct(null);
                            fetchProducts();
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

    const tabItems = [
        {
            key: 'basic',
            label: <span style={{ fontSize: '15px', fontWeight: 500 }}> 基础信息</span>,
            children: (
                <div className="py-6 px-4">
                    <Row gutter={24}>
                        <Col span={24}>
                            <div className="bg-gray-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                                <div className="text-gray-400 mb-2">产品描述</div>
                                <div className="text-gray-700 whitespace-pre-wrap">
                                    {selectedProduct?.description || <span className="text-gray-300 italic">暂无产品描述信息</span>}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            )
        },
        {
            key: 'routings',
            label: <span style={{ fontSize: '15px', fontWeight: 500 }}><PartitionOutlined /> 工艺路线 ({productRoutings.length})</span>,
            children: (
                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-gray-500 text-sm flex items-center gap-2">
                            <InfoCircleOutlined />
                            <span>为产品配置工艺路线，可配置多个工艺路线供生产选择</span>
                        </div>
                        <Button
                            type="primary"
                            icon={<LinkOutlined />}
                            onClick={handleOpenRoutingModal}
                            style={{ height: '32px' }}
                        >
                            配置工艺路线
                        </Button>
                    </div>
                    <Table
                        dataSource={productRoutings}
                        rowKey="id"
                        loading={routingsLoading}
                        size="small"
                        pagination={false}
                        columns={[
                            {
                                title: '工艺路线编号',
                                dataIndex: ['routing', 'code'],
                                key: 'code',
                                width: '20%'
                            },
                            {
                                title: '工艺路线名称',
                                dataIndex: ['routing', 'name'],
                                key: 'name',
                                width: '25%'
                            },
                            {
                                title: '类型',
                                dataIndex: ['routing', 'type'],
                                key: 'type',
                                width: '15%',
                                render: (type: string) => type || '-'
                            },
                            {
                                title: '状态',
                                dataIndex: ['routing', 'status'],
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
                                render: (_: any, record: ProductRouting) => (
                                    <Popconfirm
                                        title="确定解绑此工艺路线？"
                                        onConfirm={() => handleUnbindRouting(record.id)}
                                        okText="确定"
                                        cancelText="取消"
                                    >
                                        <Button type="link" danger size="small" icon={<DisconnectOutlined />}>解绑</Button>
                                    </Popconfirm>
                                )
                            }
                        ]}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无工艺路线配置，请点击右上角按钮添加"
                                />
                            )
                        }}
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
                                <span className="text-gray-500 whitespace-nowrap">产品编号:</span>
                                <Input
                                    placeholder="请输入编号"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                    onPressEnter={fetchProducts}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">产品名称:</span>
                                <Input
                                    placeholder="请输入名称"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterName}
                                    onChange={e => setFilterName(e.target.value)}
                                    onPressEnter={fetchProducts}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchProducts}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 产品列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <ProjectOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>产品列表</span>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>新增产品</Button>
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
                        onClick: () => setSelectedProduct(record),
                        className: `cursor-pointer transition-all ${selectedProduct?.id === record.id ? 'selected-row' : ''}`,
                        style: {
                            borderLeft: `4px solid #1890ff`,
                            marginBottom: '4px'
                        }
                    })}
                />
            </Card>

            {/* 详情页签区域 */}
            <Card className="flex-1 shadow-sm border-none" styles={{ body: { padding: '0 24px', minHeight: '300px' } }}>
                {!selectedProduct ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                        <p className="text-sm">请在上方列表中点击选中一个产品以查看详情</p>
                    </div>
                ) : (
                    <Tabs defaultActiveKey="routings" items={tabItems} className="h-full" destroyInactiveTabPane />
                )}
            </Card>

            {/* 产品信息弹窗 */}
            <Modal
                title={editingProduct ? "编辑产品" : "新增产品"}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="产品编号" rules={[{ required: true, message: '请输入产品编号' }]}>
                                <Input placeholder="如: PROD-001" disabled={!!editingProduct} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
                                <Input placeholder="如: 控制器组件" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="产品类型">
                                <Input placeholder="如: 电子组件" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="model" label="产品型号">
                                <Input placeholder="如: v1.0" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="产品描述">
                        <Input.TextArea rows={3} placeholder="请输入备注信息" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 配置工艺路线弹窗 */}
            <Modal
                title="配置工艺路线"
                open={isRoutingModalOpen}
                onOk={handleBindRoutings}
                onCancel={() => setIsRoutingModalOpen(false)}
                width={700}
                destroyOnClose
            >
                <div className="mb-4 text-gray-500 italic flex items-center gap-2">
                    <InfoCircleOutlined />
                    <span>选择要为产品 [{selectedProduct?.name}] 配置的工艺路线（仅显示启用状态的工艺路线）</span>
                </div>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="请选择工艺路线"
                    value={selectedRoutingIds}
                    onChange={setSelectedRoutingIds}
                    optionLabelProp="label"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        (option?.children as string).toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {availableRoutings.map(routing => (
                        <Select.Option
                            key={routing.id}
                            value={routing.id}
                            label={`[${routing.code}] ${routing.name}`}
                        >
                            <div className="flex justify-between items-center">
                                <span>
                                    <span className="text-gray-400 font-mono">[{routing.code}]</span> {routing.name}
                                </span>
                                {routing.type && <Tag color="blue" className="ml-2">{routing.type}</Tag>}
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

export default ProductManagement;

