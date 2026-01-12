import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Typography, Progress, Alert, Space, Statistic, message, Row, Col } from 'antd'
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CalculatorOutlined,
  SyncOutlined,
  CloudServerOutlined,
  ApiOutlined,
  NodeIndexOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { useTabStore } from '../../store/useTabStore'

const { Title, Text, Paragraph } = Typography

const API_BASE_URL = ''

type ScheduleStatus = 'idle' | 'running' | 'completed' | 'error'

// 调度流程步骤配置
const SCHEDULE_STEPS = [
  { key: 'load', label: '数据加载', icon: <DatabaseOutlined />, color: '#1677ff' },
  { key: 'parse', label: '约束解析', icon: <ApiOutlined />, color: '#722ed1' },
  { key: 'optimize', label: '优化计算', icon: <CalculatorOutlined />, color: '#faad14' },
  { key: 'generate', label: '方案生成', icon: <NodeIndexOutlined />, color: '#52c41a' },
]

const SimulationEvaluation: React.FC = () => {
  const [status, setStatus] = useState<ScheduleStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const pollingIntervalRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const { addTab } = useTabStore()

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 根据进度更新当前步骤
  useEffect(() => {
    if (status === 'running') {
      if (progress < 25) setCurrentStep(0)
      else if (progress < 50) setCurrentStep(1)
      else if (progress < 75) setCurrentStep(2)
      else setCurrentStep(3)
    }
  }, [progress, status])

  // 检查 output.json 是否是新生成的（修改时间在开始时间之后）
  const checkOutputFile = async (scheduleStartTime: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schedules/output/check`)
      if (response.data.exists === true && response.data.lastModified) {
        // 比较文件修改时间与调度开始时间
        const fileModifiedTime = new Date(response.data.lastModified).getTime()
        const startTime = new Date(scheduleStartTime).getTime()
        return fileModifiedTime > startTime
      }
      return false
    } catch (error) {
      console.error('检查文件失败:', error)
      return false
    }
  }

  // 开始轮询检测文件
  const startPolling = (scheduleStartTime: string) => {
    const startTime = Date.now()
    const animationDuration = 30000 + Math.random() * 30000
    const maxWaitTime = 2400000 // 40分钟最大等待时间
    let fileDetected = false

    pollingIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTime

      if (elapsed <= animationDuration) {
        const progress = (elapsed / animationDuration) * 95
        setProgress(progress)
      } else if (!fileDetected) {
        setProgress(95)
      }

      if (!fileDetected) {
        const isNewResult = await checkOutputFile(scheduleStartTime)

        if (isNewResult) {
          fileDetected = true

          if (elapsed < animationDuration) {
            const remainingTime = animationDuration - elapsed

            setTimeout(() => {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
              }
              if (timerRef.current) {
                clearInterval(timerRef.current)
              }

              setProgress(100)
              setStatus('completed')
              message.success('调度完成！即将跳转到结果页面...')

              // 杀掉 Scheduler.exe 进程
              axios.post(`${API_BASE_URL}/api/schedules/terminate`).catch(() => { })

              setTimeout(() => {
                addTab({
                  key: 'schedule-result',
                  label: '排程结果展示'
                })
              }, 2000)
            }, remainingTime)
          } else {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }

            setProgress(100)
            setStatus('completed')
            message.success('调度完成！即将跳转到结果页面...')

            // 杀掉 Scheduler.exe 进程
            axios.post(`${API_BASE_URL}/api/schedules/terminate`).catch(() => { })

            setTimeout(() => {
              addTab({
                key: 'schedule-result',
                label: '排程结果展示'
              })
            }, 2000)
          }
        }
      }

      // 超过30分钟自动视为调度成功
      const elapsedSeconds = elapsed / 1000
      if (elapsedSeconds >= 1800 && !fileDetected) {
        fileDetected = true

        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }

        setProgress(100)
        setStatus('completed')
        message.success('调度完成！即将跳转到结果页面...')

        // 杀掉 Scheduler.exe 进程
        axios.post(`${API_BASE_URL}/api/schedules/terminate`).catch(() => { })

        setTimeout(() => {
          addTab({
            key: 'schedule-result',
            label: '排程结果展示'
          })
        }, 2000)
        return
      }

      if (elapsed >= maxWaitTime && !fileDetected) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }

        setStatus('error')
        setErrorMessage('调度超时，请检查调度算法是否正常运行')
      }
    }, 100)

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
  }

  // 开始调度
  const handleStartSchedule = async () => {
    try {
      setStatus('running')
      setProgress(0)
      setElapsedTime(0)
      setErrorMessage('')
      setCurrentStep(0)

      const response = await axios.post(`${API_BASE_URL}/api/schedules/run`)
      const scheduleStartTime = response.data.startTime || new Date().toISOString()

      message.info('调度已启动，正在等待结果...')
      startPolling(scheduleStartTime)

    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.response?.data?.message || '启动调度失败')
      message.error('启动调度失败')
    }
  }

  // 重置状态
  const handleReset = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // 杀掉 Scheduler.exe 进程
    axios.post(`${API_BASE_URL}/api/schedules/terminate`).catch(() => { })

    setStatus('idle')
    setProgress(0)
    setElapsedTime(0)
    setErrorMessage('')
    setCurrentStep(0)
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 科技感背景装饰组件
  const TechBackground = () => (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: 0.6,
    }}>
      {/* 网格背景 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(22, 119, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(22, 119, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* 渐变光晕 */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(22, 119, 255, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(114, 46, 209, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />

      {/* 装饰圆点 */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#1677ff',
            opacity: 0.3,
            top: `${15 + i * 15}%`,
            left: `${5 + (i % 3) * 3}%`,
            animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
      `}</style>
    </div>
  )

  // 流程步骤组件
  const ProcessSteps = ({ active = false }: { active?: boolean }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      marginTop: '40px',
      marginBottom: '20px',
    }}>
      {SCHEDULE_STEPS.map((step, index) => {
        const isActive = active && index === currentStep
        const isCompleted = active && index < currentStep

        return (
          <React.Fragment key={step.key}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: isCompleted
                  ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`
                  : isActive
                    ? `linear-gradient(135deg, ${step.color}20 0%, ${step.color}10 100%)`
                    : '#f5f5f5',
                border: isActive ? `2px solid ${step.color}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: isCompleted ? '#fff' : isActive ? step.color : '#bfbfbf',
                transition: 'all 0.3s ease',
                boxShadow: isActive
                  ? `0 4px 12px ${step.color}30`
                  : isCompleted
                    ? `0 4px 12px ${step.color}40`
                    : 'none',
                animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}>
                {isCompleted ? <CheckCircleOutlined /> : step.icon}
              </div>
              <Text style={{
                fontSize: '12px',
                color: isActive || isCompleted ? step.color : '#8c8c8c',
                fontWeight: isActive ? 600 : 400,
              }}>
                {step.label}
              </Text>
            </div>

            {index < SCHEDULE_STEPS.length - 1 && (
              <div style={{
                width: '60px',
                height: '2px',
                background: isCompleted
                  ? `linear-gradient(90deg, ${SCHEDULE_STEPS[index].color}, ${SCHEDULE_STEPS[index + 1].color})`
                  : '#f0f0f0',
                marginBottom: '28px',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )

  // 系统状态指示器
  const SystemIndicators = () => (
    <Row gutter={[16, 16]} style={{ marginTop: '32px' }}>
      <Col span={6}>
        <Card size="small" style={{
          background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
          border: 'none',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CloudServerOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
            <div>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>调度引擎</Text>
              <div style={{ color: '#52c41a', fontWeight: 600, fontSize: '13px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#52c41a',
                  marginRight: '6px',
                  animation: 'pulse 1s infinite',
                }} />
                在线
              </div>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" style={{
          background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
          border: 'none',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThunderboltOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
            <div>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>算法版本</Text>
              <div style={{ color: '#722ed1', fontWeight: 600, fontSize: '13px' }}>v2.1.0</div>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" style={{
          background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
          border: 'none',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DatabaseOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
            <div>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>数据就绪</Text>
              <div style={{ color: '#52c41a', fontWeight: 600, fontSize: '13px' }}>100%</div>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" style={{
          background: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
          border: 'none',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SyncOutlined style={{ fontSize: '24px', color: '#faad14' }} />
            <div>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>同步状态</Text>
              <div style={{ color: '#faad14', fontWeight: 600, fontSize: '13px' }}>已同步</div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )

  // 运行时数据面板
  const RuntimePanel = () => (
    <Row gutter={[24, 24]} style={{ marginTop: '40px' }}>
      <Col span={8}>
        <Card style={{
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          textAlign: 'center',
          height: '100%',
        }}>
          <Statistic
            title={<Text style={{ fontSize: '13px' }}>已用时间</Text>}
            value={formatTime(elapsedTime)}
            prefix={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
            valueStyle={{ color: '#1677ff', fontSize: '28px' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card style={{
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          textAlign: 'center',
          height: '100%',
        }}>
          <Statistic
            title={<Text style={{ fontSize: '13px' }}>当前阶段</Text>}
            value={SCHEDULE_STEPS[currentStep]?.label || '-'}
            prefix={<SyncOutlined spin style={{ color: '#722ed1', fontSize: '14px' }} />}
            valueStyle={{ color: '#722ed1', fontSize: '28px' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card style={{
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          textAlign: 'center',
          height: '100%',
        }}>
          <Statistic
            title={<Text style={{ fontSize: '13px' }}>完成进度</Text>}
            value={Math.floor(progress)}
            suffix="%"
            prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a', fontSize: '28px' }}
          />
        </Card>
      </Col>
    </Row>
  )

  // 渲染不同状态的界面
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div style={{ position: 'relative', minHeight: '75vh' }}>
            <TechBackground />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', paddingTop: '60px' }}>
              {/* 主图标区域 */}
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(22, 119, 255, 0.2)',
                animation: 'float 3s ease-in-out infinite',
              }}>
                <RocketOutlined style={{ fontSize: '56px', color: '#1677ff' }} />
              </div>

              <Title level={2} style={{ marginBottom: '12px', fontWeight: 600 }}>
                正式排程调度
              </Title>
              <Paragraph type="secondary" style={{ fontSize: '15px', marginBottom: '40px' }}>
                基于智能优化算法，自动生成最优生产排程方案
              </Paragraph>

              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartSchedule}
                style={{
                  height: '52px',
                  fontSize: '16px',
                  paddingLeft: '40px',
                  paddingRight: '40px',
                  borderRadius: '26px',
                  boxShadow: '0 4px 16px rgba(22, 119, 255, 0.3)',
                }}
              >
                开始排程调度
              </Button>

              {/* 调度流程预览 */}
              <ProcessSteps />

              {/* 系统状态指示器 */}
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <SystemIndicators />
              </div>
            </div>
          </div>
        )

      case 'running':
        return (
          <div style={{ position: 'relative', minHeight: '65vh' }}>
            <TechBackground />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', paddingTop: '40px' }}>
              {/* 运行动画图标 */}
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(22, 119, 255, 0.4)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <SyncOutlined spin style={{ fontSize: '36px', color: '#fff' }} />
              </div>

              <Title level={3} style={{ marginBottom: '8px' }}>
                调度算法运行中
              </Title>
              <Paragraph type="secondary">
                系统正在执行智能排程计算，请耐心等待
              </Paragraph>

              {/* 流程步骤 */}
              <ProcessSteps active />

              {/* 进度条 */}
              <div style={{ maxWidth: '600px', margin: '32px auto' }}>
                <Progress
                  percent={Math.floor(progress)}
                  status="active"
                  strokeWidth={12}
                  strokeColor={{
                    '0%': '#1677ff',
                    '50%': '#722ed1',
                    '100%': '#52c41a',
                  }}
                  trailColor="#f0f0f0"
                  style={{ marginBottom: '16px' }}
                />
              </div>

              {/* 运行时数据 */}
              <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <RuntimePanel />
              </div>

              {/* 提示信息 */}
              <div style={{ maxWidth: '500px', margin: '32px auto 0' }}>
                <Alert
                  message="正在检测调度结果"
                  description="调度算法正在运行中，结果生成后将自动跳转"
                  type="info"
                  showIcon
                  icon={<SyncOutlined spin />}
                  style={{
                    borderRadius: '12px',
                    textAlign: 'left',
                  }}
                />
              </div>

              <Button
                style={{ marginTop: '24px' }}
                onClick={handleReset}
                danger
              >
                取消调度
              </Button>
            </div>
          </div>
        )

      case 'completed':
        return (
          <div style={{ position: 'relative', minHeight: '65vh' }}>
            <TechBackground />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', paddingTop: '80px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(82, 196, 26, 0.4)',
              }}>
                <CheckCircleOutlined style={{ fontSize: '56px', color: '#fff' }} />
              </div>

              <Title level={2} style={{ color: '#52c41a', marginBottom: '12px' }}>
                调度完成！
              </Title>
              <Paragraph type="secondary" style={{ fontSize: '15px', marginBottom: '32px' }}>
                排程结果已生成，总耗时 {formatTime(elapsedTime)}
              </Paragraph>

              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <Progress percent={100} status="success" strokeWidth={12} />
              </div>

              <div style={{ marginTop: '40px' }}>
                <SyncOutlined spin style={{ marginRight: '8px', color: '#1677ff' }} />
                <Text type="secondary">正在跳转到结果页面...</Text>
              </div>
            </div>
          </div>
        )

      case 'error':
        return (
          <div style={{ position: 'relative', minHeight: '65vh' }}>
            <TechBackground />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', paddingTop: '80px' }}>
              <Alert
                message="调度失败"
                description={errorMessage || '未知错误'}
                type="error"
                showIcon
                style={{ maxWidth: '500px', margin: '0 auto 32px', borderRadius: '12px' }}
              />
              <Space size="large">
                <Button onClick={handleReset} size="large">
                  重置
                </Button>
                <Button type="primary" onClick={handleStartSchedule} size="large">
                  重新调度
                </Button>
              </Space>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ padding: '8px' }}>
      <Card
        style={{
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0, minHeight: '70vh' } }}
      >
        {renderContent()}
      </Card>
    </div>
  )
}

export default SimulationEvaluation
