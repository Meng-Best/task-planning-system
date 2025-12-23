import { useState } from 'react'
import { Layout } from 'antd'
import TopBanner from './TopBanner'
import LeftSidebar from './LeftSidebar'
import MainContent from './MainContent'

const { Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 顶部 Banner */}
      <TopBanner />
      
      {/* 主体区域：左侧边栏 + 右侧内容 */}
      <Layout style={{ flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
        {/* 侧边栏容器 */}
        <Sider 
          width={230}
          collapsedWidth={0}
          collapsed={collapsed}
          theme="dark"
          className="sidebar-wrapper"
          style={{
            height: '100%',
            overflow: 'auto',
            borderRight: '1px solid #000000',
            background: '#000000'
          }}
        >
          <LeftSidebar collapsed={collapsed} />
        </Sider>
        
        {/* 右侧主体内容区域 */}
        <Content style={{ 
          position: 'relative', 
          height: '100%', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <MainContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout

