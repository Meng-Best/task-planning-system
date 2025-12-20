import { Card, Typography, Empty } from 'antd'
import { findMenuItemByKey } from '../../config/menuConfig'
import WorkCalendar from '../../pages/BasicData/WorkCalendar'
import FactoryManagement from '../../pages/BasicData/FactoryManagement'
import ProductionLineManagement from '../../pages/BasicData/ProductionLineManagement'
import DeviceManagement from '../../pages/BasicData/DeviceManagement'
import StaffManagement from '../../pages/BasicData/StaffManagement'
import TeamManagement from '../../pages/BasicData/TeamManagement'
import Dashboard from '../../pages/Workbench/Dashboard'

interface PageViewProps {
  tabKey: string
}

// 通用页面模板
const GenericPageView: React.FC<{ tabKey: string }> = ({ tabKey }) => {
  const { Title } = Typography
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
      return <Dashboard />
    case 'work-calendar':
      return <WorkCalendar />
    case 'factory-mgmt':
      return <FactoryManagement />
    case 'line-mgmt':
      return <ProductionLineManagement />
    case 'device-mgmt':
      return <DeviceManagement />
    case 'staff-mgmt':
      return <StaffManagement />
    case 'team-mgmt':
      return <TeamManagement />
    default:
      return <GenericPageView tabKey={tabKey} />
  }
}

export default PageView

