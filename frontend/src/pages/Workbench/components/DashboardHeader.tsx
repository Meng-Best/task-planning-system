import React from 'react';

export interface DashboardHeaderProps {
  lastUpdated: Date | null;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ lastUpdated }) => {
  const formatTime = (date: Date | null): string => {
    if (!date) return '--';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      marginBottom: '32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#1a1a1a',
          marginBottom: '6px',
        }}>
          系统概览
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: 1.6,
        }}>
          实时监控生产资源使用率与系统运行状态
        </p>
      </div>
      <div style={{
        fontSize: '12px',
        color: '#9ca3af',
      }}>
        最后更新: {formatTime(lastUpdated)}
      </div>
    </div>
  );
};

export default DashboardHeader;
