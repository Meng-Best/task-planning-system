import { Card, Typography, Empty } from 'antd'

const PlanMaking: React.FC = () => {
  return (
    <Card title="生产计划总览">
      <Empty description={<Typography.Text type="secondary">生产计划制定功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default PlanMaking
