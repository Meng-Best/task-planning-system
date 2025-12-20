import { Tabs, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { CloseOutlined, MoreOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { useTabStore } from '../../store/useTabStore'
import PageView from '../PageView'

interface MainContentProps {
  collapsed: boolean
  onToggle: () => void
}

const MainContent: React.FC<MainContentProps> = ({ collapsed, onToggle }) => {
  const { 
    activeTab, 
    openedTabs, 
    setActiveTab, 
    removeTab,
    closeOtherTabs,
    closeAllTabs
  } = useTabStore()

  // 标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key)
  }

  // 标签页编辑（关闭）
  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      removeTab(targetKey)
    }
  }

  // 右键菜单项
  const getContextMenuItems = (tabKey: string): MenuProps['items'] => [
    {
      key: 'close',
      label: '关闭当前',
      onClick: () => removeTab(tabKey),
      disabled: openedTabs.find(t => t.key === tabKey)?.closable === false
    },
    {
      key: 'closeOthers',
      label: '关闭其他',
      onClick: () => closeOtherTabs(tabKey)
    },
    {
      key: 'closeAll',
      label: '关闭所有',
      onClick: () => closeAllTabs()
    }
  ]

  // 构建标签页项
  const tabItems = openedTabs.map(tab => ({
    key: tab.key,
    label: (
      <Dropdown
        menu={{ items: getContextMenuItems(tab.key) }}
        trigger={['contextMenu']}
      >
        <span className="flex items-center gap-1">
          {tab.label}
        </span>
      </Dropdown>
    ),
    closable: tab.closable !== false,
    closeIcon: <CloseOutlined className="text-xs" />
  }))

  // 更多操作下拉菜单
  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'closeAll',
      label: '关闭所有标签',
      onClick: () => closeAllTabs()
    }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* 标签栏 */}
      <div className="flex items-center shadow-sm bg-slate-50 border-b border-gray-200">
        {/* 固定在顶部的折叠按钮 */}
        <div 
          className="px-4 h-[40px] flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors border-r border-gray-200 text-slate-500"
          onClick={onToggle}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? <MenuUnfoldOutlined className="text-lg" /> : <MenuFoldOutlined className="text-lg" />}
        </div>
        <Tabs
          type="editable-card"
          hideAdd
          activeKey={activeTab}
          onChange={handleTabChange}
          onEdit={handleTabEdit}
          items={tabItems}
          className="flex-1 tab-bar-custom"
          tabBarStyle={{
            margin: 0
          }}
        />
        <div className="bg-gradient-to-b from-slate-50 to-slate-100 h-full flex items-center px-1">
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <button className="px-3 py-2 rounded-lg hover:bg-white/60 text-slate-500 transition-colors">
              <MoreOutlined className="text-base" />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* 视图容器 */}
      <div className="flex-1 overflow-auto p-4 bg-white m-3 rounded-xl shadow-sm">
        <PageView tabKey={activeTab} />
      </div>
    </div>
  )
}

export default MainContent

