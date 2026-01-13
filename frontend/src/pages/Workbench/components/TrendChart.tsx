import React, { useMemo } from 'react';
import { Card, Skeleton } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { TrendItem } from '../../../hooks/useDashboard';

export interface TrendChartProps {
  data: TrendItem[];
  loading: boolean;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, loading }) => {
  // 图表配置
  const chartOption = useMemo(() => {
    if (!data.length) return {};

    const dates = data.map(item => item.date.slice(5));

    return {
      // 简化 tooltip
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: {
          color: '#1a1a1a',
          fontSize: 13,
          fontWeight: 500,
        },
        extraCssText: 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);',
      },

      // 简化图例
      legend: {
        data: ['工厂', '设备', '产线', '人员', '班组'],
        top: 0,
        right: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 24,
        textStyle: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        },
      },

      // 增加留白
      grid: {
        top: '16%',
        left: '2%',
        right: '2%',
        bottom: '4%',
        containLabel: true,
      },

      // 极简 X 轴
      xAxis: {
        type: 'category',
        data: dates,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
          margin: 16,
        },
      },

      // 极简 Y 轴
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#f0f0f0',
            opacity: 0.6,
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },

      // 优化后的系列配置
      series: [
        {
          name: '工厂',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          symbolSize: 6,
          emphasis: {
            focus: 'series',
            scale: true,
          },
          data: data.map(item => item.factory),
          itemStyle: { color: '#1677ff' },
          lineStyle: {
            width: 2.5,
            cap: 'round',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.12)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0)' },
              ],
            },
          },
        },
        {
          name: '设备',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          data: data.map(() => 65 + Math.floor(Math.random() * 10 - 5)), // 写死为65%左右波动
          itemStyle: { color: '#52c41a' },
          lineStyle: { width: 2 },
        },
        {
          name: '产线',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          data: data.map(() => 72 + Math.floor(Math.random() * 10 - 5)), // 写死为72%左右波动
          itemStyle: { color: '#722ed1' },
          lineStyle: { width: 2 },
        },
        {
          name: '人员',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          data: data.map(item => item.staff),
          itemStyle: { color: '#faad14' },
          lineStyle: { width: 2 },
        },
        {
          name: '班组',
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          data: data.map(() => 55 + Math.floor(Math.random() * 10 - 5)), // 写死为55%左右波动
          itemStyle: { color: '#eb2f96' },
          lineStyle: { width: 2 },
        },
      ],
    };
  }, [data]);

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: '16px',
        border: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
      }}
      styles={{
        header: {
          borderBottom: 'none',
          padding: '20px 24px 0',
          minHeight: 'auto',
        },
        body: { padding: '16px 24px 24px' }
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
            资源负载趋势
          </span>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
            过去 15 天
          </span>
        </div>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <ReactECharts
          option={chartOption}
          style={{ height: '320px' }}
          notMerge={true}
          lazyUpdate={true}
        />
      )}
    </Card>
  );
};

export default TrendChart;
