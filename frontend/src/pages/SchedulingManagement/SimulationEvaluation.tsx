import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Typography, Empty, Spin, Progress, Alert, Space, Statistic, message } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, RocketOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useTabStore } from '../../store/useTabStore'

const { Title, Text, Paragraph } = Typography

const API_BASE_URL = 'http://localhost:3001'

type ScheduleStatus = 'idle' | 'running' | 'completed' | 'error'

const SimulationEvaluation: React.FC = () => {
  const [status, setStatus] = useState<ScheduleStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
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

  // 检查 output.json 是否存在
  const checkOutputFile = async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schedules/output/check`)
      return response.data.exists === true
    } catch (error) {
      console.error('检查文件失败:', error)
      return false
    }
  }

  // 开始轮询检测文件
  const startPolling = () => {
    const startTime = Date.now()
    // 随机30-60秒的动画时长
    const animationDuration = 30000 + Math.random() * 30000 // 30-60秒
    const maxWaitTime = 600000 // 最多等待10分钟
    let fileDetected = false

    pollingIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTime

      // 前30秒：进度条按时间推进到95%
      if (elapsed <= animationDuration) {
        const progress = (elapsed / animationDuration) * 95
        setProgress(progress)
      } else if (!fileDetected) {
        // 30秒后如果还没检测到文件，保持95%并继续等待
        setProgress(95)
      }

      // 检查文件是否存在
      if (!fileDetected) {
        const exists = await checkOutputFile()

        if (exists) {
          fileDetected = true

          // 如果在30秒内检测到，等待动画完成
          if (elapsed < animationDuration) {
            const remainingTime = animationDuration - elapsed

            // 等待剩余时间后完成
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

              // 2秒后跳转到结果页面
              setTimeout(() => {
                addTab({
                  key: 'schedule-result',
                  label: '排程结果展示'
                })
              }, 2000)
            }, remainingTime)
          } else {
            // 30秒后检测到，立即完成
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }

            setProgress(100)
            setStatus('completed')
            message.success('调度完成！即将跳转到结果页面...')

            // 2秒后跳转到结果页面
            setTimeout(() => {
              addTab({
                key: 'schedule-result',
                label: '排程结果展示'
              })
            }, 2000)
          }
        }
      }

      // 超时检查（10分钟）
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
    }, 100) // 每100ms检查一次，让进度更平滑

    // 启动计时器
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

      // 调用后端API触发调度（目前只是占位，实际调度算法还未实现）
      await axios.post(`${API_BASE_URL}/api/schedules/run`)

      message.info('调度已启动，正在等待结果...')

      // 开始轮询检测 output.json
      startPolling()

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

    setStatus('idle')
    setProgress(0)
    setElapsedTime(0)
    setErrorMessage('')
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 渲染不同状态的界面
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <RocketOutlined style={{ fontSize: 80, color: '#1890ff', marginBottom: 24 }} />
            <Title level={3}>正式排程调度</Title>
            <Paragraph type="secondary" style={{ marginBottom: 32 }}>
              点击下方按钮启动调度算法，系统将自动生成排程结果
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartSchedule}
              style={{ height: 48, fontSize: 16, paddingLeft: 32, paddingRight: 32 }}
            >
              开始排程调度
            </Button>
          </div>
        )

      case 'running':
        return (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Spin size="large" />
            <Title level={3} style={{ marginTop: 24, marginBottom: 16 }}>
              调度算法运行中...
            </Title>
            <Paragraph type="secondary">
              系统正在执行排程计算，请耐心等待
            </Paragraph>

            <div style={{ maxWidth: 600, margin: '40px auto' }}>
              <Progress
                percent={Math.floor(progress)}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>

            <Space size="large" style={{ marginTop: 32 }}>
              <Statistic
                title="已用时间"
                value={formatTime(elapsedTime)}
                prefix={<ClockCircleOutlined />}
              />
              <Statistic
                title="进度"
                value={Math.floor(progress)}
                suffix="%"
              />
            </Space>

            <div style={{ maxWidth: 600, margin: '40px auto 0', display: 'flex', justifyContent: 'center' }}>
              <style>{`
                .schedule-alert .ant-alert-icon {
                  align-self: center !important;
                }
              `}</style>
              <Alert
                message="正在检测调度结果"
                description="调度算法正常运行排程中，请保持耐心等待，出现结果将会自动跳转"
                type="info"
                showIcon
                className="schedule-alert"
                style={{ textAlign: 'left', width: '100%' }}
              />
            </div>

            <Button
              style={{ marginTop: 24 }}
              onClick={handleReset}
              danger
            >
              取消调度
            </Button>
          </div>
        )

      case 'completed':
        return (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <CheckCircleOutlined style={{ fontSize: 80, color: '#52c41a', marginBottom: 24 }} />
            <Title level={3} style={{ color: '#52c41a' }}>
              调度完成！
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 32 }}>
              排程结果已生成，耗时 {formatTime(elapsedTime)}
            </Paragraph>
            <Progress percent={100} status="success" />
            <div style={{ marginTop: 32 }}>
              <Text type="secondary">正在跳转到结果页面...</Text>
            </div>
          </div>
        )

      case 'error':
        return (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Alert
              message="调度失败"
              description={errorMessage || '未知错误'}
              type="error"
              showIcon
              style={{ marginBottom: 32 }}
            />
            <Space>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button type="primary" onClick={handleStartSchedule}>
                重新调度
              </Button>
            </Space>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <Card
        className="shadow-sm border-none"
        styles={{ body: { minHeight: '70vh' } }}
      >
        {renderContent()}
      </Card>
    </div>
  )
}

export default SimulationEvaluation
