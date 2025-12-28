import { Card, Typography, Empty } from 'antd'

const TaskManagement: React.FC = () => {
  return (
    <Card title="任务管理">
      <Empty description={<Typography.Text type="secondary">任务管理功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default TaskManagement
