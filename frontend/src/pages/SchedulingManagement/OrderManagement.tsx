import { Card, Typography, Empty } from 'antd'

const OrderManagement: React.FC = () => {
  return (
    <Card title="订单管理">
      <Empty description={<Typography.Text type="secondary">订单管理功能待确认，稍后补充业务逻辑</Typography.Text>} />
    </Card>
  )
}

export default OrderManagement
