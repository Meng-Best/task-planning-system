import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = 'http://localhost:3001';

// 资源统计数据类型
export interface ResourceStats {
  total: number;
  assignable: number;
  occupied: number;
  unavailable: number;
}

// Dashboard 统计数据类型
export interface DashboardStats {
  device: ResourceStats;
  line: ResourceStats;
  staff: ResourceStats;
  team: { total: number };
  factory: ResourceStats;
}

// 趋势数据项类型
export interface TrendItem {
  date: string;
  factory: number;
  device: number;
  line: number;
  staff: number;
  team: number;
}

// Hook 返回类型
export interface UseDashboardReturn {
  stats: DashboardStats | null;
  trend: TrendItem[];
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  // 计算属性
  factoryUsageRate: number;
  lineLoadRate: number;
  staffAvailableRate: number;
  deviceUsageRate: number;
}

// 计算百分比的工具函数
const calculateRate = (numerator: number, denominator: number): number => {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
};

export const useDashboard = (): UseDashboardReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dashboard/stats`),
        axios.get(`${API_BASE_URL}/api/dashboard/trend`),
      ]);

      if (statsRes.data.status === 'ok') {
        setStats(statsRes.data.data);
      }
      if (trendRes.data.status === 'ok') {
        setTrend(trendRes.data.data);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Fetch Dashboard Data Error:', error);
      message.error('获取系统概览数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 使用 useMemo 缓存计算结果
  const rates = useMemo(() => ({
    factoryUsageRate: stats ? calculateRate(stats.factory.occupied, stats.factory.total) : 0,
    lineLoadRate: stats ? calculateRate(stats.line.occupied, stats.line.total) : 0,
    staffAvailableRate: stats ? calculateRate(stats.staff.assignable, stats.staff.total) : 0,
    deviceUsageRate: stats ? calculateRate(stats.device.occupied, stats.device.total) : 0,
  }), [stats]);

  return {
    stats,
    trend,
    loading,
    lastUpdated,
    refresh: fetchData,
    ...rates,
  };
};

export default useDashboard;
