import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  SettingOutlined,
  CalendarOutlined,
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  BankOutlined,
  ToolOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import React from 'react'

// 菜单项类型定义
export interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  children?: MenuItem[]
}

// 菜单配置
export const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: React.createElement(DashboardOutlined)
  },
  {
    key: 'basic-data',
    label: '基础数据',
    icon: React.createElement(DatabaseOutlined),
    children: [
      {
        key: 'work-calendar',
        label: '工作日历',
        icon: React.createElement(CalendarOutlined)
      },
      {
        key: 'factory-mgmt',
        label: '工厂管理',
        icon: React.createElement(BankOutlined)
      },
      {
        key: 'line-mgmt',
        label: '产线管理',
        icon: React.createElement(ApartmentOutlined)
      },
      {
        key: 'device-mgmt',
        label: '设备管理',
        icon: React.createElement(ToolOutlined)
      },
      {
        key: 'staff-mgmt',
        label: '人员管理',
        icon: React.createElement(UserOutlined)
      },
      {
        key: 'team-mgmt',
        label: '班组管理',
        icon: React.createElement(TeamOutlined)
      }
    ]
  },
  {
    key: 'projects',
    label: '项目管理',
    icon: React.createElement(ProjectOutlined),
    children: [
      {
        key: 'project-a',
        label: 'Project A',
        icon: React.createElement(FolderOutlined)
      },
      {
        key: 'project-b',
        label: 'Project B',
        icon: React.createElement(FolderOutlined)
      },
      {
        key: 'project-c',
        label: 'Project C',
        icon: React.createElement(FolderOutlined)
      }
    ]
  },
  {
    key: 'tasks',
    label: '任务中心',
    icon: React.createElement(FileTextOutlined),
    children: [
      {
        key: 'my-tasks',
        label: '我的任务'
      },
      {
        key: 'today-tasks',
        label: '今日待办',
        icon: React.createElement(CalendarOutlined)
      },
      {
        key: 'completed-tasks',
        label: '已完成'
      }
    ]
  },
  {
    key: 'team',
    label: '团队协作',
    icon: React.createElement(TeamOutlined)
  },
  {
    key: 'statistics',
    label: '数据统计',
    icon: React.createElement(BarChartOutlined)
  },
  {
    key: 'settings',
    label: '系统设置',
    icon: React.createElement(SettingOutlined),
    children: [
      {
        key: 'general-settings',
        label: '通用设置'
      },
      {
        key: 'notification-settings',
        label: '通知设置'
      },
      {
        key: 'appearance-settings',
        label: '外观设置'
      }
    ]
  }
]

// 将菜单配置转换为 Ant Design Menu 需要的格式
export const getAntdMenuItems = (items: MenuItem[]): MenuProps['items'] => {
  return items.map(item => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    children: item.children ? getAntdMenuItems(item.children) : undefined
  }))
}

// 根据 key 查找菜单项
export const findMenuItemByKey = (key: string, items: MenuItem[] = menuItems): MenuItem | null => {
  for (const item of items) {
    if (item.key === key) {
      return item
    }
    if (item.children) {
      const found = findMenuItemByKey(key, item.children)
      if (found) return found
    }
  }
  return null
}

