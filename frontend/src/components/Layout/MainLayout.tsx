import { useState } from 'react'
import { Layout } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import TopBanner from './TopBanner'
import LeftSidebar from './LeftSidebar'
import MainContent from './MainContent'

const { Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout className="h-screen">
      {/* 顶部 Banner */}
      <TopBanner />
      
      {/* 主体区域：左侧边栏 + 右侧内容 */}
      <Layout className="flex-1 overflow-hidden">
        {/* 侧边栏容器（包含侧边栏和折叠按钮） */}
        <div className="sidebar-area">
          <Sider 
            width={230}
            collapsedWidth={0}
            collapsed={collapsed}
            theme="light"
            className="sidebar-wrapper"
            style={{
              overflow: 'auto',
              height: 'calc(100vh - 80px)'
            }}
          >
            <LeftSidebar collapsed={collapsed} />
          </Sider>
          
          {/* 折叠按钮 */}
          <div 
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
        
        {/* 右侧主体内容区域 */}
        <Content className="overflow-hidden relative">
          <MainContent />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout

