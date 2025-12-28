import { Card, Typography, Empty } from 'antd'

const SimulationEvaluation: React.FC = () => {
  return (
    <Card title="模拟排程评估">
      <Empty description={<Typography.Text type="secondary">模拟排程评估功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default SimulationEvaluation
