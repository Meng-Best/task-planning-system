import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Progress, Typography, Skeleton, message } from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  RocketOutlined,
  PlusOutlined,
  UserOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  BankOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { useTabStore } from '../../store/useTabStore';

const { Title, Text } = Typography;

const API_BASE_URL = 'http://localhost:3001';

interface DashboardStats {
  device: { total: number; assignable: number; occupied: number; unavailable: number };
  line: { total: number; assignable: number; occupied: number; unavailable: number };
  staff: { total: number; assignable: number; occupied: number; unavailable: number };
  team: { total: number };
  factory: { total: number; assignable: number; occupied: number; unavailable: number };
}

interface TrendItem {
  date: string;
  factory: number;
  device: number;
  line: number;
  staff: number;
  team: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addTab } = useTabStore();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dashboard/stats`),
        axios.get(`${API_BASE_URL}/api/dashboard/trend`)
      ]);
      
      if (statsRes.data.status === 'ok') {
        setStats(statsRes.data.data);
      }
      if (trendRes.data.status === 'ok') {
        setTrend(trendRes.data.data);
      }
    } catch (error) {
      console.error('Fetch Dashboard Data Error:', error);
      message.error('获取系统概览数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const factoryUsageRate = stats && stats.factory.total > 0
    ? Math.round((stats.factory.occupied / stats.factory.total) * 100) 
    : 0;

  const lineLoadRate = stats && stats.line.total > 0
    ? Math.round((stats.line.occupied / stats.line.total) * 100)
    : 0;

  const staffAvailableRate = stats && stats.staff.total > 0
    ? Math.round((stats.staff.assignable / stats.staff.total) * 100)
    : 0;

  // 折线图配置
  const getTrendOption = () => {
    if (!trend.length) return {};
    
    const dates = trend.map(item => item.date.slice(5)); // 只显示 MM-DD
    
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let res = `<div style="font-weight: bold; margin-bottom: 4px;">${params[0].name} 负载率</div>`;
          params.forEach((item: any) => {
            res += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
              <span>${item.marker} ${item.seriesName}</span>
              <span style="font-weight: bold;">${item.value}%</span>
            </div>`;
          });
          return res;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 8,
        padding: [10, 14],
        textStyle: { color: '#333', fontSize: 13 },
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.1)',
        confine: true
      },
      legend: {
        data: ['工厂', '设备', '产线', '人员', '班组'],
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#64748b' }
      },
      grid: {
        top: '12%',
        left: '3%',
        right: '4%',
        bottom: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#8c8c8c', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: { 
          color: '#8c8c8c', 
          fontSize: 12,
          formatter: '{value}%' 
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#f5f5f5' } },
        axisLine: { show: false }
      },
      series: [
        {
          name: '工厂',
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: trend.map(item => item.factory),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.1)' }, { offset: 1, color: 'rgba(59, 130, 246, 0)' }]
            }
          }
        },
        {
          name: '设备',
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: trend.map(item => item.device),
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        },
        {
          name: '产线',
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: trend.map(item => item.line),
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { width: 3 }
        },
        {
          name: '人员',
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: trend.map(item => item.staff),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 }
        },
        {
          name: '班组',
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: trend.map(item => item.team),
          itemStyle: { color: '#f43f5e' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  // 3. 热力图配置 (瓶颈识别 - 全息水晶风格)
  const getHeatmapOption = () => {
    if (!trend.length) return {};

    const dates = trend.map(item => item.date.slice(5)); // MM-DD
    const categories = ['班组', '人员', '产线', '设备', '工厂'];
    
    const data: [number, number, number][] = [];
    trend.forEach((day, xIdx) => {
      data.push([xIdx, 0, day.team]);
      data.push([xIdx, 1, day.staff]);
      data.push([xIdx, 2, day.line]);
      data.push([xIdx, 3, day.device]);
      data.push([xIdx, 4, day.factory]);
    });

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const val = params.value[2];
          return `<div style="padding: 10px 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); box-shadow: 0 8px 32px rgba(100, 100, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.5);">
            <div style="color: #64748b; font-size: 12px; margin-bottom: 6px; font-weight: 600;">${params.name} 能量维度</div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
              <span style="font-weight: 700; color: #1e293b; font-size: 14px;">${categories[params.value[1]]}</span>
              <span style="font-weight: 800; color: ${val > 80 ? '#f43f5e' : '#22d3ee'}; font-size: 18px;">${val}%</span>
            </div>
          </div>`;
        },
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        confine: true
      },
      grid: {
        top: '12%',
        bottom: '22%',
        left: '15%',
        right: '5%',
      },
      xAxis: {
        type: 'category',
        data: dates,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#475569', 
          fontSize: 12, 
          margin: 12, 
          fontWeight: 'bold' 
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#475569', 
          fontWeight: 'bold', 
          fontSize: 13, 
          margin: 12
        }
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '2%',
        itemWidth: 15,
        itemHeight: 200,
        text: ['爆发', '静默'],
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
        inRange: {
          color: ['#f0f2f5', '#22d3ee', '#8b5cf6', '#f43f5e']
        }
      },
      series: [{
        name: '全息能量矩阵',
        type: 'heatmap',
        data: data,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#ffffff',
          borderWidth: 2,
          opacity: 0.85,
          shadowBlur: 12,
          shadowColor: 'rgba(100, 100, 255, 0.3)'
        },
        label: {
          show: false
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            shadowBlur: 20,
            shadowColor: 'rgba(139, 92, 246, 0.6)',
            borderColor: '#ffffff',
            borderWidth: 2
          }
        }
      }]
    };
  };

  return (
    <div className="dashboard-container pl-4 pr-4 space-y-6" style={{ background: '#f8fafc', minHeight: '100%' }}>
      {/* 头部欢迎语 */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <Title level={1} style={{ marginBottom: 4, fontWeight: 600 }}>数字生产指挥中心</Title>
          <Text type="secondary">实时数据驱动，确保每一秒生产价值最大化</Text>
        </div>
        {/* <div className="flex gap-2">
          <Tag color="blue" className="rounded-full px-3">实时同步中</Tag>
          <Text type="secondary" className="text-xs">最后更新: 刚刚</Text>
        </div> */}
      </div>

      {/* 第一行：KPI 卡片 */}
      <Row gutter={[20, 20]}>
        <Col span={6}>
          <div className="kpi-card kpi-blue">
            <div className="kpi-icon"><BankOutlined /></div>
            <div className="kpi-content">
              <div className="kpi-title">工厂投产情况</div>
              <div className="kpi-value-row">
                <span className="kpi-value">{factoryUsageRate}</span>
                <span className="kpi-unit">%</span>
              </div>
              <Progress percent={factoryUsageRate} size="small" showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" className="mb-1" />
              <div className="text-white/70 text-xs mt-1">已投产：{stats?.factory.occupied || 0} / 共：{stats?.factory.total || 0} 座</div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="kpi-card kpi-purple">
            <div className="kpi-icon"><ApartmentOutlined /></div>
            <div className="kpi-content">
              <div className="kpi-title">产线实时负荷</div>
              <div className="kpi-value-row">
                <span className="kpi-value">{lineLoadRate}</span>
                <span className="kpi-unit">%</span>
              </div>
              <Progress percent={lineLoadRate} size="small" showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" className="mb-1" />
              <div className="text-white/70 text-xs mt-1">已用：{stats?.line.occupied || 0} / 共：{stats?.line.total || 0} 条</div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="kpi-card kpi-emerald">
            <div className="kpi-icon"><TeamOutlined /></div>
            <div className="kpi-content">
              <div className="kpi-title">可用人力资源</div>
              <div className="kpi-value-row">
                <span className="kpi-value">{staffAvailableRate}</span>
                <span className="kpi-unit">%</span>
              </div>
              <Progress percent={staffAvailableRate} size="small" showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" className="mb-1" />
              <div className="text-white/70 text-xs mt-1">空闲：{stats?.staff.assignable || 0} / 共：{stats?.staff.total || 0} 人</div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="kpi-card kpi-sunset">
            <div className="kpi-icon"><SafetyCertificateOutlined /></div>
            <div className="kpi-content">
              <div className="kpi-title">系统稳定指数</div>
              <div className="kpi-value-row">
                <span className="kpi-value">99.8</span>
                <span className="kpi-unit">%</span>
              </div>
              <Progress percent={99.8} size="small" showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" className="mb-1" />
              <div className="text-white/70 text-xs mt-1">运行状态：极佳</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 第二行：图表区 */}
      <Row gutter={[20, 20]}>
        <Col span={16}>
          <Card 
            title={<div className="flex items-center gap-2"><DatabaseOutlined className="text-blue-500" /> 资源负载率趋势 (过去10天)</div>} 
            className="modern-card"
            variant="borderless"
          >
            {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
              <ReactECharts 
                option={getTrendOption()} 
                style={{ height: '380px' }} 
                notMerge={true}
                lazyUpdate={true}
              />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            title={<div className="flex items-center gap-2"><ThunderboltOutlined className="text-amber-500" /> 生产瓶颈识别热力图</div>} 
            className="modern-card"
            variant="borderless"
          >
            {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
              <ReactECharts 
                option={getHeatmapOption()} 
                style={{ height: '380px' }} 
                notMerge={true}
                lazyUpdate={true}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 第三行：磁贴式入口 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="action-tile group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all cursor-pointer" onClick={() => addTab({ key: 'plan-making', label: '生产计划制定' })}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <PlusOutlined />
            </div>
            <ArrowRightOutlined className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="font-bold text-slate-700 text-lg">下达排产任务</div>
          <div className="text-slate-400 text-sm mt-1">快速启动新的生产计划与工单分配</div>
        </div>

        <div className="action-tile group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer" onClick={() => addTab({ key: 'staff-mgmt', label: '人员管理' })}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserOutlined />
            </div>
            <ArrowRightOutlined className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="font-bold text-slate-700 text-lg">人事档案管理</div>
          <div className="text-slate-400 text-sm mt-1">维护人员专业对口与技术等级认证</div>
        </div>

        <div className="action-tile group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer" onClick={() => addTab({ key: 'line-mgmt', label: '产线管理' })}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ApartmentOutlined />
            </div>
            <ArrowRightOutlined className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="font-bold text-slate-700 text-lg">生产线全景视图</div>
          <div className="text-slate-400 text-sm mt-1">可视化产线拓扑结构与实时运行状态</div>
        </div>
      </div>

      {/* 页脚 */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="h-[1px] w-12 bg-slate-200" />
        <RocketOutlined className="text-slate-300" />
        <span className="text-[10px] text-slate-400 tracking-[0.2em] font-bold uppercase">Expace 任务筹划系统 v1.5</span>
        <div className="h-[1px] w-12 bg-slate-200" />
      </div>

      <style>{`
        .kpi-card {
          padding: 24px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          transition: transform 0.3s;
          height: 150px;
        }
        .kpi-card:hover { transform: translateY(-5px); }
        .kpi-icon {
          font-size: 32px;
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          backdrop-filter: blur(4px);
          flex-shrink: 0;
        }
        .kpi-content { flex: 1; min-width: 0; }
        .kpi-title { font-size: 14px; font-weight: 600; opacity: 0.9; margin-bottom: 6px; white-space: nowrap; }
        .kpi-value-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
        .kpi-value { font-size: 32px; font-weight: 900; line-height: 1; }
        .kpi-unit { font-size: 14px; font-weight: 600; opacity: 0.8; white-space: nowrap; }
        
        .kpi-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .kpi-purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .kpi-emerald { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .kpi-sunset { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

        .modern-card { border-radius: 24px !important; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05) !important; }
        .modern-card .ant-card-head { border-bottom: none !important; padding: 24px 24px 0 !important; }
        .modern-card .ant-card-head-title { font-size: 18px !important; font-weight: 800 !important; color: #1e293b !important; }
        .modern-card .ant-card-body { padding: 24px !important; }

        .action-tile:hover {
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02) !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
