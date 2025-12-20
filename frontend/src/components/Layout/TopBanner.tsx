import React, { useState, useEffect } from 'react'
import { RocketOutlined, UserOutlined, BellOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Avatar, Badge, Tooltip, Popover, List, Typography, Empty, Space, Tag } from 'antd'
import { getSystemNotifications, NotificationItem } from '../../api/notificationApi'

const { Text } = Typography;

const TopBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [lastViewedId, setLastViewedId] = useState<number>(0);

  // 轮询检查新通知 (短轮询：每1秒检查一次，确保实时性)
  useEffect(() => {
    const checkNew = async () => {
      try {
        const list = await getSystemNotifications();
        if (list.length > 0) {
          setNotifications(list);
          // 如果列表中最新的 ID 大于最后一次查看的 ID，则显示红点
          if (list[0].id > lastViewedId) {
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
  }, [lastViewedId]);

  // 处理通知面板打开
  const handleOpenChange = async (open: boolean) => {
    if (open) {
      setHasNew(false);
      if (notifications.length > 0) {
        setLastViewedId(notifications[0].id);
      }
      setLoading(true);
      const list = await getSystemNotifications();
      setNotifications(list);
      setLoading(false);
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
      className="h-[80px] flex items-center justify-between px-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* 背景装饰图案 */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* 左侧：Logo 区域 */}
      <div className="flex items-center gap-3 z-10">
        <div className="logo-container w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer">
          <span className="rocket-wrapper">
            <RocketOutlined className="logo-rocket text-2xl" />
          </span>
        </div>
        <span 
          className="text-white text-xl tracking-wide font-semibold"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            lineHeight: 1
          }}
        >
          任务筹划系统
        </span>
      </div>

      {/* 右侧：用户区域 */}
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
    </div>
  );
};

export default TopBanner

