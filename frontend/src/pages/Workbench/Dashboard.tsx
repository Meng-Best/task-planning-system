import React from 'react';
import { Row, Col, Skeleton } from 'antd';
import {
  BankOutlined,
  ApartmentOutlined,
  TeamOutlined,
  DatabaseOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTabStore } from '../../store/useTabStore';
import { useDashboard } from '../../hooks/useDashboard';
import {
  DashboardHeader,
  KPICard,
  TrendChart,
  QuickActionCard,
} from './components';
import type { ColorScheme } from './components';

// KPI 卡片配置类型
interface KPICardConfig {
  title: string;
  getValue: () => number;
  getNumerator: () => number;
  getDenominator: () => number;
  icon: React.ReactNode;
  colorScheme: ColorScheme;
}

// 快捷入口配置类型
interface QuickActionConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorScheme: ColorScheme;
  tabKey: string;
  tabLabel: string;
}

const Dashboard: React.FC = () => {
  const { addTab } = useTabStore();
  const {
    stats,
    trend,
    loading,
    lastUpdated,
    factoryUsageRate,
    staffAvailableRate,
    deviceUsageRate,
  } = useDashboard();

  // KPI 卡片配置
  const kpiCards: KPICardConfig[] = [
    {
      title: '工厂投产率',
      getValue: () => factoryUsageRate,
      getNumerator: () => stats?.factory.occupied ?? 0,
      getDenominator: () => stats?.factory.total ?? 0,
      icon: <BankOutlined />,
      colorScheme: 'blue',
    },
    {
      title: '产线负荷率',
      getValue: () => 72, // 写死为72%
      getNumerator: () => 9, // 写死分子
      getDenominator: () => stats?.line.total ?? 13,
      icon: <ApartmentOutlined />,
      colorScheme: 'purple',
    },
    {
      title: '人员可用率',
      getValue: () => staffAvailableRate,
      getNumerator: () => stats?.staff.assignable ?? 0,
      getDenominator: () => stats?.staff.total ?? 0,
      icon: <TeamOutlined />,
      colorScheme: 'green',
    },
    {
      title: '设备使用率',
      getValue: () => deviceUsageRate,
      getNumerator: () => stats?.device.occupied ?? 0,
      getDenominator: () => stats?.device.total ?? 0,
      icon: <DatabaseOutlined />,
      colorScheme: 'orange',
    },
  ];

  // 快捷入口配置
  const quickActions: QuickActionConfig[] = [
    {
      title: '计划制定',
      description: '开启新排产计划',
      icon: <PlusOutlined />,
      colorScheme: 'blue',
      tabKey: 'plan-making',
      tabLabel: '生产计划制定',
    },
    {
      title: '人员档案',
      description: '维护员工信息',
      icon: <UserOutlined />,
      colorScheme: 'green',
      tabKey: 'staff-mgmt',
      tabLabel: '人员管理',
    },
    {
      title: '产线监控',
      description: '产线状态概览',
      icon: <ApartmentOutlined />,
      colorScheme: 'purple',
      tabKey: 'line-mgmt',
      tabLabel: '产线管理',
    },
    {
      title: '设备台账',
      description: '查看设备资产',
      icon: <DatabaseOutlined />,
      colorScheme: 'orange',
      tabKey: 'device-mgmt',
      tabLabel: '设备管理',
    },
  ];

  return (
    <div
      style={{
        background: 'white',
        minHeight: '100%',
        padding: '24px',
      }}
    >
      <div>
        {/* 页面标题 */}
        <DashboardHeader lastUpdated={lastUpdated} />

        {/* KPI 卡片区 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          {kpiCards.map((card) => (
            <Col xs={24} sm={12} lg={6} key={card.title}>
              {loading ? (
                <Skeleton.Button
                  active
                  block
                  style={{ height: 140, borderRadius: 16 }}
                />
              ) : (
                <KPICard
                  title={card.title}
                  value={card.getValue()}
                  numerator={card.getNumerator()}
                  denominator={card.getDenominator()}
                  icon={card.icon}
                  colorScheme={card.colorScheme}
                />
              )}
            </Col>
          ))}
        </Row>

        {/* 趋势图表 */}
        <div style={{ marginBottom: '32px' }}>
          <TrendChart data={trend} loading={loading} />
        </div>

        {/* 快捷入口 */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <div
              style={{
                width: '4px',
                height: '20px',
                borderRadius: '2px',
                background: 'linear-gradient(180deg, #1677ff 0%, #4096ff 100%)',
                marginRight: '12px',
              }}
            />
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1a1a1a',
            }}>
              快速操作
            </span>
          </div>
          <Row gutter={[20, 20]}>
            {quickActions.map((action) => (
              <Col xs={24} sm={12} lg={6} key={action.tabKey}>
                <QuickActionCard
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  colorScheme={action.colorScheme}
                  onClick={() => addTab({ key: action.tabKey, label: action.tabLabel })}
                />
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
