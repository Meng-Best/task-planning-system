import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  Calendar, 
  Modal, 
  Form, 
  DatePicker, 
  Select, 
  Input, 
  message,
  Tag,
  Typography,
  ConfigProvider,
  Tooltip,
  Row,
  Col
} from 'antd'
import { StarOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import zhCN from 'antd/locale/zh_CN'
import axios from 'axios'
import { FACTORY_WORK_HOURS } from '../../config/dictionaries'

// 设置 dayjs 为中文
dayjs.locale('zh-cn')

const { RangePicker } = DatePicker
const { Title } = Typography

// 组件 Props 定义
interface WorkCalendarProps {
  productionLineId?: number
  productionLineName?: string
}

// 日历事件类型定义
interface CalendarEvent {
  id: number
  date: string // ISO 8601 date string
  type: 'WORK' | 'HOLIDAY' | 'REST'
  note?: string | null
  productionLineId?: number | null
  productionLine?: {
    id: number
    name: string
    factoryId: number
  } | null
}

// API 响应类型
interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

// 日历 API 响应的 data 字段结构
interface CalendarApiData {
  events: CalendarEvent[]
  count: number
  startDate: string
  endDate: string
}

// 日期类型配置 - 全局日历
const GLOBAL_DATE_TYPE_OPTIONS = [
  { 
    value: 'WORK', 
    label: '🟢 调休上班',
    description: `工作日8小时工作制`
  },
  { 
    value: 'HOLIDAY', 
    label: '🔴 法定节假日',
    description: '国家法定节假日，全员休息'
  },
  { 
    value: 'REST', 
    label: '⚪ 公司福利假',
    description: '公司统一放假或福利假期'
  },
  { 
    value: 'DEFAULT', 
    label: '❌ 恢复默认',
    description: '清除配置，恢复为系统默认规则'
  }
]

// 日期类型配置 - 产线日历
const LINE_DATE_TYPE_OPTIONS = [
  { 
    value: 'WORK', 
    label: '🟢 产线加班',
    description: `加班排班：${FACTORY_WORK_HOURS.totalLabel}`
  },
  { 
    value: 'REST', 
    label: '⚪ 产线停工',
    description: '此产线在该日期停工检修或维护'
  },
  { 
    value: 'HOLIDAY', 
    label: '🔴 产线例外休息',
    description: '此产线在该日期特殊休息（覆盖全局工作日）'
  },
  { 
    value: 'DEFAULT', 
    label: '❌ 恢复默认',
    description: '清除产线专用配置，使用全局日历规则'
  }
]

const API_BASE_URL = 'http://localhost:3001'

const WorkCalendar: React.FC<WorkCalendarProps> = ({ productionLineId, productionLineName }) => {
  const [events, setEvents] = useState<Map<string, CalendarEvent>>(new Map())
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const [form] = Form.useForm()

  // 判断是否为产线专用日历
  const isProductionLineCalendar = productionLineId !== undefined

  // 获取日历事件数据
  const fetchCalendarEvents = useCallback(async (month: Dayjs) => {
    setLoading(true)
    try {
      // 获取当前月的第一天和最后一天，并扩展前后几天以覆盖日历显示范围
      const startDate = month.startOf('month').subtract(7, 'day').format('YYYY-MM-DD')
      const endDate = month.endOf('month').add(7, 'day').format('YYYY-MM-DD')
      
      const params: Record<string, string | number> = { startDate, endDate }
      if (isProductionLineCalendar && productionLineId !== undefined) {
        params.productionLineId = productionLineId
      }
      
      console.log('Fetching calendar events:', params)
      
      const response = await axios.get<ApiResponse<CalendarApiData>>(
        `${API_BASE_URL}/api/calendar`,
        { params }
      )

      console.log('Calendar response:', response.data)

      if (response.data.status === 'ok') {
        const eventMap = new Map<string, CalendarEvent>()
        
        // 合并逻辑：先填入全局数据，再填入产线数据（产线数据覆盖全局）
        const globalEvents = response.data.data.events.filter(e => !e.productionLineId)
        const lineEvents = response.data.data.events.filter(e => e.productionLineId)
        
        // 先填入全局数据
        globalEvents.forEach(event => {
          const dateKey = dayjs(event.date).format('YYYY-MM-DD')
          eventMap.set(dateKey, event)
        })
        
        // 产线数据覆盖全局数据
        lineEvents.forEach(event => {
          const dateKey = dayjs(event.date).format('YYYY-MM-DD')
          eventMap.set(dateKey, event)
        })
        
        setEvents(eventMap)
        console.log(`Events loaded: ${eventMap.size} (${globalEvents.length} global, ${lineEvents.length} line-specific)`)
      } else {
        message.error('获取日历数据失败')
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      message.error('获取日历数据失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }, [isProductionLineCalendar, productionLineId])

  // 初始加载和月份变化时获取数据
  useEffect(() => {
    fetchCalendarEvents(currentMonth)
  }, [currentMonth, fetchCalendarEvents])

  // 面板切换（月份/年份变化）
  const handlePanelChange = (value: Dayjs) => {
    console.log('Panel changed to:', value.format('YYYY-MM'))
    console.log('Current events count:', events.size)
    setCurrentMonth(value)
  }

  // 点击日期单元格
  const handleDateSelect = (value: Dayjs) => {
    console.log('Date selected:', value.format('YYYY-MM-DD'))
    const dateKey = value.format('YYYY-MM-DD')
    const existingEvent = events.get(dateKey)

    // 设置表单初始值
    form.setFieldsValue({
      dateRange: [value, value],
      type: existingEvent?.type || 'WORK',
      note: existingEvent?.note || ''
    })

    setModalOpen(true)
  }

  // 保存日期配置
  const handleSaveEvent = async () => {
    try {
      const values = await form.validateFields()
      const { dateRange, type, note } = values
      
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      const requestBody: Record<string, string | number | undefined> = {
        startDate,
        endDate,
        type,
        note: note || undefined
      }

      // 如果是产线日历，添加 productionLineId
      if (isProductionLineCalendar) {
        requestBody.productionLineId = productionLineId
      }

      console.log('Saving event:', requestBody)

      setLoading(true)
      const response = await axios.post<ApiResponse<any>>(
        `${API_BASE_URL}/api/calendar`,
        requestBody
      )

      console.log('Save response:', response.data)

      if (response.data.status === 'ok') {
        const typeOptions = isProductionLineCalendar ? LINE_DATE_TYPE_OPTIONS : GLOBAL_DATE_TYPE_OPTIONS
        const typeLabel = typeOptions.find((opt: { value: string; label: string }) => opt.value === type)?.label || type
        
        message.success(
          type === 'DEFAULT' 
            ? isProductionLineCalendar 
              ? '已恢复为全局日历规则' 
              : '已恢复为默认日历规则' 
            : `成功设置 ${response.data.data.affectedDates} 天为 ${typeLabel}`
        )
        setModalOpen(false)
        form.resetFields()
        // 刷新当前视图数据
        await fetchCalendarEvents(currentMonth)
      } else {
        message.error('保存失败：' + response.data.message)
      }
    } catch (error: unknown) {
      console.error('Failed to save calendar event:', error)
      if (axios.isAxiosError(error)) {
        message.error('保存失败：' + (error.response?.data?.message || error.message))
      } else if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证错误，不显示错误消息
        return
      } else {
        message.error('保存失败，请检查网络连接')
      }
    } finally {
      setLoading(false)
    }
  }

  // 自定义单元格完整渲染（包括日期数字和内容）
  const fullCellRender = (value: Dayjs) => {
    const dateKey = value.format('YYYY-MM-DD')
    const event = events.get(dateKey)
    const dayOfWeek = value.day() // 0 = Sunday, 6 = Saturday
    const isToday = value.isSame(dayjs(), 'day')

    // 样式类名
    let cellClassName = 'ant-picker-cell-inner ant-picker-calendar-date'
    
    // 添加今天的类名
    if (isToday) {
      cellClassName += ' ant-picker-calendar-date-today'
    }
    
    // 添加事件类型样式
    if (event) {
      switch (event.type) {
        case 'HOLIDAY':
          cellClassName += ' holiday-cell'
          break
        case 'WORK':
          cellClassName += ' production-day-cell'
          break
        case 'REST':
          cellClassName += ' rest-cell'
          break
      }
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 默认周末样式
      cellClassName += ' weekend-cell'
    } else {
      // 默认工作日（周一至周五，且无特殊事件）
      cellClassName += ' production-day-cell'
    }

    // 点击单元格时打开设置窗口
    const handleCellClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      handleDateSelect(value)
    }

    // 判断是否为产线专用配置
    const isLineSpecific = event?.productionLineId !== null && event?.productionLineId !== undefined

    // 获取 Tag 显示文本
    const getTagText = (type: string, isLineCalendar: boolean, isLineSpec: boolean) => {
      if (type === 'WORK') {
        return isLineCalendar && isLineSpec ? '加班' : '班'
      } else if (type === 'REST') {
        return isLineCalendar && isLineSpec ? '停工' : '休'
      } else {
        return '休'
      }
    }

    // 判断是否为工作日（默认工作日或调休上班）
    // const isWorkDay = event ? event.type === 'WORK' : (dayOfWeek !== 0 && dayOfWeek !== 6)

    return (
      <div className={cellClassName} onClick={handleCellClick}>
        <div className="ant-picker-calendar-date-value">
          {value.date()}
        </div>
        <div className="ant-picker-calendar-date-content">
          {/* 工作时间提示 */}
          {/* {isWorkDay ? (
            <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mb-1" style={{ transform: 'scale(0.9)', transformOrigin: 'left' }}>
              <ClockCircleOutlined className="text-[9px]" />
              <span>16小时</span>
            </div>
          ) : null} */}
          
          {event && (
            <div className="calendar-cell-content">
              <div className="flex items-center gap-1">
                <Tag 
                  color={event.type === 'HOLIDAY' ? 'red' : event.type === 'WORK' ? 'success' : 'default'} 
                  className={`text-xs font-bold px-2 ${isLineSpecific ? 'line-specific-tag' : ''}`}
                >
                  {getTagText(event.type, isProductionLineCalendar, isLineSpecific)}
                </Tag>
                {isLineSpecific && (
                  <Tooltip title={`产线专用配置：${event.note || '无备注'}`}>
                    <StarOutlined className="text-orange-500 text-xs" />
                  </Tooltip>
                )}
              </div>
              {event.note && (
                <div className="text-xs text-gray-500 truncate mt-1" title={event.note}>
                  {event.note}
                </div>
              )}
            </div>
          )}
          {!event && (dayOfWeek === 0 || dayOfWeek === 6) && (
            <div className="calendar-cell-content">
              <span className="text-xs text-gray-400">休</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div className="work-calendar-container">
        <Card 
        title={
          <div className="flex items-center justify-between">
            <Title level={4} className="mb-0">
              {isProductionLineCalendar ? `产线日历 - ${productionLineName}` : '全局工作日历'}
            </Title>
            <div className="text-sm text-gray-500 font-normal">
              点击日期可设置节假日或调休 | 已加载 {events.size} 个事件
            </div>
          </div>
        }
        loading={loading}
      >
        <div className="mb-4 flex gap-4 flex-wrap items-center">
          {isProductionLineCalendar ? (
            <>
              <div className="flex items-center gap-2">
                <Tag color="success">产线加班</Tag>
                <Tag color="default">产线停工</Tag>
                <Tag color="red">产线例外休息</Tag>
                <span className="text-xs text-gray-400">默认周末</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <StarOutlined className="text-orange-500" />
                  <span>带星标表示产线专用配置（覆盖全局设置）</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockCircleOutlined />
                  <span>工作日排班</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Tag color="red">法定节假日</Tag>
                <Tag color="success">工作日（包含调休上班）</Tag>
                <Tag color="default">公司福利假</Tag>
                <span className="text-xs text-gray-400">默认周末</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                <ClockCircleOutlined />
                <span>工作日：8:00-12:00;14:00-18:00，最多8小时产能</span>
              </div>
            </>
          )}
        </div>

        <Calendar
          key={`calendar-${currentMonth.format('YYYY-MM')}-${events.size}`}
          value={currentMonth}
          onPanelChange={handlePanelChange}
          headerRender={({ value, onChange }) => {
            const start = 0;
            const end = 12;
            const monthOptions = [];

            const months = [];
            for (let i = 0; i < 12; i++) {
              months.push(`${i + 1}月`);
            }

            for (let i = start; i < end; i++) {
              monthOptions.push(
                <Select.Option key={i} value={i} className="month-item">
                  {months[i]}
                </Select.Option>,
              );
            }

            const year = value.year();
            const month = value.month();
            const options = [];
            for (let i = year - 10; i < year + 10; i += 1) {
              options.push(
                <Select.Option key={i} value={i} className="year-item">
                  {i}
                </Select.Option>,
              );
            }
            return (
              <div style={{ padding: 8 }}>
                <Row gutter={8} justify="end">
                  <Col>
                    <Select
                      size="small"
                      popupMatchSelectWidth={false}
                      className="my-year-select"
                      value={year}
                      onChange={(newYear) => {
                        const now = value.clone().year(newYear);
                        onChange(now);
                      }}
                    >
                      {options}
                    </Select>
                  </Col>
                  <Col>
                    <Select
                      size="small"
                      popupMatchSelectWidth={false}
                      value={month}
                      onChange={(newMonth) => {
                        const now = value.clone().month(newMonth);
                        onChange(now);
                      }}
                    >
                      {monthOptions}
                    </Select>
                  </Col>
                </Row>
              </div>
            );
          }}
          fullCellRender={fullCellRender}
          className="work-calendar"
        />
      </Card>

      {/* 设置日期状态弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            {isProductionLineCalendar ? (
              <>
                <CalendarOutlined className="text-orange-500" />
                <span>设置产线日历 - {productionLineName}</span>
              </>
            ) : (
              <>
                <CalendarOutlined className="text-blue-500" />
                <span>设置全局日历</span>
              </>
            )}
          </div>
        }
        open={modalOpen}
        onOk={handleSaveEvent}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        confirmLoading={loading}
        width={550}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            name="dateRange"
            label="日期范围"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker 
              className="w-full"
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label={isProductionLineCalendar ? '产线状态' : '日期类型'}
            rules={[{ required: true, message: '请选择日期类型' }]}
            tooltip={isProductionLineCalendar ? '设置此产线在指定日期的工作状态' : '设置全局工作日历规则'}
          >
            <Select 
              options={isProductionLineCalendar ? LINE_DATE_TYPE_OPTIONS : GLOBAL_DATE_TYPE_OPTIONS}
              optionRender={(option) => (
                <div className="py-1">
                  <div className="font-medium">{option.data.label}</div>
                  <div className="text-xs text-gray-500">{option.data.description}</div>
                </div>
              )}
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="备注说明（可选）"
          >
            <Input.TextArea
              rows={3}
              placeholder={
                isProductionLineCalendar 
                  ? "例如：设备检修、订单加急、临时停工等" 
                  : "例如：国庆节假期、中秋节调休等"
              }
              maxLength={200}
              showCount
            />
          </Form.Item>

          {isProductionLineCalendar && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-2">
              <div className="flex items-start gap-2">
                <StarOutlined className="text-orange-500 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <div className="font-medium text-orange-700 mb-1">产线专用配置说明：</div>
                  <div>• 此配置仅对当前产线"{productionLineName}"有效</div>
                  <div>• 产线专用配置优先级高于全局日历</div>
                  <div>• 其他产线不受影响，仍遵循全局日历规则</div>
                </div>
              </div>
            </div>
          )}
        </Form>
      </Modal>

      <style>{`
        .calendar-cell-content {
          padding: 2px;
          min-height: 24px;
        }

        .work-calendar .ant-picker-calendar-date {
          min-height: 80px;
          padding: 4px;
          cursor: pointer;
          transition: none !important;
        }

        .work-calendar .ant-picker-calendar-date:hover {
          background-color: rgba(24, 144, 255, 0.08) !important;
        }

        /* 增大日期数字 */
        .work-calendar .ant-picker-calendar-date-value {
          font-size: 18px !important;
          line-height: 28px !important;
        }

        /* 移除选中日期的背景色和阴影，但保留今天的边框 */
        .work-calendar .ant-picker-cell-selected .ant-picker-calendar-date {
          background-color: transparent !important;
          box-shadow: none !important;
        }

        .work-calendar .ant-picker-cell-selected {
          background-color: transparent !important;
          box-shadow: none !important;
        }

        /* 移除所有单元格的过渡和阴影效果 */
        .work-calendar .ant-picker-cell {
          transition: none !important;
          box-shadow: none !important;
        }

        /* 保留今天的边框样式 */
        .work-calendar .ant-picker-cell-today .ant-picker-calendar-date-today {
          border: 1px solid #1890ff !important;
          box-shadow: none !important;
        }

        /* 今天的日期数字加粗 */
        .work-calendar .ant-picker-cell-today .ant-picker-calendar-date-value {
          font-weight: bold;
          color: #1890ff;
        }

        /* 自定义背景色 - 使用更高优先级 */
        .work-calendar .holiday-cell {
          background-color: rgba(255, 77, 79, 0.1) !important;
        }

        .work-calendar .production-day-cell {
          background-color: rgba(82, 196, 26, 0.08) !important;
        }

        .work-calendar .rest-cell {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }

        .work-calendar .weekend-cell {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }

        /* 确保事件背景色在选中状态下也显示 */
        .work-calendar .ant-picker-cell-selected .holiday-cell,
        .work-calendar .ant-picker-cell-today .holiday-cell {
          background-color: rgba(255, 77, 79, 0.1) !important;
        }

        .work-calendar .ant-picker-cell-selected .production-day-cell,
        .work-calendar .ant-picker-cell-today .production-day-cell {
          background-color: rgba(82, 196, 26, 0.08) !important;
        }

        .work-calendar .ant-picker-cell-selected .rest-cell,
        .work-calendar .ant-picker-cell-today .rest-cell {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }

        .work-calendar .ant-picker-cell-selected .weekend-cell,
        .work-calendar .ant-picker-cell-today .weekend-cell {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }

        /* 产线专用配置的视觉样式 */
        .line-specific-tag {
          border: 1px dashed #ff9800 !important;
          font-weight: 600 !important;
        }
      `}</style>
      </div>
    </ConfigProvider>
  )
}

export default WorkCalendar
