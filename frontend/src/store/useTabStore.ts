import { create } from 'zustand'

// 标签页数据类型
export interface TabItem {
  key: string
  label: string
  icon?: string
  closable?: boolean
}

// Store 状态类型
interface TabState {
  // 当前激活的标签页 key
  activeTab: string
  // 已打开的标签页列表
  openedTabs: TabItem[]
  // 添加标签页（如果已存在则激活）
  addTab: (tab: TabItem) => void
  // 关闭标签页
  removeTab: (key: string) => void
  // 设置激活的标签页
  setActiveTab: (key: string) => void
  // 关闭其他标签页
  closeOtherTabs: (key: string) => void
  // 关闭所有标签页
  closeAllTabs: () => void
}

// 默认首页标签
const DEFAULT_TAB: TabItem = {
  key: 'dashboard',
  label: '工作台',
  icon: 'dashboard',
  closable: false
}

export const useTabStore = create<TabState>((set, get) => ({
  activeTab: DEFAULT_TAB.key,
  openedTabs: [DEFAULT_TAB],

  addTab: (tab: TabItem) => {
    const { openedTabs } = get()
    const exists = openedTabs.find(t => t.key === tab.key)
    
    if (exists) {
      // 标签已存在，直接激活
      set({ activeTab: tab.key })
    } else {
      // 新增标签
      set({
        openedTabs: [...openedTabs, { ...tab, closable: tab.closable !== false }],
        activeTab: tab.key
      })
    }
  },

  removeTab: (key: string) => {
    const { openedTabs, activeTab } = get()
    const targetTab = openedTabs.find(t => t.key === key)
    
    // 不能关闭不可关闭的标签
    if (targetTab && targetTab.closable === false) {
      return
    }

    const newTabs = openedTabs.filter(t => t.key !== key)
    
    // 如果关闭的是当前激活的标签，需要切换到其他标签
    if (key === activeTab && newTabs.length > 0) {
      const index = openedTabs.findIndex(t => t.key === key)
      const newActiveIndex = Math.min(index, newTabs.length - 1)
      set({
        openedTabs: newTabs,
        activeTab: newTabs[newActiveIndex].key
      })
    } else {
      set({ openedTabs: newTabs })
    }
  },

  setActiveTab: (key: string) => {
    set({ activeTab: key })
  },

  closeOtherTabs: (key: string) => {
    const { openedTabs } = get()
    const newTabs = openedTabs.filter(t => t.key === key || t.closable === false)
    set({
      openedTabs: newTabs,
      activeTab: key
    })
  },

  closeAllTabs: () => {
    const { openedTabs } = get()
    const newTabs = openedTabs.filter(t => t.closable === false)
    set({
      openedTabs: newTabs,
      activeTab: newTabs.length > 0 ? newTabs[0].key : ''
    })
  }
}))

