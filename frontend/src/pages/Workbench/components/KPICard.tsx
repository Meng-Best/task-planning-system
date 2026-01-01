import React, { useState } from 'react';
import { Card, Progress } from 'antd';

export type ColorScheme = 'blue' | 'purple' | 'green' | 'orange';

export interface KPICardProps {
  title: string;
  value: number;
  numerator: number;
  denominator: number;
  icon: React.ReactNode;
  colorScheme: ColorScheme;
}

// 配色方案映射
const colorSchemes: Record<ColorScheme, {
  gradient: string;
  iconBg: string;
  stroke: string;
  trailColor: string;
}> = {
  blue: {
    gradient: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
    iconBg: '#e6f4ff',
    stroke: '#1677ff',
    trailColor: '#e6f4ff',
  },
  purple: {
    gradient: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
    iconBg: '#f9f0ff',
    stroke: '#722ed1',
    trailColor: '#f9f0ff',
  },
  green: {
    gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
    iconBg: '#f6ffed',
    stroke: '#52c41a',
    trailColor: '#f6ffed',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
    iconBg: '#fffbe6',
    stroke: '#faad14',
    trailColor: '#fffbe6',
  },
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  numerator,
  denominator,
  icon,
  colorScheme,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = colorSchemes[colorScheme];

  return (
    <Card
      bordered={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: '16px',
        border: isHovered ? '1px solid transparent' : '1px solid #f0f0f0',
        boxShadow: isHovered
          ? '0 12px 24px -8px rgba(0, 0, 0, 0.12), 0 4px 8px -4px rgba(0, 0, 0, 0.06)'
          : '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        background: isHovered ? '#fafbfc' : '#ffffff',
        transform: isHovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
      }}
      styles={{
        body: { padding: '24px' }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* 左侧：数据展示 */}
        <div style={{ flex: 1 }}>
          {/* 标题 */}
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#6b7280',
            marginBottom: '12px',
          }}>
            {title}
          </div>

          {/* 主数值 */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: '8px',
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#1a1a1a',
              lineHeight: 1,
            }}>
              {value}
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#9ca3af',
              marginLeft: '2px',
            }}>
              %
            </span>
          </div>

          {/* 辅助数据 */}
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
          }}>
            {numerator} / {denominator}
          </div>
        </div>

        {/* 右侧：环形进度条 + 图标 */}
        <div style={{ position: 'relative' }}>
          <Progress
            type="circle"
            percent={value}
            size={72}
            strokeWidth={8}
            strokeColor={colors.gradient}
            trailColor={colors.trailColor}
            format={() => null}
          />
          {/* 中心图标 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.stroke,
              fontSize: '20px',
            }}
          >
            {icon}
          </div>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: colors.gradient,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </Card>
  );
};

export default KPICard;
