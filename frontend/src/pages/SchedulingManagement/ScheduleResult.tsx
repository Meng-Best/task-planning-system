import { useEffect, useState } from 'react'
import { Card, Tabs, Button, message, Spin, Alert, Modal, Descriptions, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import StatisticCards from './ScheduleResult/components/StatisticCards'
import OrderView from './ScheduleResult/components/OrderView'
import TaskListView from './ScheduleResult/components/TaskListView'
import GanttChartView from './ScheduleResult/components/GanttChartView'
import StationView from './ScheduleResult/components/StationView'
import TeamView from './ScheduleResult/components/TeamView'
import { ScheduleAdapter } from './ScheduleResult/adapters/scheduleAdapter'
import type { ScheduleResultData, TaskPlan, GanttItem } from './ScheduleResult/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const { TabPane } = Tabs

const ScheduleResult: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [scheduleData, setScheduleData] = useState<ScheduleResultData | null>(null)
  const [adapter, setAdapter] = useState<ScheduleAdapter | null>(null)
  const [lastModified, setLastModified] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<TaskPlan | GanttItem | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [allStations, setAllStations] = useState<Array<{ code: string; name: string }>>([])

  // 加载所有工位列表
  const loadAllStations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stations`, { params: { pageSize: 9999 } })
      if (response.data?.data?.list) {
        const stations = response.data.data.list.map((s: { code: string; name: string }) => ({
          code: s.code,
          name: s.name
        }))
        setAllStations(stations)
      }
    } catch (error) {
      console.error('加载工位列表失败:', error)
    }
  }

  // 加载调度结果数据
  const loadScheduleResult = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/schedules/output/result')
      const result = await response.json()

      if (result.status === 'ok') {
        setScheduleData(result.data)
        setAdapter(new ScheduleAdapter(result.data))
        setLastModified(dayjs(result.meta.lastModified).format('YYYY-MM-DD HH:mm:ss'))
        message.success('调度结果加载成功')
      } else {
        message.error(result.message || '加载调度结果失败')
      }
    } catch (error) {
      console.error('加载调度结果失败:', error)
      message.error('加载调度结果失败，请检查是否已生成调度结果')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllStations()
    loadScheduleResult()
  }, [])

  // 任务点击处理
  const handleTaskClick = (task: TaskPlan | GanttItem) => {
    setSelectedTask(task)
    setDetailVisible(true)
  }

  // 渲染任务详情
  const renderTaskDetail = () => {
    if (!selectedTask) return null

    const isTaskPlan = 'task id' in selectedTask
    const task = selectedTask as TaskPlan

    return (
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="任务ID">
          {isTaskPlan ? task['task id'] : (selectedTask as GanttItem).id}
        </Descriptions.Item>
        <Descriptions.Item label="任务编码">
          {isTaskPlan ? task.task_code : (selectedTask as GanttItem).taskCode}
        </Descriptions.Item>
        <Descriptions.Item label="工序名称" span={2}>
          {isTaskPlan ? task.name : (selectedTask as GanttItem).name}
        </Descriptions.Item>
        <Descriptions.Item label="工序编码">
          {isTaskPlan ? task.process_code : (selectedTask as GanttItem).processCode}
        </Descriptions.Item>
        <Descriptions.Item label="订单">
          <Tag color="blue">
            {isTaskPlan ? task['order code'] : (selectedTask as GanttItem).orderCode} -{' '}
            {isTaskPlan ? task.order_name : (selectedTask as GanttItem).orderName}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="开始时间">
          {isTaskPlan
            ? task.planstart
            : dayjs((selectedTask as GanttItem).start).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="结束时间">
          {isTaskPlan
            ? task.planend
            : dayjs((selectedTask as GanttItem).end).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="班组">
          <Tag color="green">
            {isTaskPlan ? task.team_code : (selectedTask as GanttItem).teamCode} -{' '}
            {isTaskPlan ? task['team name'] : (selectedTask as GanttItem).teamName}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="工位">
          <Tag color="purple">
            {isTaskPlan ? task['station code'] : (selectedTask as GanttItem).stationCode} -{' '}
            {isTaskPlan ? task['station name'] : (selectedTask as GanttItem).stationName}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    )
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="正在加载调度结果..." />
        </div>
      </Card>
    )
  }

  if (!scheduleData || !adapter) {
    return (
      <Card>
        <Alert
          message="未找到调度结果"
          description="请先运行调度算法生成调度结果，然后刷新页面"
          type="warning"
          showIcon
          action={
            <Button type="primary" onClick={loadScheduleResult} icon={<ReloadOutlined />}>
              重新加载
            </Button>
          }
        />
      </Card>
    )
  }

  const statistics = adapter.getStatistics()
  const orderTree = adapter.toOrderTree()
  const ganttByStation = adapter.toGanttDataByStation()
  const ganttByTeam = adapter.toGanttDataByTeam()
  const ganttByOrder = adapter.toGanttDataByOrder()
  const stationTimeline = adapter.toStationTimeline(allStations.length > 0 ? allStations : undefined)
  const teamWorkload = adapter.toTeamWorkload()

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
            排程结果
          </div>
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadScheduleResult}>
            刷新数据
          </Button>
        </div>
      </Card>

      {/* 统计卡片 */}
      <StatisticCards data={statistics} lastModified={lastModified} />

      {/* 多视图标签页 */}
      <Card>
        <Tabs defaultActiveKey="order" type="card">
          <TabPane tab="订单视图" key="order">
            <OrderView data={orderTree} onTaskClick={handleTaskClick} />
          </TabPane>
          <TabPane tab="甘特图" key="gantt">
            <GanttChartView
              dataByStation={ganttByStation}
              dataByTeam={ganttByTeam}
              dataByOrder={ganttByOrder}
              onTaskClick={handleTaskClick}
            />
          </TabPane>
          <TabPane tab="任务列表" key="tasklist">
            <TaskListView
              dataByStation={ganttByStation}
              dataByTeam={ganttByTeam}
              dataByOrder={ganttByOrder}
              onTaskClick={handleTaskClick}
            />
          </TabPane>
          <TabPane tab="工位视图" key="station">
            <StationView data={stationTimeline} onTaskClick={handleTaskClick} />
          </TabPane>
          <TabPane tab="班组视图" key="team">
            <TeamView data={teamWorkload} onTaskClick={handleTaskClick} />
          </TabPane>
        </Tabs>
      </Card>

      {/* 任务详情弹窗 */}
      <Modal
        title="任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {renderTaskDetail()}
      </Modal>
    </div>
  )
}

export default ScheduleResult
