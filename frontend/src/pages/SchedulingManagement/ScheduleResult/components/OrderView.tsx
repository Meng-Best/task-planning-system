import { Card, Collapse, Tag, Table, Space, Typography, Badge } from 'antd'
import { ArrowRightOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { OrderTreeNode, TaskPlan } from '../types'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Panel } = Collapse
const { Text } = Typography

interface OrderViewProps {
  data: OrderTreeNode[]
  onTaskClick?: (task: TaskPlan) => void
}

const OrderView: React.FC<OrderViewProps> = ({ data, onTaskClick }) => {
  const taskColumns: ColumnsType<TaskPlan> = [
    {
      title: '任务编码',
      dataIndex: 'task_code',
      key: 'task_code',
      width: 100,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '工序名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '工序编码',
      dataIndex: 'process_code',
      key: 'process_code',
      width: 120,
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: '开始时间',
      dataIndex: 'planstart',
      key: 'planstart',
      width: 150,
      render: (text) => dayjs(text).format('MM-DD HH:mm')
    },
    {
      title: '结束时间',
      dataIndex: 'planend',
      key: 'planend',
      width: 150,
      render: (text) => dayjs(text).format('MM-DD HH:mm')
    },
    {
      title: '班组',
      dataIndex: 'team name',
      key: 'team',
      width: 100,
      render: (text, record) => (
        <Tag color="blue" style={{ margin: 0 }}>{record.team_code}</Tag>
      )
    },
    {
      title: '工位',
      dataIndex: 'station name',
      key: 'station',
      width: 100,
      render: (text, record) => (
        <Tag color="green" style={{ margin: 0 }}>{record['station code']}</Tag>
      )
    }
  ]

  return (
    <div>
      <Collapse
        defaultActiveKey={data.map(o => o.orderCode)}
        style={{ background: 'transparent' }}
        expandIconPosition="start"
      >
        {data.map((order, orderIndex) => (
          <Panel
            key={order.orderCode}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Badge
                  count={orderIndex + 1}
                  style={{
                    backgroundColor: '#1890ff',
                    fontSize: 14,
                    fontWeight: 'bold',
                    minWidth: 28,
                    height: 28,
                    lineHeight: '28px'
                  }}
                />
                <Text strong style={{ fontSize: 16, color: '#262626', minWidth: 180 }}>
                  {order.orderCode} - {order.orderName}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <ClockCircleOutlined /> {dayjs(order.planStart).format('YYYY-MM-DD')} ~ {dayjs(order.planEnd).format('YYYY-MM-DD')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <CheckCircleOutlined /> 共 {order.tasks.length} 个任务
                  </Text>
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            {/* 最佳产品序列 */}
            <Card
              size="small"
              title={<span style={{ fontSize: 14 }}>📦 最佳产品序列</span>}
              style={{
                marginBottom: 16,
                background: 'linear-gradient(to right, #f0f5ff, #ffffff)',
                border: '1px solid #d6e4ff'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {order.productSequence.map((product, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag
                      color="purple"
                      style={{
                        fontSize: 14,
                        padding: '6px 16px',
                        borderRadius: 6,
                        fontWeight: 500,
                        margin: 0
                      }}
                    >
                      {product}
                    </Tag>
                    {index < order.productSequence.length - 1 && (
                      <ArrowRightOutlined
                        style={{
                          color: '#1890ff',
                          fontSize: 16,
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* 任务列表 */}
            <Table
              size="small"
              columns={taskColumns}
              dataSource={order.tasks}
              rowKey="task id"
              pagination={false}
              scroll={{ x: 1000 }}
              rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : ''}
              onRow={(record) => ({
                onClick: () => onTaskClick?.(record),
                style: { cursor: onTaskClick ? 'pointer' : 'default' }
              })}
            />
          </Panel>
        ))}
      </Collapse>

      <style>{`
        /* 移除 Collapse 容器外边框 */
        .ant-collapse {
          border: none !important;
          background: transparent !important;
        }
        .table-row-light {
          background-color: #fafafa;
        }
        .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff !important;
        }
        /* 订单卡片整体 - 添加间距，确保所有角都是圆角 */
        .ant-collapse-item {
          background: white;
          border: 1px solid #e8e8e8 !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          margin-bottom: 16px !important;
          transition: box-shadow 0.3s ease;
          overflow: hidden;
        }
        .ant-collapse-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .ant-collapse-content {
          border-top: 1px solid #f0f0f0 !important;
          background: white;
          border-radius: 0 0 8px 8px !important;
        }
        .ant-collapse-content-box {
          padding: 16px !important;
        }
        /* 优化展开/收起箭头 */
        .ant-collapse-expand-icon {
          padding-inline-end: 16px !important;
        }
        .ant-collapse-arrow {
          font-size: 16px !important;
          color: #1890ff !important;
          font-weight: bold;
          transition: transform 0.3s ease, color 0.3s ease;
        }
        .ant-collapse-item:hover .ant-collapse-arrow {
          color: #40a9ff !important;
        }
        .ant-collapse-item-active .ant-collapse-arrow {
          transform: rotate(90deg);
        }
        /* 优化面板头部 - 固定高度确保一致性 */
        .ant-collapse-header {
          padding: 18px 20px !important;
          align-items: center !important;
          min-height: 64px !important;
          background: transparent;
          border: none;
          border-radius: 8px 8px 0 0 !important;
        }
        /* 未展开状态下，头部也要有底部圆角 */
        .ant-collapse-item:not(.ant-collapse-item-active) .ant-collapse-header {
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  )
}

export default OrderView
