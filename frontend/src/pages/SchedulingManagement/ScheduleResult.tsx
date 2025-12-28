import { Card, Typography, Empty } from 'antd'

const ScheduleResult: React.FC = () => {
  return (
    <Card title="排程结果展示">
      <Empty description={<Typography.Text type="secondary">排程结果展示功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default ScheduleResult
