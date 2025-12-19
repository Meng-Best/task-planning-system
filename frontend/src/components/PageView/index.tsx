import { Card, Typography, Empty, Row, Col, Statistic } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ProjectOutlined,
  RiseOutlined 
} from '@ant-design/icons'
import { findMenuItemByKey } from '../../config/menuConfig'
import WorkCalendar from '../../pages/BasicData/WorkCalendar'
import FactoryManagement from '../../pages/BasicData/FactoryManagement'
import DeviceManagement from '../../pages/BasicData/DeviceManagement'

const { Title, Paragraph } = Typography

interface PageViewProps {
  tabKey: string
}

// 工作台页面
const DashboardView: React.FC = () => {
  return (
    <div className="space-y-4">
      <Title level={4}>欢迎回来 👋</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="待完成任务"
              value={12}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="已完成任务"
              value={36}
              prefix={<CheckCircleOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="进行中项目"
              value={5}
              prefix={<ProjectOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="本周效率"
              value={93}
              suffix="%"
              prefix={<RiseOutlined className="text-purple-500" />}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速入口 */}
      <Card title="快速开始" className="mt-4">
        <Paragraph className="text-gray-500">
          这是个人任务筹划系统的工作台。您可以在这里快速查看任务概览、创建新任务或管理项目。
        </Paragraph>
        <Paragraph className="text-gray-500">
          👈 请使用左侧菜单导航到不同的功能模块，每个模块将在右侧标签页中打开。
        </Paragraph>
      </Card>
    </div>
  )
}

// 通用页面模板
const GenericPageView: React.FC<{ tabKey: string }> = ({ tabKey }) => {
  const menuItem = findMenuItemByKey(tabKey)
  
  return (
    <Card>
      <div className="text-center py-8">
        <Title level={4}>{menuItem?.label || tabKey}</Title>
        <Empty 
          description={
            <span className="text-gray-400">
              页面 "{menuItem?.label || tabKey}" 的内容区域
              <br />
              <span className="text-sm">功能开发中，敬请期待...</span>
            </span>
          }
        />
      </div>
    </Card>
  )
}

// 根据 tabKey 渲染对应的页面
const PageView: React.FC<PageViewProps> = ({ tabKey }) => {
  switch (tabKey) {
    case 'dashboard':
      return <DashboardView />
    case 'work-calendar':
      return <WorkCalendar />
    case 'factory-mgmt':
      return <FactoryManagement />
    case 'device-mgmt':
      return <DeviceManagement />
    default:
      return <GenericPageView tabKey={tabKey} />
  }
}

export default PageView

