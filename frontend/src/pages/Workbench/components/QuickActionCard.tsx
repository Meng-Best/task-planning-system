import React, { useState } from 'react';
import { Card } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { ColorScheme } from './KPICard';

export interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorScheme: ColorScheme;
  onClick: () => void;
}

// 配色方案映射
const colorSchemes: Record<ColorScheme, {
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
}> = {
  blue: {
    iconBg: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
    iconColor: '#1677ff',
    hoverBorder: '#1677ff',
  },
  green: {
    iconBg: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
    iconColor: '#52c41a',
    hoverBorder: '#52c41a',
  },
  purple: {
    iconBg: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
    iconColor: '#722ed1',
    hoverBorder: '#722ed1',
  },
  orange: {
    iconBg: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
    iconColor: '#faad14',
    hoverBorder: '#faad14',
  },
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  colorScheme,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = colorSchemes[colorScheme];

  return (
    <Card
      bordered={false}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: '16px',
        border: '1px solid #f0f0f0',
        boxShadow: isHovered
          ? '0 12px 24px -8px rgba(0, 0, 0, 0.12)'
          : '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        background: isHovered ? '#fafbfc' : '#ffffff',
        transform: isHovered ? 'translateY(-4px)' : 'none',
        borderLeft: isHovered ? `3px solid ${colors.hoverBorder}` : '3px solid #f0f0f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        height: '100%',
      }}
      styles={{
        body: { padding: '20px' }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* 图标容器 */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: colors.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px',
            transition: 'transform 0.3s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            flexShrink: 0,
            fontSize: '22px',
            color: colors.iconColor,
          }}
        >
          {icon}
        </div>

        {/* 文本区域 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#1a1a1a',
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            {description}
          </div>
        </div>

        {/* 悬停时显示的箭头 */}
        <div
          style={{
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
            transition: 'all 0.3s ease',
            color: colors.iconColor,
            fontSize: '14px',
            marginLeft: '8px',
          }}
        >
          <RightOutlined />
        </div>
      </div>
    </Card>
  );
};

export default QuickActionCard;
