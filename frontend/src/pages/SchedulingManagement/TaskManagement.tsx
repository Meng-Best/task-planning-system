import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Space,
    Button,
    message,
    Row,
    Col,
    Statistic,
    Tag,
    Modal,
    Steps,
    InputNumber,
    Divider,
    Alert,
    Popconfirm,
    Empty
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckSquareOutlined,
    ShoppingOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { PRODUCTION_TASK_STATUS_OPTIONS, ORDER_TYPE_OPTIONS } from '../../config/dictionaries';

const API_BASE_URL = 'http://localhost:3001';

interface Order {
    id: number;
    code: string;
    name: string;
    type: number;
    quantity: number;
    scheduledQuantity: number;
    deadline: string;
    product: {
        id: number;
        code: string;
        name: string;
    };
}

interface ProductionTask {
    id: number;
    code: string;
    orderId: number;
    productId: number;
    quantity: number;
    status: number;
    priority: number;
    deadline: string;
    createdAt: string;
    order: {
        id: number;
        code: string;
        name: string;
        type: number;
    };
    product: {
        id: number;
        code: string;
        name: string;
    };
}

const TaskManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProductionTask[]>([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    // 统计数据
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        scheduling: 0
    });

    // 创建任务对话框
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [taskCount, setTaskCount] = useState<number>(1);
    const [creatingTasks, setCreatingTasks] = useState(false);

    const fetchTasks = async (page?: number, size?: number) => {
        setLoading(true);
        try {
            const params: any = {
                current: page || pagination.current,
                pageSize: size || pagination.pageSize
            };

            const response = await axios.get(`${API_BASE_URL}/api/production-tasks`, { params });
            if (response.data.status === 'ok') {
                const { list, total, current, pageSize, allTotal, pendingCount, schedulingCount } = response.data.data;
                setData(list);
                setPagination({ current, pageSize, total });
                setStats({
                    total: allTotal,
                    pending: pendingCount,
                    scheduling: schedulingCount
                });
            }
        } catch (error) {
            message.error('获取任务列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableOrders = async () => {
        try {
            // 获取所有订单，筛选出还有剩余可创建任务的订单
            const response = await axios.get(`${API_BASE_URL}/api/orders`, {
                params: {
                    pageSize: 1000
                }
            });
            if (response.data.status === 'ok') {
                // 筛选出还有剩余可创建数量的订单（scheduledQuantity < quantity）
                const availableOrders = response.data.data.list.filter(
                    (order: Order) => order.scheduledQuantity < order.quantity
                );
                setOrders(availableOrders);
            }
        } catch (error) {
            message.error('获取订单列表失败');
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleOpenCreateModal = async () => {
        await fetchAvailableOrders();
        setIsCreateModalOpen(true);
        setCurrentStep(0);
        setSelectedOrder(null);
        setTaskCount(1);
    };

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
        const remainingQuantity = order.quantity - order.scheduledQuantity;
        setTaskCount(remainingQuantity); // 默认拆分剩余数量
        setCurrentStep(1);
    };

    const handleCreateTasks = async () => {
        if (!selectedOrder) return;

        setCreatingTasks(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/production-tasks/from-order`, {
                orderId: selectedOrder.id,
                taskCount
            });

            if (response.data.status === 'ok') {
                message.success(response.data.message);
                setIsCreateModalOpen(false);
                fetchTasks();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || '创建任务失败');
        } finally {
            setCreatingTasks(false);
        }
    };

    const handleDeleteTask = async (id: number) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/production-tasks/${id}`);
            message.success('删除成功');
            fetchTasks();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const columns = [
        {
            title: '任务编号',
            dataIndex: 'code',
            key: 'code',
            width: 180,
            fixed: 'left' as const,
            render: (code: string) => <span className="business-code">{code}</span>
        },
        {
            title: '订单编号',
            dataIndex: ['order', 'code'],
            key: 'orderCode',
            width: 150,
            render: (code: string) => <span className="business-code">{code}</span>
        },
        {
            title: '订单名称',
            dataIndex: ['order', 'name'],
            key: 'orderName',
            width: 200,
            ellipsis: true
        },
        {
            title: '产品编号',
            dataIndex: ['product', 'code'],
            key: 'productCode',
            width: 140,
            render: (code: string) => <span className="business-code">{code}</span>
        },
        {
            title: '产品名称',
            dataIndex: ['product', 'name'],
            key: 'productName',
            width: 180,
            ellipsis: true
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 80,
            render: (q: number) => <span className="font-mono font-bold">{q}</span>
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: number) => {
                const config = PRODUCTION_TASK_STATUS_OPTIONS.find(opt => opt.value === status);
                return <Tag color={config?.color}>{config?.label}</Tag>;
            }
        },
        {
            title: '截止时间',
            dataIndex: 'deadline',
            key: 'deadline',
            width: 120,
            render: (date: string) => {
                const isPast = dayjs(date).isBefore(dayjs());
                return (
                    <span className={isPast ? 'text-red-500 font-medium' : ''}>
                        {dayjs(date).format('YYYY-MM-DD')}
                    </span>
                );
            }
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD')
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_: any, record: ProductionTask) => (
                <Popconfirm title="确定删除该任务？" onConfirm={() => handleDeleteTask(record.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-4 p-2">
            {/* 统计看板 */}
            <Row gutter={16}>
                <Col span={8}>
                    <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
                        <Statistic
                            title={<span className="text-gray-500 font-medium">任务总数</span>}
                            value={stats.total}
                            prefix={<CheckSquareOutlined />}
                            valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
                        <Statistic
                            title={<span className="text-gray-500 font-medium">待拆分</span>}
                            value={stats.pending}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#8c8c8c', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className="shadow-sm border-none" styles={{ body: { padding: '20px' } }}>
                        <Statistic
                            title={<span className="text-gray-500 font-medium">已拆分</span>}
                            value={stats.scheduling}
                            prefix={<SyncOutlined spin />}
                            valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 任务列表 */}
            <Card
                title={
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <Space size={12}>
                            <CheckSquareOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>生产任务列表</span>
                        </Space>
                        <Button type="primary" icon={<ShoppingOutlined />} onClick={handleOpenCreateModal}>
                            从订单创建任务
                        </Button>
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
                    scroll={{ x: 1500 }}
                    pagination={{
                        ...pagination,
                        position: ['bottomLeft'],
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                        style: { marginLeft: '8px' },
                        onChange: (page, size) => fetchTasks(page, size)
                    }}
                />
            </Card>

            {/* 创建任务对话框 */}
            <Modal
                title="从订单创建生产任务"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                width={1000}
                destroyOnClose
            >
                <Steps current={currentStep} style={{ marginBottom: 24 }}>
                    <Steps.Step title="选择订单" />
                    <Steps.Step title="配置任务" />
                    <Steps.Step title="确认创建" />
                </Steps>

                {currentStep === 0 && (
                    <div>
                        <Alert
                            message="选择要拆分的订单"
                            description="显示还有剩余可创建任务的订单。点击订单卡片进行选择，可以分批创建生产任务"
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '4px 8px 4px 4px' }}>
                            {orders.length === 0 ? (
                                <Empty
                                    description="暂无待拆分的订单"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    style={{ padding: '40px 0' }}
                                />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {orders.map(order => (
                                        <Col span={12} key={order.id}>
                                            <Card
                                                hoverable
                                                onClick={() => handleSelectOrder(order)}
                                                style={{
                                                    borderColor: selectedOrder?.id === order.id ? '#1890ff' : '#d9d9d9',
                                                    borderWidth: 2,
                                                    transition: 'all 0.3s ease'
                                                }}
                                                styles={{ body: { padding: '16px' } }}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <div className="flex justify-between items-center">
                                                        <span className="business-code">{order.code}</span>
                                                        <Tag color={ORDER_TYPE_OPTIONS.find(opt => opt.value === order.type)?.color}>
                                                            {ORDER_TYPE_OPTIONS.find(opt => opt.value === order.type)?.label}
                                                        </Tag>
                                                    </div>
                                                    <div className="font-medium">{order.name}</div>
                                                    <div className="text-gray-500 text-sm">
                                                        产品: {order.product.name} ({order.product.code})
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>
                                                            数量: <span className="font-bold text-blue-500">{order.quantity}</span>
                                                            {order.scheduledQuantity > 0 && (
                                                                <span className="text-gray-500 text-xs ml-2">
                                                                    (已创建: {order.scheduledQuantity})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-gray-400 text-xs">
                                                            截止: {dayjs(order.deadline).format('YYYY-MM-DD')}
                                                        </span>
                                                    </div>
                                                    <div className="text-orange-500 text-sm font-medium">
                                                        可创建: {order.quantity - order.scheduledQuantity} 个任务
                                                    </div>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </div>
                    </div>
                )}

                {currentStep === 1 && selectedOrder && (
                    <div>
                        <Alert
                            message="配置任务拆分方式"
                            description="设置要生成的任务数量，每个任务默认生产1个产品"
                            type="info"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />
                        <Card title="订单信息" style={{ marginBottom: 16 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="mb-2"><span className="text-gray-500">订单编号:</span> {selectedOrder.code}</div>
                                    <div className="mb-2"><span className="text-gray-500">订单名称:</span> {selectedOrder.name}</div>
                                    <div className="mb-2"><span className="text-gray-500">产品名称:</span> {selectedOrder.product.name}</div>
                                </Col>
                                <Col span={12}>
                                    <div className="mb-2"><span className="text-gray-500">产品编号:</span> {selectedOrder.product.code}</div>
                                    <div className="mb-2"><span className="text-gray-500">订单数量:</span> <span className="font-bold text-blue-500">{selectedOrder.quantity}</span></div>
                                    <div className="mb-2">
                                        <span className="text-gray-500">已创建任务:</span>{' '}
                                        <span className="font-bold text-green-500">{selectedOrder.scheduledQuantity}</span>
                                    </div>
                                    <div className="mb-2">
                                        <span className="text-gray-500">可创建任务:</span>{' '}
                                        <span className="font-bold text-orange-500">{selectedOrder.quantity - selectedOrder.scheduledQuantity}</span>
                                    </div>
                                    <div className="mb-2"><span className="text-gray-500">截止时间:</span> {dayjs(selectedOrder.deadline).format('YYYY-MM-DD')}</div>
                                </Col>
                            </Row>
                        </Card>

                        <Divider />

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: 16 }}>
                                <span style={{ fontSize: 16, fontWeight: 500 }}>本次创建任务数量:</span>
                            </div>
                            <InputNumber
                                min={1}
                                max={selectedOrder.quantity - selectedOrder.scheduledQuantity}
                                value={taskCount}
                                onChange={(value) => setTaskCount(value || 1)}
                                style={{ width: 200 }}
                                size="large"
                            />
                            <div style={{ marginTop: 16, color: '#8c8c8c' }}>
                                将创建 <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 18 }}>{taskCount}</span> 个生产任务，每个任务生产 1 个产品
                            </div>
                            <div style={{ marginTop: 8, color: '#fa8c16' }}>
                                创建后剩余可创建: {selectedOrder.quantity - selectedOrder.scheduledQuantity - taskCount} 个
                            </div>
                        </div>

                        <Divider />

                        <div style={{ textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                                <Button type="primary" onClick={() => setCurrentStep(2)}>下一步</Button>
                            </Space>
                        </div>
                    </div>
                )}

                {currentStep === 2 && selectedOrder && (
                    <div>
                        <Alert
                            message="确认创建"
                            description='请确认以下信息，点击"创建"按钮后将生成生产任务'
                            type="warning"
                            showIcon
                            style={{ marginBottom: 24 }}
                        />
                        <Card>
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                                    即将从订单 [{selectedOrder.code}] 创建 {taskCount} 个生产任务
                                </div>
                                <div style={{ color: '#8c8c8c', marginBottom: 24 }}>
                                    产品: {selectedOrder.product.name} ({selectedOrder.product.code})
                                </div>
                                <Divider />
                                <div style={{ textAlign: 'left', padding: '0 40px' }}>
                                    <div className="mb-2">• 任务数量: {taskCount} 个</div>
                                    <div className="mb-2">• 每个任务生产: 1 个产品</div>
                                    <div className="mb-2">• 截止时间: {dayjs(selectedOrder.deadline).format('YYYY-MM-DD')}</div>
                                    <div className="mb-2">• 任务状态: 待拆分</div>
                                </div>
                            </div>
                        </Card>

                        <Divider />

                        <div style={{ textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setCurrentStep(1)}>上一步</Button>
                                <Button type="primary" loading={creatingTasks} onClick={handleCreateTasks}>
                                    创建任务
                                </Button>
                            </Space>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TaskManagement;
