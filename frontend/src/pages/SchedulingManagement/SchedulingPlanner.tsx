import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    message,
    Row,
    Col,
    List,
    Space,
    Tag,
    Select,
    Empty,
    Divider,
    Modal,
    Typography,
    Badge
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    SaveOutlined,
    RocketOutlined,
    BuildOutlined,
    CloseOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { PRODUCTION_TASK_STATUS_OPTIONS } from '../../config/dictionaries';

const { Text, Title } = Typography;
const API_BASE_URL = 'http://localhost:3001';

interface Product {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface ProductionTask {
    id: number;
    code: string;
    orderId: number;
    productId: number;
    quantity: number;
    status: number;
    deadline: string;
    order: {
        code: string;
        name: string;
    };
    product: {
        code: string;
        name: string;
    };
}

interface ScheduleStep {
    id?: number;
    seq: number;
    type: number; // 0=舱段生产, 1=总装
    productId?: number;
    product?: Product;
    name?: string;
}

const SchedulingPlanner: React.FC = () => {
    const [tasks, setTasks] = useState<ProductionTask[]>([]);
    const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
    const [steps, setSteps] = useState<ScheduleStep[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPendingTasks();
        fetchProducts();
    }, []);

    // 获取待拆分任务列表（status=0）
    const fetchPendingTasks = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/production-tasks`, {
                params: {
                    status: 0,
                    pageSize: 1000
                }
            });
            if (response.data.status === 'ok') {
                setTasks(response.data.data.list);
            }
        } catch (error) {
            message.error('获取任务列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 获取所有产品（用于选择舱段）
    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products`, {
                params: { pageSize: 1000 }
            });
            if (response.data.status === 'ok') {
                setProducts(response.data.data.list);
            }
        } catch (error) {
            message.error('获取产品列表失败');
        }
    };

    // 选择任务
    const handleSelectTask = async (task: ProductionTask) => {
        setSelectedTask(task);
        // 尝试加载已有的拆分步骤（如果有）
        try {
            const response = await axios.get(`${API_BASE_URL}/api/schedules/${task.id}`);
            if (response.data.status === 'ok' && response.data.data.length > 0) {
                setSteps(response.data.data);
            } else {
                // 初始化：默认包含一个总装步骤
                setSteps([{
                    seq: 1,
                    type: 1,
                    name: '火箭总装'
                }]);
            }
        } catch (error) {
            // 初始化
            setSteps([{
                seq: 1,
                type: 1,
                name: '火箭总装'
            }]);
        }
    };

    // 添加舱段步骤
    const handleAddSegment = () => {
        const newStep: ScheduleStep = {
            seq: steps.length + 1,
            type: 0, // 舱段生产
            productId: undefined,
            name: ''
        };
        // 插入到总装步骤之前
        const assemblyIndex = steps.findIndex(s => s.type === 1);
        if (assemblyIndex >= 0) {
            const newSteps = [...steps];
            newSteps.splice(assemblyIndex, 0, newStep);
            setSteps(newSteps.map((s, idx) => ({ ...s, seq: idx + 1 })));
        } else {
            setSteps([...steps, newStep]);
        }
    };

    // 删除步骤
    const handleDeleteStep = (index: number) => {
        const step = steps[index];
        // 不允许删除总装步骤（至少保留一个）
        if (step.type === 1 && steps.filter(s => s.type === 1).length === 1) {
            message.warning('至少需要保留一个总装步骤');
            return;
        }
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps.map((s, idx) => ({ ...s, seq: idx + 1 })));
    };

    // 上移步骤
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newSteps = [...steps];
        [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
        setSteps(newSteps.map((s, idx) => ({ ...s, seq: idx + 1 })));
    };

    // 下移步骤
    const handleMoveDown = (index: number) => {
        if (index === steps.length - 1) return;
        const newSteps = [...steps];
        [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        setSteps(newSteps.map((s, idx) => ({ ...s, seq: idx + 1 })));
    };

    // 更新步骤的产品选择
    const handleProductChange = (index: number, productId: number) => {
        const product = products.find(p => p.id === productId);
        const newSteps = [...steps];
        newSteps[index] = {
            ...newSteps[index],
            productId,
            product,
            name: product ? `${product.name}生产` : ''
        };
        setSteps(newSteps);
    };

    // 保存拆分
    const handleSaveSchedule = async () => {
        if (!selectedTask) return;

        // 验证：所有舱段步骤必须选择产品
        const segmentSteps = steps.filter(s => s.type === 0);
        const invalidSteps = segmentSteps.filter(s => !s.productId);
        if (invalidSteps.length > 0) {
            message.error('请为所有舱段步骤选择产品');
            return;
        }

        setSaving(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/schedules/${selectedTask.id}`, {
                steps: steps.map(s => ({
                    type: s.type,
                    productId: s.productId || null,
                    name: s.name
                }))
            });

            if (response.data.status === 'ok') {
                message.success('拆分保存成功');
                fetchPendingTasks(); // 刷新任务列表
                setSelectedTask(null);
                setSteps([]);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    // 清除拆分
    const handleClearSchedule = () => {
        Modal.confirm({
            title: '确认清除拆分？',
            content: '清除后，任务将回到待拆分状态',
            onOk: () => {
                setSteps([{
                    seq: 1,
                    type: 1,
                    name: '火箭总装'
                }]);
            }
        });
    };

    return (
        <div className="flex flex-col gap-4 p-2">
            <Card className="shadow-sm border-none">
                <div className="flex items-center justify-between">
                    <Space>
                        <RocketOutlined className="text-blue-500" style={{ fontSize: '20px' }} />
                        <Title level={4} style={{ margin: 0 }}>拆分管理 - 任务拆分配置</Title>
                    </Space>
                    <Text type="secondary">选择待拆分任务，手动拆分为舱段生产步骤</Text>
                </div>
            </Card>

            <Row gutter={16}>
                {/* 左侧：待拆分任务列表 */}
                <Col span={6}>
                    <Card
                        title={
                            <Space>
                                <Badge count={tasks.length} showZero>
                                    <Text strong>待拆分任务</Text>
                                </Badge>
                            </Space>
                        }
                        className="shadow-sm"
                        styles={{ body: { padding: '12px', maxHeight: '70vh', overflowY: 'auto' } }}
                    >
                        {tasks.length === 0 ? (
                            <Empty description="暂无待拆分任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <List
                                dataSource={tasks}
                                renderItem={(task) => (
                                    <List.Item
                                        key={task.id}
                                        onClick={() => handleSelectTask(task)}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '12px',
                                            marginBottom: '8px',
                                            borderRadius: '4px',
                                            border: selectedTask?.id === task.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                                            backgroundColor: selectedTask?.id === task.id ? '#e6f7ff' : '#fff',
                                            transition: 'all 0.3s'
                                        }}
                                        className="hover:shadow-sm"
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                            <Text strong className="business-code">{task.code}</Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                产品: {task.product.name}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                截止: {dayjs(task.deadline).format('YYYY-MM-DD')}
                                            </Text>
                                            <Tag color="default" style={{ fontSize: '11px' }}>待拆分</Tag>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                {/* 中间：拆分配置区域 */}
                <Col span={12}>
                    <Card
                        title={
                            selectedTask ? (
                                <Space>
                                    <BuildOutlined />
                                    <Text strong>任务拆分: {selectedTask.code}</Text>
                                </Space>
                            ) : (
                                <Text type="secondary">请从左侧选择任务</Text>
                            )
                        }
                        className="shadow-sm"
                        styles={{ body: { padding: '16px', minHeight: '70vh' } }}
                        extra={
                            selectedTask && (
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAddSegment}
                                        size="small"
                                    >
                                        添加舱段
                                    </Button>
                                    <Button
                                        icon={<CloseOutlined />}
                                        onClick={handleClearSchedule}
                                        size="small"
                                    >
                                        清除
                                    </Button>
                                </Space>
                            )
                        }
                    >
                        {selectedTask ? (
                            <div>
                                {/* 任务信息 */}
                                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Text type="secondary">订单:</Text> {selectedTask.order.name}
                                        </Col>
                                        <Col span={12}>
                                            <Text type="secondary">产品:</Text> {selectedTask.product.name}
                                        </Col>
                                    </Row>
                                </Card>

                                <Divider orientation="left">生产步骤（总——分两段式结构）</Divider>

                                {/* 步骤列表 */}
                                <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '8px' }}>
                                    {steps.map((step, index) => (
                                        <Card
                                            key={index}
                                            size="small"
                                            style={{
                                                marginBottom: 12,
                                                borderLeft: step.type === 0 ? '4px solid #52c41a' : '4px solid #1890ff'
                                            }}
                                        >
                                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                                <div className="flex justify-between items-center">
                                                    <Space>
                                                        <Tag color={step.type === 0 ? 'green' : 'blue'}>
                                                            {step.type === 0 ? '舱段生产' : '火箭总装'}
                                                        </Tag>
                                                        <Text strong>步骤 {index + 1}</Text>
                                                    </Space>
                                                    <Space>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowUpOutlined />}
                                                            onClick={() => handleMoveUp(index)}
                                                            disabled={index === 0}
                                                        />
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<ArrowDownOutlined />}
                                                            onClick={() => handleMoveDown(index)}
                                                            disabled={index === steps.length - 1}
                                                        />
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleDeleteStep(index)}
                                                        />
                                                    </Space>
                                                </div>

                                                {step.type === 0 && (
                                                    <Select
                                                        style={{ width: '100%' }}
                                                        placeholder="选择舱段产品"
                                                        value={step.productId}
                                                        onChange={(value) => handleProductChange(index, value)}
                                                        showSearch
                                                        filterOption={(input, option) =>
                                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        options={products.map(p => ({
                                                            value: p.id,
                                                            label: `${p.name} (${p.code})${p.type ? ` - ${p.type}` : ''}`
                                                        }))}
                                                    />
                                                )}

                                                {step.product && (
                                                    <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            {step.product.code} - {step.product.name}
                                                            {step.product.type && ` (${step.product.type})`}
                                                        </Text>
                                                    </div>
                                                )}
                                            </Space>
                                        </Card>
                                    ))}
                                </div>

                                <Divider />

                                <div style={{ textAlign: 'center' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<SaveOutlined />}
                                        onClick={handleSaveSchedule}
                                        loading={saving}
                                    >
                                        保存拆分配置
                                    </Button>
                                    <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: '12px' }}>
                                        保存后，任务状态将变更为"已拆分"
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Empty
                                description="请从左侧选择一个待拆分任务"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                style={{ marginTop: '20vh' }}
                            />
                        )}
                    </Card>
                </Col>

                {/* 右侧：摘要信息 */}
                <Col span={6}>
                    <Card
                        title="配置摘要"
                        className="shadow-sm"
                        styles={{ body: { padding: '16px' } }}
                    >
                        {selectedTask && steps.length > 0 ? (
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                <div>
                                    <Text type="secondary">任务编号:</Text>
                                    <div className="business-code" style={{ marginTop: 4 }}>{selectedTask.code}</div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} />
                                <div>
                                    <Text type="secondary">生产步骤总数:</Text>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginTop: 4 }}>
                                        {steps.length}
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} />
                                <div>
                                    <Text type="secondary">舱段生产:</Text>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginTop: 4 }}>
                                        {steps.filter(s => s.type === 0).length} 个
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary">总装步骤:</Text>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', marginTop: 4 }}>
                                        {steps.filter(s => s.type === 1).length} 个
                                    </div>
                                </div>
                                <Divider style={{ margin: '8px 0' }} />
                                <div>
                                    <Text type="secondary">执行顺序:</Text>
                                    <div style={{ marginTop: 8 }}>
                                        {steps.map((s, i) => (
                                            <div key={i} style={{ marginBottom: 4, fontSize: '12px' }}>
                                                {i + 1}. {s.name || (s.type === 0 ? '未选择舱段' : '火箭总装')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Space>
                        ) : (
                            <Empty
                                description="暂无配置"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SchedulingPlanner;
