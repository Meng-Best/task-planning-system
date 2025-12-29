import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  SettingOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  DatabaseOutlined,
  BankOutlined,
  ToolOutlined,
  ApartmentOutlined,
  ClusterOutlined,
  RocketOutlined,
  AppstoreOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  ReadOutlined,
  PartitionOutlined,
  ControlOutlined,
  ScheduleOutlined,
  ProfileOutlined,
  SnippetsOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  AreaChartOutlined
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
        key: 'station-mgmt',
        label: '工位管理',
        icon: React.createElement(ClusterOutlined)
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
    key: 'product-process-mgmt',
    label: '产品工艺管理',
    icon: React.createElement(ReadOutlined),
    children: [
      {
        key: 'product-mgmt',
        label: '产品管理',
        icon: React.createElement(ProjectOutlined)
      },
      {
        key: 'routing-mgmt',
        label: '工艺路线管理',
        icon: React.createElement(PartitionOutlined)
      },
      {
        key: 'process-mgmt',
        label: '工序配置管理',
        icon: React.createElement(ControlOutlined)
      }
    ]
  },
  {
    key: 'scheduling-mgmt',
    label: '生产调度管理',
    icon: React.createElement(ScheduleOutlined),
    children: [
      {
        key: 'order-mgmt',
        label: '销售订单',
        icon: React.createElement(ProfileOutlined)
      },
      {
        key: 'task-mgmt',
        label: '生产订单',
        icon: React.createElement(SnippetsOutlined)
      },
      {
        key: 'schedule-mgmt',
        label: '订单拆分',
        icon: React.createElement(DeploymentUnitOutlined)
      },
      {
        key: 'plan-making',
        label: '生产计划总览',
        icon: React.createElement(ProjectOutlined)
      },
      {
        key: 'simulation-eval',
        label: '模拟排程评估',
        icon: React.createElement(ExperimentOutlined)
      },
      {
        key: 'schedule-result',
        label: '排程结果展示',
        icon: React.createElement(AreaChartOutlined)
      }
    ]
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

