import { Card, Col, Row, Progress, Table, Typography } from 'antd'
import type { StationTimelineData, TaskPlan } from '../types'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

interface StationViewProps {
  data: StationTimelineData[]
  onTaskClick?: (task: TaskPlan) => void
}

const StationView: React.FC<StationViewProps> = ({ data, onTaskClick }) => {
  const taskColumns: ColumnsType<TaskPlan> = [
    {
      title: '任务',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '订单',
      dataIndex: 'order_name',
      key: 'order_name',
      width: 150
    },
    {
      title: '开始时间',
      dataIndex: 'planstart',
      key: 'planstart',
      width: 150
    },
    {
      title: '结束时间',
      dataIndex: 'planend',
      key: 'planend',
      width: 150
    },
    {
      title: '班组',
      dataIndex: 'team name',
      key: 'team_name',
      width: 120
    }
  ]

  return (
    <div>
      {/* 利用率概览 */}
      <Card title="工位利用率概览" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {data.map(station => (
            <Col xs={24} sm={12} md={8} lg={6} key={station.stationCode}>
              <Card size="small">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <Text strong>{station.stationCode}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {station.stationName}
                  </Text>
                </div>
                <Progress
                  percent={station.utilization}
                  format={(percent) => `${percent}%`}
                  strokeColor={
                    station.utilization > 80
                      ? '#ff4d4f'
                      : station.utilization > 60
                        ? '#faad14'
                        : '#52c41a'
                  }
                />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    任务数: {station.tasks.length}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 每个工位的详细任务列表 */}
      {data.map(station => (
        <Card
          key={station.stationCode}
          title={
            <span>
              {station.stationCode} - {station.stationName}
              <Text type="secondary" style={{ marginLeft: 16, fontSize: 14 }}>
                (利用率: {station.utilization}%, 任务数: {station.tasks.length})
              </Text>
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            size="small"
            columns={taskColumns}
            dataSource={station.tasks}
            rowKey="task id"
            pagination={false}
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => onTaskClick?.(record),
              style: { cursor: onTaskClick ? 'pointer' : 'default' }
            })}
          />
        </Card>
      ))}
    </div>
  )
}

export default StationView
