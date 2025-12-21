import { Menu, ConfigProvider } from 'antd'
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
      className="h-full flex flex-col select-none"
      style={{
        background: '#000000',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* 菜单区域 */}
      <div className="flex-1 overflow-y-auto custom-dark-menu">
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemColor: 'rgba(255, 255, 255, 0.85)',
                darkItemHoverColor: '#ffffff',
                darkItemSelectedColor: '#ffffff',
                darkItemSelectedBg: 'rgba(24, 144, 255, 0.2)',
                darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
                darkSubMenuItemBg: '#000000',
              },
            },
          }}
        >
          <Menu
            mode="inline"
          theme="dark"
          selectedKeys={[activeTab]}
          items={getAntdMenuItems(menuItems)}
            onClick={handleMenuClick}
            className="border-r-0"
            style={{ 
              paddingTop: 8,
              background: 'transparent',
              fontWeight: 500
            }}
          />
        </ConfigProvider>
      </div>
      
      {/* 底部公司标识 */}
      {!collapsed && (
        <div className="p-3 border-t border-white/5">
          <div className="company-brand-box">
            <div className="flex items-center gap-3 px-3 py-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all border border-white/10 shadow-lg">
              <img 
                src="/images/expace-logo.jpg" 
                alt="EXPACE" 
                className="h-11 w-auto rounded opacity-100 shadow-sm"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-wide">
                  航天科工火箭
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                  向上每一天
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-dark-menu .ant-menu-item-selected {
          border-right: 3px solid #1890ff !important;
        }
        .custom-dark-menu .ant-menu-inline-collapsed .ant-menu-item-selected {
          border-right: none !important;
        }
      `}</style>
    </div>
  )
}

export default LeftSidebar

