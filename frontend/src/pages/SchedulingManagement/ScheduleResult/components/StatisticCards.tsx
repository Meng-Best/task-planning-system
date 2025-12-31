import { Card, Col, Row, Statistic } from 'antd'
import {
  ProjectOutlined,
  SnippetsOutlined,
  TeamOutlined,
  ClusterOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import type { StatisticData } from '../types'

interface StatisticCardsProps {
  data: StatisticData
  lastModified?: string
}

const StatisticCards: React.FC<StatisticCardsProps> = ({ data, lastModified }) => {
  // 统一卡片样式
  const cardStyle = { height: '100%', minHeight: 120 }

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="订单数量"
              value={data.totalOrders}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="任务总数"
              value={data.totalTasks}
              prefix={<SnippetsOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="涉及班组"
              value={data.totalTeams}
              suffix="个"
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="涉及工位"
              value={data.totalStations}
              suffix="个"
              prefix={<ClusterOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="时间跨度"
              value={data.dateRange.days}
              suffix="天"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="调度周期"
              value={`${data.dateRange.start} ~ ${data.dateRange.end}`}
              valueStyle={{ fontSize: 14, color: '#595959' }}
            />
            {lastModified && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                更新时间: {lastModified}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StatisticCards
