import React, { useState, useEffect } from 'react'
import { RocketOutlined, UserOutlined, BellOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Avatar, Badge, Popover, List, Typography, Empty, Space, Tag } from 'antd'
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
      className="h-[100px] flex items-center justify-between px-8 relative overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* 粒子背景 - 使用 CSS 实现星点效果 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* 静态星点层 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.3), transparent),
              radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.3), transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1.5px 1.5px at 160px 120px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.3), transparent),
              radial-gradient(1px 1px at 250px 90px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 300px 60px, rgba(255,255,255,0.3), transparent),
              radial-gradient(1.5px 1.5px at 350px 30px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 400px 80px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1px 1px at 450px 45px, rgba(255,255,255,0.3), transparent),
              radial-gradient(1px 1px at 500px 100px, rgba(255,255,255,0.4), transparent),
              radial-gradient(1.5px 1.5px at 550px 70px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 600px 40px, rgba(255,255,255,0.3), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '650px 180px'
          }}
        />
        {/* 漂浮粒子动画层 */}
        <div className="particles-container">
          <div className="particle particle-1" />
          <div className="particle particle-2" />
          <div className="particle particle-3" />
          <div className="particle particle-4" />
          <div className="particle particle-5" />
          <div className="particle particle-6" />
          <div className="particle particle-7" />
          <div className="particle particle-8" />
          <div className="particle particle-9" />
          <div className="particle particle-10" />
          <div className="particle particle-11" />
          <div className="particle particle-12" />
        </div>
      </div>

      {/* 流光渐变层 - 带缓动 */}
      <div className="absolute inset-0 z-[1] glow-drift">
        <div
          className="absolute inset-0 glow-left"
          style={{
            background: 'radial-gradient(ellipse 50% 80% at 0% 50%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)'
          }}
        />
        <div
          className="absolute inset-0 glow-right"
          style={{
            background: 'radial-gradient(ellipse 50% 80% at 100% 50%, rgba(139, 92, 246, 0.12) 0%, transparent 50%)'
          }}
        />
      </div>

      {/* 光线扫过效果 */}
      <div
        className="absolute top-0 bottom-0 w-[300px] z-[2] pointer-events-none shimmer-light"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 45%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 55%, transparent 100%)'
        }}
      />

      {/* 底部渐变分隔线 - 呼吸效果 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-[3] bottom-line-breath"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(100, 150, 255, 0.5) 20%, rgba(139, 92, 246, 0.8) 50%, rgba(100, 150, 255, 0.5) 80%, transparent 100%)',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
        }}
      />

      {/* 左侧内容区域 */}
      <div className="flex items-center gap-4 z-10">
        {/* 保留原有 Logo 动画 */}
        <div className="logo-container w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer">
          <span className="rocket-wrapper">
            <RocketOutlined className="logo-rocket text-3xl" />
          </span>
        </div>

        {/* 系统名称 */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[22px] tracking-wide font-semibold"
            style={{
              color: '#fff',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.08em'
            }}
          >
            任务筹划系统
          </span>
          <span
            className="text-[11px] tracking-[0.2em] font-light"
            style={{
              color: 'rgba(255, 255, 255, 0.5)'
            }}
          >
            MISSION PLANNING SYSTEM
          </span>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex items-center gap-5 z-10">
        {/* 通知铃铛 */}
        <Popover
          content={notificationContent}
          trigger="click"
          placement="bottomRight"
          onOpenChange={handleOpenChange}
          overlayClassName="notification-popover"
        >
          <div className="relative cursor-pointer hover:scale-110 transition-transform duration-200 group">
            <Badge dot={hasNew} offset={[-2, 4]} color="#f43f5e">
              <BellOutlined
                className="text-xl text-white/70 group-hover:text-white transition-colors"
              />
            </Badge>
          </div>
        </Popover>

        {/* 分隔线 */}
        <div className="h-8 w-[1px] bg-white/10" />

        {/* 用户信息 */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
          <div className="relative">
            <Avatar
              src="/images/touxiang.png"
              size={40}
              style={{
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}
              icon={<UserOutlined />}
            />
            {/* 在线状态指示器 */}
            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
              <span className="absolute w-3.5 h-3.5 bg-emerald-400/30 rounded-full animate-ping" />
              <span className="relative w-2.5 h-2.5 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-full border border-emerald-200/50" />
            </span>
          </div>
          <span className="text-white text-sm font-medium pr-1">管理员</span>
        </div>
      </div>

      <style>{`
        /* 漂浮粒子基础样式 */
        .particles-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: floatUp 15s infinite;
          opacity: 0;
        }

        /* 不同大小和亮度的粒子 */
        .particle-1 { left: 5%; animation-delay: 0s; animation-duration: 12s; width: 2px; height: 2px; }
        .particle-2 { left: 15%; animation-delay: 2s; animation-duration: 14s; width: 3px; height: 3px; background: rgba(255,255,255,0.7); }
        .particle-3 { left: 25%; animation-delay: 4s; animation-duration: 13s; }
        .particle-4 { left: 35%; animation-delay: 1s; animation-duration: 15s; width: 2.5px; height: 2.5px; }
        .particle-5 { left: 45%; animation-delay: 3s; animation-duration: 11s; width: 3px; height: 3px; background: rgba(255,255,255,0.6); }
        .particle-6 { left: 55%; animation-delay: 5s; animation-duration: 14s; }
        .particle-7 { left: 65%; animation-delay: 0.5s; animation-duration: 13s; width: 2.5px; height: 2.5px; }
        .particle-8 { left: 75%; animation-delay: 2.5s; animation-duration: 12s; width: 3px; height: 3px; background: rgba(255,255,255,0.7); }
        .particle-9 { left: 85%; animation-delay: 4.5s; animation-duration: 15s; }
        .particle-10 { left: 95%; animation-delay: 1.5s; animation-duration: 11s; width: 2px; height: 2px; }
        .particle-11 { left: 20%; animation-delay: 6s; animation-duration: 14s; width: 2.5px; height: 2.5px; }
        .particle-12 { left: 70%; animation-delay: 7s; animation-duration: 12s; width: 3px; height: 3px; }

        /* 部分粒子闪烁效果 */
        .particle-2, .particle-5, .particle-8, .particle-11 {
          animation: floatUp 15s infinite, twinkle 2s ease-in-out infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(100px) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-20px) scale(1);
            opacity: 0;
          }
        }

        /* 光线扫过动画 */
        .shimmer-light {
          animation: shimmer 8s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            left: -300px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: calc(100% + 300px);
            opacity: 0;
          }
        }

        /* 背景光晕缓动 */
        .glow-left {
          animation: glowDriftLeft 6s ease-in-out infinite;
        }
        .glow-right {
          animation: glowDriftRight 6s ease-in-out infinite;
        }

        @keyframes glowDriftLeft {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(30px); opacity: 0.7; }
        }

        @keyframes glowDriftRight {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(-30px); opacity: 0.7; }
        }

        /* 底部线条呼吸 */
        .bottom-line-breath {
          animation: lineBreath 3s ease-in-out infinite;
        }

        @keyframes lineBreath {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TopBanner

