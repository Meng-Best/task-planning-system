import { RocketOutlined } from '@ant-design/icons'

const TopBanner: React.FC = () => {
  return (
    <div 
      className="h-[80px] flex items-center px-6 relative overflow-hidden"
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
      
      {/* Logo 区域 */}
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
    </div>
  )
}

export default TopBanner

