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
import { getRoutingTypeLabel } from '../../config/dictionaries';

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
    processes?: RoutingProcess[]; // 关联的工序
}

interface RoutingProcess {
    id: number;
    routingId: number;
    seq: number;
    code: string;
    name: string;
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
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
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
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    // 产品类型选项（从产品列表中提取）
    const [productTypes, setProductTypes] = useState<string[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();

    const fetchProducts = async (page?: number, size?: number, overrides?: any) => {
        setLoading(true);
        try {
            // 核心修复：显式判断 overrides 中是否存在该键，以支持 undefined (重置)
            const hasOverride = (key: string) => overrides && Object.prototype.hasOwnProperty.call(overrides, key);

            const params: any = {
                current: page || pagination.current,
                pageSize: size || pagination.pageSize
            };

            const code = hasOverride('code') ? overrides.code : filterCode;
            const name = hasOverride('name') ? overrides.name : filterName;
            const type = hasOverride('type') ? overrides.type : filterType;

            if (code) params.code = code;
            if (name) params.name = name;
            if (type) params.type = type;

            const response = await axios.get(`${API_BASE_URL}/api/products`, { params });
            if (response.data.status === 'ok') {
                const { list, total, current, pageSize } = response.data.data;
                setData(list);
                setPagination({ current, pageSize, total });

                // 提取所有不重复的产品类型
                const types = Array.from(new Set(list.map((p: Product) => p.type).filter(Boolean))) as string[];
                setProductTypes(types);
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
            // 获取所有可用的工艺路线用于选择，所以 pageSize 设置大一些
            const response = await axios.get(`${API_BASE_URL}/api/routings`, { params: { pageSize: 1000 } });
            if (response.data.status === 'ok') {
                // 只显示启用状态的工艺路线
                const activeRoutings = response.data.data.list.filter((r: Routing) => r.status === 'active');
                setAvailableRoutings(activeRoutings);
            }
        } catch (error) {
            message.error('获取工艺路线列表失败');
        }
    };

    useEffect(() => {
        fetchProducts(1);
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
        setFilterType(undefined);
        // 传递空的覆盖参数，确保立即使用空筛选条件而不是等待状态更新
        fetchProducts(1, pagination.pageSize, { code: '', name: '', type: undefined });
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
        } catch (error: any) {
            console.error('保存产品失败:', error);
            message.error(error.response?.data?.message || '保存失败');
        }
    };

    // 打开配置工艺路线弹窗
    const handleOpenRoutingModal = async () => {
        if (!selectedProduct) return;
        // 先获取可用的工艺路线
        await fetchAvailableRoutings();
        // 再获取当前产品已配置的工艺路线
        await fetchProductRoutings(selectedProduct.id);
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
        } catch (error: any) {
            // 处理特定的错误响应
            if (error.response?.status === 409) {
                message.error(error.response.data.message || '该工艺路线已配置，请勿重复添加');
            } else if (error.response?.data?.message) {
                message.error(error.response.data.message);
            } else {
                message.error('配置失败，请稍后重试');
            }
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

    const columns = [
        {
            title: '产品编号',
            dataIndex: 'code',
            key: 'code',
            width: '15%',
            render: (code: string) => <span className="business-code">{code}</span>
        },
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
                        expandable={{
                            expandedRowRender: (record) => {
                                const processes = record.routing?.processes || [];
                                if (processes.length === 0) {
                                    return (
                                        <div className="py-4 text-center text-gray-400">
                                            该工艺路线暂无配置工序
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{
                                        margin: '16px 0 16px 120px',
                                        padding: '0 24px'
                                    }}>
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#999',
                                            marginBottom: '20px',
                                            fontWeight: 500
                                        }}>
                                            工艺流程 · 共 {processes.length} 道工序
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            {processes.map((process, index) => (
                                                <div key={process.id} style={{
                                                    position: 'relative',
                                                    paddingLeft: '40px',
                                                    paddingBottom: index < processes.length - 1 ? '32px' : '0'
                                                }}>
                                                    {/* 时间线圆点 */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '0',
                                                        top: '4px',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#1890ff',
                                                        border: '3px solid #e6f4ff',
                                                        boxShadow: '0 0 0 4px #fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: 2
                                                    }}>
                                                        <span style={{
                                                            color: '#fff',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {index + 1}
                                                        </span>
                                                    </div>

                                                    {/* 时间线连接线 */}
                                                    {index < processes.length - 1 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: '11px',
                                                            top: '28px',
                                                            bottom: '-8px',
                                                            width: '2px',
                                                            backgroundColor: '#e8e8e8',
                                                            zIndex: 1
                                                        }} />
                                                    )}

                                                    {/* 内容卡片 */}
                                                    <div style={{
                                                        backgroundColor: '#fafafa',
                                                        border: '1px solid #e8e8e8',
                                                        borderRadius: '8px',
                                                        padding: '16px',
                                                        transition: 'all 0.3s ease',
                                                        cursor: 'default'
                                                    }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#f0f7ff';
                                                            e.currentTarget.style.borderColor = '#91caff';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.15)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#fafafa';
                                                            e.currentTarget.style.borderColor = '#e8e8e8';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                            <div style={{ flex: 1 }}>
                                                                {/* 工序号标签 */}
                                                                <div style={{ marginBottom: '8px' }}>
                                                                    <Tag color="blue" style={{
                                                                        fontSize: '12px',
                                                                        fontWeight: 'bold',
                                                                        padding: '2px 10px'
                                                                    }}>
                                                                        工序 {process.seq}
                                                                    </Tag>
                                                                    <span style={{
                                                                        color: '#1890ff',
                                                                        fontSize: '12px',
                                                                        fontFamily: 'Monaco, Consolas, monospace',
                                                                        marginLeft: '8px',
                                                                        backgroundColor: '#e6f4ff',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 500,
                                                                        border: '1px solid #91caff'
                                                                    }}>
                                                                        {process.code}
                                                                    </span>
                                                                </div>

                                                                {/* 工序名称 */}
                                                                <div style={{
                                                                    fontSize: '16px',
                                                                    fontWeight: 600,
                                                                    color: '#333',
                                                                    marginBottom: '8px'
                                                                }}>
                                                                    {process.name}
                                                                </div>

                                                                {/* 工序描述 */}
                                                                {process.description && (
                                                                    <div style={{
                                                                        fontSize: '13px',
                                                                        color: '#666',
                                                                        lineHeight: '1.6',
                                                                        marginTop: '8px'
                                                                    }}>
                                                                        {process.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            },
                            rowExpandable: (record) => {
                                // 只有有工序的工艺路线才可展开
                                return (record.routing?.processes?.length || 0) > 0;
                            },
                            expandIcon: ({ expanded, onExpand, record }) => {
                                const processCount = record.routing?.processes?.length || 0;
                                if (processCount === 0) return null;
                                return expanded ? (
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<span>▼</span>}
                                        onClick={e => onExpand(record, e)}
                                    />
                                ) : (
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<span>▶</span>}
                                        onClick={e => onExpand(record, e)}
                                    />
                                );
                            }
                        }}
                        columns={[
                            {
                                title: '工艺路线编号',
                                dataIndex: ['routing', 'code'],
                                key: 'code',
                                width: '20%',
                                render: (code: string) => <span className="business-code">{code}</span>
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
                                width: '12%',
                                render: (type: number) => getRoutingTypeLabel(type)
                            },
                            {
                                title: '工序数量',
                                key: 'processCount',
                                width: '12%',
                                render: (_: any, record: ProductRouting) => {
                                    const count = record.routing?.processes?.length || 0;
                                    return (
                                        <Tag color={count > 0 ? 'green' : 'default'}>
                                            {count} 个工序
                                        </Tag>
                                    );
                                }
                            },
                            {
                                title: '状态',
                                dataIndex: ['routing', 'status'],
                                key: 'status',
                                width: '12%',
                                render: (status: string) => {
                                    const color = status === 'active' ? 'green' : 'orange';
                                    const text = status === 'active' ? '启用' : '禁用';
                                    return <Tag color={color}>{text}</Tag>;
                                }
                            },
                            {
                                title: '操作',
                                key: 'action',
                                width: '12%',
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
                                    onPressEnter={() => fetchProducts(1)}
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
                                    onPressEnter={() => fetchProducts(1)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 whitespace-nowrap">产品类型:</span>
                                <Select
                                    placeholder="全部类型"
                                    style={{ width: 160 }}
                                    allowClear
                                    value={filterType}
                                    onChange={setFilterType}
                                >
                                    {productTypes.map(type => (
                                        <Select.Option key={type} value={type}>
                                            {type}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </Space>
                    </Col>
                    <Col flex="auto" className="flex justify-end">
                        <Space size="middle">
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchProducts(1)}>查询</Button>
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
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    pagination={{
                        ...pagination,
                        position: ['bottomLeft'],
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        style: { marginLeft: '8px' },
                        onChange: (page, size) => fetchProducts(page, size)
                    }}
                    onRow={(record) => ({
                        onClick: () => setSelectedProduct(record),
                        className: `cursor-pointer transition-all ${selectedProduct?.id === record.id ? 'selected-row' : ''}`,
                        style: selectedProduct?.id === record.id ? {
                            borderLeft: `4px solid #1890ff`,
                            marginBottom: '4px'
                        } : {
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
                    <Tabs defaultActiveKey="routings" items={tabItems} className="h-full" destroyOnHidden />
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
                <Form form={form} layout="vertical" onFinish={handleSave} preserve={false}>
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
                    <span>选择要为产品 [{selectedProduct?.name}] 配置的工艺路线（仅显示未配置的启用状态工艺路线）</span>
                </div>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    placeholder="请选择工艺路线"
                    value={selectedRoutingIds}
                    onChange={setSelectedRoutingIds}
                    optionLabelProp="label"
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                        (option?.label as string).toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {availableRoutings
                        .filter(routing => !productRoutings.some(pr => pr.routingId === routing.id))
                        .map(routing => (
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

