import React, { useState, useEffect } from 'react'
import { RocketOutlined, UserOutlined, BellOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Avatar, Badge, Tooltip, Popover, List, Typography, Empty, Space, Tag } from 'antd'
import { getSystemNotifications, NotificationItem } from '../../api/notificationApi'

const { Text } = Typography;

const TopBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  // 使用 Ref 存储最后查看的 ID，避免轮询中的闭包陷阱
  const lastViewedIdRef = React.useRef<number>(0);

  // 轮询检查新通知 (短轮询：每1秒检查一次，确保实时性)
  useEffect(() => {
    const checkNew = async () => {
      try {
        const list = await getSystemNotifications();
        if (list.length > 0) {
          setNotifications(list);
          // 实时对比 Ref 中的最新 ID
          if (list[0].id > lastViewedIdRef.current) {
            setHasNew(true);
          }
        }
      } catch (err) {
        console.error('Polling notifications error:', err);
      }
    };

    checkNew();
    const timer = setInterval(checkNew, 1000); // 1秒轮询一次
    return () => clearInterval(timer);
  }, []); // 仅挂载时执行

  // 处理通知面板打开
  const handleOpenChange = async (open: boolean) => {
    if (open) {
      setLoading(true);
      try {
        const list = await getSystemNotifications();
        setNotifications(list);
        setHasNew(false);
        if (list.length > 0) {
          // 同步更新 Ref
          lastViewedIdRef.current = list[0].id;
        }
      } catch (err) {
        console.error('Fetch notifications error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 通知列表内容
  const notificationContent = (
    <div className="w-64">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <span className="font-bold text-gray-700 flex items-center gap-2">
          <HistoryOutlined className="text-blue-500" />
          变更告知
        </span>
      </div>
      <List
        loading={loading}
        size="small"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item className="px-0 py-3 border-b border-gray-50 last:border-none">
            <div className="flex flex-col w-full gap-1.5">
              <div className="flex items-center justify-between">
                <Space size={4}>
                  <ClockCircleOutlined className="text-gray-400 text-[10px]" />
                  <Text className="text-[11px] text-gray-400 font-mono">{item.time}</Text>
                </Space>
                <Tag color="blue" className="m-0 border-none bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0 leading-normal">
                  {item.action}
                </Tag>
              </div>
              <div className="text-[13px] text-gray-600 flex items-center gap-1">
                <Text type="secondary" className="text-[12px] opacity-70">[{item.model}]</Text>
                <Text className="truncate flex-1 font-medium" title={item.details}>{item.details}</Text>
              </div>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无变更记录" />
        }}
        style={{ maxHeight: '400px', overflowY: 'auto' }}
      />
    </div>
  );

  return (
    <div 
      className="h-[80px] flex items-center justify-between px-6 relative overflow-hidden select-none"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        background: '#000' // 底色兜底
      }}
    >
      {/* 动态流体星空背景 */}
      <div 
        className="absolute inset-[-10%] z-0"
        style={{
          backgroundImage: 'url("/images/topbanner.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'starFloating 60s ease-in-out infinite',
          filter: 'brightness(0.8)' // 稍微调暗，增强科幻感
        }}
      />

      {/* 渐变遮罩层 */}
      <div 
        className="absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      
      {/* 内容区域：提升 z-index 确保在背景之上 */}
      <div className="flex items-center gap-3 z-10">
        <div className="logo-container w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer">
          <span className="rocket-wrapper">
            <RocketOutlined className="logo-rocket text-2xl" />
          </span>
        </div>
        <span 
          className="text-white text-xl tracking-wide font-semibold"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            lineHeight: 1
          }}
        >
          任务筹划系统
        </span>
      </div>

      <div className="flex items-center gap-6 z-10">
        {/* 通知铃铛 */}
        <Popover
          content={notificationContent}
          trigger="click"
          placement="bottomRight"
          onOpenChange={handleOpenChange}
          overlayClassName="notification-popover"
        >
          <div className="relative cursor-pointer hover:scale-110 transition-transform duration-200 group">
            <Badge dot={hasNew} offset={[-2, 4]} color="#ff4d4f">
              <BellOutlined className="text-white text-xl opacity-80 group-hover:opacity-100" />
            </Badge>
          </div>
        </Popover>

        {/* 用户信息 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 transition-all">
          <Avatar 
            src="/images/touxiang.png" 
            size={42} 
            className="border-2 border-white/50 shadow-sm"
            icon={<UserOutlined />}
          />
          <span className="text-white text-sm font-medium ml-1">管理员</span>
        </div>
      </div>

      <style>{`
        @keyframes starFloating {
          0% { transform: scale(1) translate(0, 0) rotate(0deg); }
          25% { transform: scale(1.05) translate(-1%, -2%) rotate(0.5deg); }
          50% { transform: scale(1.1) translate(-2%, 1%) rotate(-0.5deg); }
          75% { transform: scale(1.05) translate(1%, 2%) rotate(0.2deg); }
          100% { transform: scale(1) translate(0, 0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default TopBanner

