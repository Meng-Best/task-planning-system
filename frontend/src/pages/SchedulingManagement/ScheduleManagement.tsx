import { Card, Typography, Empty } from 'antd'

const ScheduleManagement: React.FC = () => {
  return (
    <Card title="排程管理">
      <Empty description={<Typography.Text type="secondary">排程管理功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default ScheduleManagement
