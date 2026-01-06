import { Tabs, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { CloseOutlined, MoreOutlined, MenuFoldOutlined, MenuUnfoldOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import { useTabStore } from '../../store/useTabStore'
import PageView from '../PageView'

interface MainContentProps {
  collapsed: boolean
  onToggle: () => void
  fullscreen?: boolean
  onFullscreenToggle?: () => void
}

const MainContent: React.FC<MainContentProps> = ({ collapsed, onToggle, fullscreen, onFullscreenToggle }) => {
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
      key: 'fullscreen',
      icon: fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />,
      label: fullscreen ? '退出全屏' : '全屏模式',
      onClick: () => onFullscreenToggle?.()
    },
    { type: 'divider' },
    {
      key: 'closeOthers',
      label: '关闭其他标签',
      onClick: () => closeOtherTabs(activeTab)
    },
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
        {/* 固定在顶部的折叠按钮 - 全屏时显示退出全屏按钮 */}
        <div
          className="px-4 h-[40px] flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors border-r border-gray-200 text-slate-500"
          onClick={fullscreen ? onFullscreenToggle : onToggle}
          title={fullscreen ? "退出全屏" : (collapsed ? "展开侧边栏" : "收起侧边栏")}
        >
          {fullscreen ? (
            <FullscreenExitOutlined className="text-lg" />
          ) : (
            collapsed ? <MenuUnfoldOutlined className="text-lg" /> : <MenuFoldOutlined className="text-lg" />
          )}
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
        <div className="h-full flex items-center px-2 border-l border-gray-200/80">
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 active:bg-slate-200 transition-all duration-150"
              title="更多操作"
            >
              <MoreOutlined className="text-sm" />
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

