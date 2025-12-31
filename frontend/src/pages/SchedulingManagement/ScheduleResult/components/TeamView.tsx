import { Card, Col, Row, Statistic, Table, Typography } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import type { TeamWorkloadData, TaskPlan } from '../types'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

interface TeamViewProps {
  data: TeamWorkloadData[]
  onTaskClick?: (task: TaskPlan) => void
}

const TeamView: React.FC<TeamViewProps> = ({ data, onTaskClick }) => {
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
      title: '工位',
      dataIndex: 'station name',
      key: 'station_name',
      width: 150
    }
  ]

  return (
    <div>
      {/* 班组工作负荷概览 */}
      <Card title="班组工作负荷概览" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {data.map(team => (
            <Col xs={24} sm={12} md={8} lg={6} key={team.teamCode}>
              <Card size="small">
                <Statistic
                  title={
                    <div>
                      <TeamOutlined /> {team.teamCode} - {team.teamName}
                    </div>
                  }
                  value={team.totalHours}
                  suffix="小时"
                  valueStyle={{ fontSize: 24 }}
                />
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    任务数: {team.tasks.length}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    平均每任务: {Math.round(team.totalHours / team.tasks.length)} 小时
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 每个班组的详细任务列表 */}
      {data.map(team => (
        <Card
          key={team.teamCode}
          title={
            <span>
              <TeamOutlined /> {team.teamCode} - {team.teamName}
              <Text type="secondary" style={{ marginLeft: 16, fontSize: 14 }}>
                (总工时: {team.totalHours}h, 任务数: {team.tasks.length})
              </Text>
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            size="small"
            columns={taskColumns}
            dataSource={team.tasks}
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

export default TeamView
