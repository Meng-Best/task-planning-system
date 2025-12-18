import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import { menuItems, getAntdMenuItems, findMenuItemByKey } from '../../config/menuConfig'
import { useTabStore } from '../../store/useTabStore'

interface LeftSidebarProps {
  collapsed?: boolean
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ collapsed }) => {
  const { activeTab, addTab } = useTabStore()

  // 菜单点击事件
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const menuItem = findMenuItemByKey(key)
    if (menuItem) {
      addTab({
        key: menuItem.key,
        label: menuItem.label,
        closable: menuItem.key !== 'dashboard' // 工作台不可关闭
      })
    }
  }

  return (
    <div 
      className="h-full border-r border-gray-100 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.02) 50%, #ffffff 100%)'
      }}
    >
      {/* 菜单区域 */}
      <div className="flex-1 overflow-y-auto">
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          defaultOpenKeys={['projects', 'tasks', 'settings']}
          items={getAntdMenuItems(menuItems)}
          onClick={handleMenuClick}
          className="border-r-0"
          style={{ 
            paddingTop: 8
          }}
        />
      </div>
      
      {/* 底部公司标识 */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="company-brand-box">
            <div className="flex items-center gap-3 px-3 py-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50/80 transition-all">
              <img 
                src="/images/expace-logo.jpg" 
                alt="EXPACE" 
                className="h-11 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700 tracking-wide">
                  航天科工火箭
                </span>
                <span className="text-xs text-gray-400">
                  向上每一天
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeftSidebar

