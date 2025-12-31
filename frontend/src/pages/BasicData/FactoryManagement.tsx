import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Empty,
  Statistic,
  Space,
  Popconfirm,
  Drawer
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  SettingOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import axios from 'axios'
import WorkCalendar from './WorkCalendar'
import { 
  FACTORY_CODE_PREFIX, 
  LINE_CODE_INFIX, 
  CODE_CONFIG
} from '../../config/appConfig'
import { 
  BASIC_DATA_STATUS,
  getStatusConfig,
  STATUS_VALUE
} from '../../config/dictionaries'

// 类型定义
interface ProductionLine {
  id: number
  code?: string
  name: string
  type: number
  capacity: number
  status: number  // 改为整数类型: 0=可用, 1=不可用
  factoryId: number
  createdAt: string
  updatedAt: string
}

interface Factory {
  id: number
  code?: string
  name: string
  location?: string
  description?: string
  status: number  // 全局状态标准: 0=可用, 1=不可用
  productionLines: ProductionLine[]
  createdAt: string
  updatedAt: string
}

const API_BASE_URL = 'http://localhost:3001'
const LINE_TYPE_OPTIONS = [
  { value: 0, label: '部装' },
  { value: 1, label: '总装' }
]

const FactoryManagement: React.FC = () => {
  const [factories, setFactories] = useState<Factory[]>([])
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null)
  const [loading, setLoading] = useState(false)
  const [factoryModalOpen, setFactoryModalOpen] = useState(false)
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null)
  const [factoryForm] = Form.useForm()
  const [lineForm] = Form.useForm()
  
  // 筛选器状态
  const [filterType, setFilterType] = useState<number | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined)

  // 加载工厂数据
  const fetchFactories = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/factories`)
      if (response.data.status === 'ok') {
        setFactories(response.data.data)
        // 如果有选中的工厂，更新其数据
        if (selectedFactory) {
          const updated = response.data.data.find((f: Factory) => f.id === selectedFactory.id)
          setSelectedFactory(updated || null)
        }
      }
    } catch (error) {
      message.error('获取工厂列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFactories()
  }, [])

  // 打开新建/编辑工厂弹窗
  const handleOpenFactoryModal = (factory?: Factory) => {
    setEditingFactory(factory || null)
    if (factory) {
      factoryForm.setFieldsValue({
        code: parseFactoryCode(factory.code), // 解析代码，只显示后缀
        name: factory.name,
        location: factory.location,
        description: factory.description,
        status: factory.status !== undefined ? factory.status : STATUS_VALUE.AVAILABLE
      })
    } else {
      factoryForm.resetFields()
      // 新建工厂时设置默认状态为可用
      factoryForm.setFieldsValue({
        status: STATUS_VALUE.AVAILABLE
      })
    }
    setFactoryModalOpen(true)
  }

  // 保存工厂
  const handleSaveFactory = async () => {
    let factoryData: any = null
    
    try {
      const values = await factoryForm.validateFields()
      
      // 构建完整的工厂代码（拼接前缀）
      factoryData = {
        ...values,
        code: values.code ? buildFactoryCode(values.code) : undefined
      }

      console.log('Saving factory data:', factoryData)

      // 检查是否修改了工厂代码，且该工厂有产线
      if (editingFactory && editingFactory.code && factoryData.code !== editingFactory.code) {
        const hasLines = editingFactory.productionLines && editingFactory.productionLines.length > 0
        
        if (hasLines) {
          // 提示用户：工厂代码已修改，是否同步更新产线代码
          await new Promise<void>((resolve, reject) => {
            Modal.confirm({
              title: '工厂代码已修改',
              content: (
                <div>
                  <p>检测到工厂代码从 <strong>{editingFactory.code}</strong> 修改为 <strong>{factoryData.code}</strong></p>
                  <p style={{ marginTop: 12 }}>该工厂有 <strong>{editingFactory.productionLines.length}</strong> 条产线，是否同步更新产线代码？</p>
                  <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fff7e6', borderRadius: 4 }}>
                    <div style={{ fontSize: '12px', color: '#d46b08' }}>
                      <div>• 选择"是"：产线代码将从旧前缀更新为新前缀</div>
                      <div>• 选择"否"：仅更新工厂代码，产线代码保持不变（可能导致不一致）</div>
                    </div>
                  </div>
                </div>
              ),
              okText: '是，同步更新产线',
              cancelText: '否，仅更新工厂',
              icon: null,
              onOk: () => resolve(),
              onCancel: () => reject(new Error('skip-line-update'))
            })
          })
        }
      }

      setLoading(true)
      let shouldUpdateLines = false
      const oldCode = editingFactory?.code
      const newCode = factoryData.code

      if (editingFactory) {
        // 更新
        const response = await axios.put(`${API_BASE_URL}/api/factories/${editingFactory.id}`, factoryData)
        console.log('Update response:', response.data)
        
        if (response.data.status === 'ok') {
          // 检查是否需要更新产线代码
          if (oldCode && newCode && oldCode !== newCode) {
            shouldUpdateLines = true
          }
          message.success('工厂信息已更新')
        } else {
          message.error('更新失败：' + response.data.message)
          return
        }
      } else {
        // 新建
        const response = await axios.post(`${API_BASE_URL}/api/factories`, factoryData)
        console.log('Create response:', response.data)
        
        if (response.data.status === 'ok') {
          message.success('工厂创建成功')
        } else {
          message.error('创建失败：' + response.data.message)
          return
        }
      }

      // 如果需要更新产线代码
      if (shouldUpdateLines && editingFactory) {
        const oldSuffix = parseFactoryCode(oldCode)
        const newSuffix = parseFactoryCode(newCode)
        
        console.log(`Updating line codes: ${oldSuffix} -> ${newSuffix}`)
        
        // 获取最新的工厂数据
        const factoryResponse = await axios.get(`${API_BASE_URL}/api/factories/${editingFactory.id}`)
        const updatedFactory = factoryResponse.data.data
        
        if (updatedFactory && updatedFactory.productionLines) {
          let updateCount = 0
          
          for (const line of updatedFactory.productionLines) {
            if (line.code && line.code.startsWith(`${oldSuffix}-`)) {
              // 替换产线代码中的工厂前缀
              const newLineCode = line.code.replace(`${oldSuffix}-`, `${newSuffix}-`)
              
              try {
                await axios.put(`${API_BASE_URL}/api/factories/line/${line.id}`, {
                  code: newLineCode,
                  name: line.name,
                  type: line.type,
                  capacity: line.capacity,
                  status: line.status
                })
                updateCount++
              } catch (error) {
                console.error(`Failed to update line ${line.id}:`, error)
              }
            }
          }
          
          if (updateCount > 0) {
            message.success(`已同步更新 ${updateCount} 条产线的代码`, 3)
          }
        }
      }

      setFactoryModalOpen(false)
      factoryForm.resetFields()
      await fetchFactories()
      
      // 重要：如果当前有选中的工厂，刷新其数据
      if (editingFactory && selectedFactory?.id === editingFactory.id) {
        const response = await axios.get(`${API_BASE_URL}/api/factories`)
        if (response.data.status === 'ok') {
          const updated = response.data.data.find((f: Factory) => f.id === editingFactory.id)
          if (updated) {
            setSelectedFactory(updated)
          }
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        console.log('Form validation errors:', error.errorFields)
        return
      }
      
      // 用户取消了同步更新
      if (error.message === 'skip-line-update') {
        // 仍然保存工厂，但不更新产线
        setLoading(true)
        try {
          const response = await axios.put(`${API_BASE_URL}/api/factories/${editingFactory!.id}`, factoryData)
          if (response.data.status === 'ok') {
            message.success('工厂信息已更新（产线代码未同步）')
            setFactoryModalOpen(false)
            factoryForm.resetFields()
            await fetchFactories()
            
            if (editingFactory && selectedFactory?.id === editingFactory.id) {
              const resp = await axios.get(`${API_BASE_URL}/api/factories`)
              if (resp.data.status === 'ok') {
                const updated = resp.data.data.find((f: Factory) => f.id === editingFactory.id)
                if (updated) {
                  setSelectedFactory(updated)
                }
              }
            }
          }
        } catch (err: any) {
          message.error('保存失败：' + (err.response?.data?.message || err.message))
        } finally {
          setLoading(false)
        }
        return
      }
      
      // API 错误
      const errorMessage = error.response?.data?.message || error.message || '操作失败'
      message.error('保存失败：' + errorMessage)
      console.error('Save factory error:', error.response?.data || error)
    } finally {
      setLoading(false)
    }
  }

  // 删除工厂
  const handleDeleteFactory = async (id: number) => {
    setLoading(true)
    try {
      await axios.delete(`${API_BASE_URL}/api/factories/${id}`)
      message.success('工厂已删除')
      if (selectedFactory?.id === id) {
        setSelectedFactory(null)
      }
      await fetchFactories()
    } catch (error) {
      message.error('删除失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 打开新建/编辑产线弹窗
  const handleOpenLineModal = (line?: ProductionLine) => {
    if (!selectedFactory && !line) {
      message.warning('请先选择工厂')
      return
    }

    setEditingLine(line || null)
    if (line) {
      // 编辑模式：填充现有数据
      lineForm.setFieldsValue({
        code: line.code, // 编辑时显示原代码（只读）
        name: line.name,
        type: normalizeLineType(line.type) ?? LINE_TYPE_OPTIONS[0].value,
        capacity: line.capacity,
        status: line.status
      })
    } else {
      // 新建模式：重置表单并自动生成代码
      lineForm.resetFields()
      
      if (selectedFactory) {
        const autoCode = generateLineCode(selectedFactory)
        lineForm.setFieldsValue({
          code: autoCode,
          type: LINE_TYPE_OPTIONS[0].value,
          capacity: 100,
          status: STATUS_VALUE.AVAILABLE  // 默认为可用(0)
        })
      }
    }
    setLineModalOpen(true)
  }

  // 保存产线
  const handleSaveLine = async () => {
    try {
      const values = await lineForm.validateFields()
      const payload = {
        ...values,
        type: normalizeLineType(values.type) ?? LINE_TYPE_OPTIONS[0].value
      }
      setLoading(true)

      if (editingLine) {
        // 更新
        await axios.put(`${API_BASE_URL}/api/factories/line/${editingLine.id}`, payload)
        message.success('产线信息已更新')
      } else {
        // 新建
        await axios.post(`${API_BASE_URL}/api/factories/line`, {
          ...payload,
          factoryId: selectedFactory!.id
        })
        message.success('产线创建成功')
      }

      setLineModalOpen(false)
      lineForm.resetFields()
      await fetchFactories()
    } catch (error: any) {
      if (error.errorFields) return
      message.error('操作失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 删除产线
  const handleDeleteLine = async (id: number) => {
    setLoading(true)
    try {
      await axios.delete(`${API_BASE_URL}/api/factories/line/${id}`)
      message.success('产线已删除')
      await fetchFactories()
    } catch (error) {
      message.error('删除失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // ========== 编码处理辅助函数 ==========
  
  /**
   * 解析工厂代码，去除前缀获取后缀
   * @param fullCode 完整工厂代码（如 "HJGS-01"）
   * @returns 工厂后缀（如 "01"）
   */
  const parseFactoryCode = (fullCode?: string): string => {
    if (!fullCode) return ''
    return fullCode.startsWith(FACTORY_CODE_PREFIX) 
      ? fullCode.substring(FACTORY_CODE_PREFIX.length)
      : fullCode
  }

  /**
   * 构建完整工厂代码
   * @param suffix 工厂后缀（如 "01"）
   * @returns 完整工厂代码（如 "HJGS-01"）
   */
  const buildFactoryCode = (suffix: string): string => {
    return `${FACTORY_CODE_PREFIX}${suffix}`
  }

  /**
   * 自动生成产线代码
   * @param factory 工厂对象
   * @returns 产线代码（如 "A-CX-01"）
   */
  const generateLineCode = (factory: Factory): string => {
    if (!factory.code) {
      message.warning('工厂代码不存在，无法生成产线代码')
      return ''
    }

    // 1. 获取工厂后缀（去除 HJGS- 前缀）
    const factorySuffix = parseFactoryCode(factory.code)
    
    if (!factorySuffix) {
      message.warning('工厂代码格式错误')
      return ''
    }

    // 2. 计算新序号
    const existingLines = factory.productionLines || []
    let maxNumber = 0

    // 遍历现有产线，提取序号
    existingLines.forEach(line => {
      if (line.code) {
        // 解析产线代码：格式为 "{工厂后缀}-CX-{数字}"
        // 例如：A-CX-01
        const pattern = new RegExp(`^${factorySuffix}-${LINE_CODE_INFIX}(\\d+)$`)
        const match = line.code.match(pattern)
        
        if (match && match[1]) {
          const number = parseInt(match[1], 10)
          if (number > maxNumber) {
            maxNumber = number
          }
        }
      }
    })

    // 3. 新序号 = 最大值 + 1
    const newNumber = maxNumber + 1

    // 检查是否超过最大值
    if (newNumber > CODE_CONFIG.lineMaxNumber) {
      message.error(`产线序号已达到最大值 ${CODE_CONFIG.lineMaxNumber}`)
      return ''
    }

    // 4. 格式化为两位数
    const formattedNumber = String(newNumber).padStart(CODE_CONFIG.lineNumberPadding, '0')

    // 5. 拼接最终代码
    return `${factorySuffix}-${LINE_CODE_INFIX}${formattedNumber}`
  }

  /**
   * 批量生成/同步产线代码
   */
  const handleGenerateLineCodes = async (factory: Factory) => {
    if (!factory.code) {
      message.error('工厂代码不存在，无法生成产线代码')
      return
    }

    const factorySuffix = parseFactoryCode(factory.code)
    const expectedPrefix = `${factorySuffix}-${LINE_CODE_INFIX}`

    // 检查是否有产线需要生成或同步代码
    const linesWithoutCode = factory.productionLines.filter(line => !line.code)
    const linesWithMismatchCode = factory.productionLines.filter(line => 
      line.code && !line.code.startsWith(expectedPrefix)
    )
    
    const totalLines = linesWithoutCode.length + linesWithMismatchCode.length
    
    if (totalLines === 0) {
      message.info('所有产线编码已是最新状态')
      return
    }

    Modal.confirm({
      title: `批量生成/同步产线代码`,
      width: 600,
      content: (
        <div>
          {linesWithoutCode.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                📝 需要生成代码的产线（{linesWithoutCode.length} 条）：
              </p>
              <ul style={{ maxHeight: 150, overflow: 'auto', marginTop: 8, marginLeft: 20 }}>
                {linesWithoutCode.map(line => (
                  <li key={line.id}>
                    {line.name} <span style={{ color: '#999' }}>(无代码)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {linesWithMismatchCode.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 'bold', color: '#1890ff' }}>
                🔄 需要同步代码的产线（{linesWithMismatchCode.length} 条）：
              </p>
              <ul style={{ maxHeight: 150, overflow: 'auto', marginTop: 8, marginLeft: 20 }}>
                {linesWithMismatchCode.map(line => (
                  <li key={line.id}>
                    {line.name} <span style={{ color: '#999' }}>({line.code} → {expectedPrefix}xx)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p style={{ marginTop: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <strong>共 {totalLines} 条产线需要处理</strong>
          </p>
          <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            ⚠️ 注意：同步操作会更新产线的代码前缀以匹配工厂代码 ({factory.code})
          </p>
        </div>
      ),
      okText: '确认处理',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true)
        try {
          let successCount = 0
          let failCount = 0

          const linesToUpdate = [...linesWithoutCode, ...linesWithMismatchCode]

          // 为每条产线生成并更新代码
          for (let i = 0; i < linesToUpdate.length; i++) {
            const line = linesToUpdate[i]
            
            // 重新获取最新的工厂数据（包含已更新的产线）
            const factoryResponse = await axios.get(`${API_BASE_URL}/api/factories/${factory.id}`)
            const latestFactory = factoryResponse.data.data
            
            // 生成新代码
            const newCode = generateLineCode(latestFactory)
            
            if (newCode) {
              try {
                // 更新产线代码
                await axios.put(`${API_BASE_URL}/api/factories/line/${line.id}`, {
                  code: newCode,
                  name: line.name,
                  type: line.type,
                  capacity: line.capacity,
                  status: line.status
                })
                successCount++
              } catch (error) {
                console.error(`Failed to update line ${line.id}:`, error)
                failCount++
              }
            }
          }

          // 刷新工厂数据
          await fetchFactories()
          
          if (failCount === 0) {
            message.success(`成功处理 ${successCount} 条产线`)
          } else {
            message.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
          }
        } catch (error: any) {
          message.error('批量处理失败：' + (error.response?.data?.message || error.message))
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // 打开产线日历配置
  const handleOpenCalendar = (line: ProductionLine) => {
    setSelectedLine(line)
    setCalendarDrawerOpen(true)
  }

  // 产线表格列定义
  const lineColumns = [
    {
      title: '产线代码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => code ? <span className="business-code">{code}</span> : '-'
    },
    {
      title: '产线名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 130,
    render: (type: any) => {
      const value = normalizeLineType(type)
      const option = LINE_TYPE_OPTIONS.find(o => o.value === value)
      return option ? option.label : '-'
    }
  },
    {
      title: '标准产能(件/月)',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 150,
      //align: 'right' as const,
      render: (capacity: number) => capacity.toLocaleString()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => renderStatusTag(status)
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: ProductionLine) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => handleOpenCalendar(record)}
          >
            排班/例外
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenLineModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此产线？"
            onConfirm={() => handleDeleteLine(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const normalizeLineType = (value: any): number | undefined => {
    const num = typeof value === 'number' ? value : parseInt(value ?? '', 10)
    return [0, 1].includes(num) ? num : undefined
  }

  // 获取所有唯一的产线类型
  const getUniqueTypes = () => {
    if (!selectedFactory) return []
    const types = selectedFactory.productionLines
      .map(line => normalizeLineType(line.type))
      .filter((type): type is number => type !== undefined)
    return Array.from(new Set(types))
  }

  // 过滤产线数据
  const getFilteredLines = () => {
    if (!selectedFactory) return []
    
    let filtered = selectedFactory.productionLines
    
    // 按类型筛选
    if (filterType !== undefined) {
      filtered = filtered.filter(line => normalizeLineType(line.type) === filterType)
    }
    
    // 按状态筛选
    if (filterStatus !== undefined) {
      filtered = filtered.filter(line => line.status === filterStatus)
    }
    
    return filtered
  }

  // 计算统计数据（基于筛选后的数据）
  const getStatistics = () => {
    const filteredLines = getFilteredLines()
    return {
      total: filteredLines.length,
      available: filteredLines.filter(l => l.status === STATUS_VALUE.AVAILABLE).length,
      unavailable: filteredLines.filter(l => l.status === STATUS_VALUE.UNAVAILABLE).length
    }
  }

  const stats = getStatistics()
  const filteredLines = getFilteredLines()
  
  // 清空筛选器
  const handleResetFilters = () => {
    setFilterType(undefined)
    setFilterStatus(undefined)
  }

  // 选择工厂并重置筛选器
  const handleSelectFactory = (factory: Factory) => {
    setSelectedFactory(factory)
    // 切换工厂时重置筛选器
    handleResetFilters()
  }

  /**
   * 统一渲染状态标签
   */
  const renderStatusTag = (status: number) => {
    const config = getStatusConfig(status)
    return (
      <Tag 
        bordered={false}
        style={{ 
          backgroundColor: config.bgColor, 
          color: config.textColor,
          fontWeight: 600,
          borderRadius: '4px',
          padding: '0 10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '24px',
          margin: 0
        }}
      >
        {config.label}
      </Tag>
    )
  }

  return (
    <div className="factory-management">
      <Row gutter={16}>
        {/* 左侧：工厂列表 */}
        <Col span={8}>
          <Card
            title={
              <Space>
                <BankOutlined />
                <span>工厂列表</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenFactoryModal()}
              >
                新建工厂
              </Button>
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: '12px' } }}
          >
            <List
              loading={loading}
              dataSource={factories}
              renderItem={(factory) => (
                <Card
                  hoverable
                  size="small"
                  className={`factory-card ${selectedFactory?.id === factory.id ? 'selected' : ''}`}
                  onClick={() => handleSelectFactory(factory)}
                  style={{
                    marginBottom: 12,
                    border: selectedFactory?.id === factory.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: selectedFactory?.id === factory.id ? '#e6f7ff' : 'white'
                  }}
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenFactoryModal(factory)
                      }}
                    >
                      编辑
                    </Button>,
                    factory.code && (
                      <Button
                        key="generate"
                        type="link"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateLineCodes(factory)
                        }}
                        style={{ color: '#fa8c16' }}
                      >
                        更新产线编码
                      </Button>
                    ),
                    <Popconfirm
                      key="delete"
                      title="确定删除此工厂及其所有产线？"
                      onConfirm={(e) => {
                        e?.stopPropagation()
                        handleDeleteFactory(factory.id)
                      }}
                      okText="确定"
                      cancelText="取消"
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    title={
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <Space>
                            <BankOutlined />
                            <span>{factory.name}</span>
                          </Space>
                          {renderStatusTag(factory.status)}
                        </div>
                        {factory.code ? (
                          <div className="mt-1">
                            <span className="business-code" style={{ fontSize: '11px', padding: '1px 4px' }}>
                              {factory.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-orange-500 mt-1">
                            未设置代码
                          </span>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        {factory.location && (
                          <div className="text-xs text-gray-500"> {factory.location}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          产线数: {factory.productionLines.length}
                          {factory.productionLines.some(line => !line.code) && (
                            <span className="text-orange-500 ml-2">
                              ({factory.productionLines.filter(line => !line.code).length} 条未编码)
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                </Card>
              )}
            />
          </Card>
        </Col>

        {/* 右侧：产线详情 */}
        <Col span={16}>
          <Card
            title={
              selectedFactory ? (
                <Space>
                  <SettingOutlined />
                  <span>{selectedFactory.name} - 产线管理</span>
                </Space>
              ) : (
                '产线管理'
              )
            }
            extra={
              selectedFactory && (
                <Space>
                  {selectedFactory.code && (
                    <Button
                      icon={<SettingOutlined />}
                      onClick={() => handleGenerateLineCodes(selectedFactory)}
                      style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
                    >
                      更新产线编码
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenLineModal()}
                  >
                    添加产线
                  </Button>
                </Space>
              )
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto' } }}
          >
            {selectedFactory ? (
              <>
                {/* 统计数据 */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card size="small" styles={{ body: { padding: '12px' } }}>
                      <Statistic 
                        title={<span style={{ fontWeight: 500, color: '#666' }}>总产线数</span>} 
                        value={stats.total} 
                        valueStyle={{ fontWeight: 'bold' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" styles={{ body: { padding: '12px' } }}>
                      <Statistic
                        title={renderStatusTag(STATUS_VALUE.AVAILABLE)}
                        value={stats.available}
                        valueStyle={{ color: getStatusConfig(STATUS_VALUE.AVAILABLE).textColor, fontWeight: 'bold' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" styles={{ body: { padding: '12px' } }}>
                      <Statistic
                        title={renderStatusTag(STATUS_VALUE.UNAVAILABLE)}
                        value={stats.unavailable}
                        valueStyle={{ color: getStatusConfig(STATUS_VALUE.UNAVAILABLE).textColor, fontWeight: 'bold' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 产线筛选器 */}
                <Card 
                  size="small" 
                  style={{ marginBottom: 16 }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  <Space size="middle" style={{ width: '100%' }} wrap>
                    <Space size="small">
                      <span className="text-gray-600">类型筛选：</span>
                      <Select
                        style={{ width: 180 }}
                        placeholder="全部类型"
                        allowClear
                        value={filterType}
                        onChange={setFilterType}
                        options={LINE_TYPE_OPTIONS}
                      />
                    </Space>

                    <Space size="small">
                      <span className="text-gray-600">状态筛选：</span>
                      <Select
                        style={{ width: 180 }}
                        placeholder="全部状态"
                        allowClear
                        value={filterStatus}
                        onChange={setFilterStatus}
                      >
                        {BASIC_DATA_STATUS.map(option => (
                          <Select.Option key={option.value} value={option.value}>
                            <Space size={8}>
                              <span 
                                style={{ 
                                  display: 'inline-block', 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  backgroundColor: option.themeColor 
                                }} 
                              />
                              {option.label}
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Space>

                    {(filterType !== undefined || filterStatus !== undefined) && (
                      <Button 
                        size="small" 
                        onClick={handleResetFilters}
                        icon={<DeleteOutlined />}
                      >
                        清除筛选
                      </Button>
                    )}

                    <span className="text-gray-500 text-sm ml-auto">
                      显示 {filteredLines.length} / {selectedFactory.productionLines.length} 条产线
                    </span>
                  </Space>
                </Card>

                {/* 产线表格 */}
                <Table
                  loading={loading}
                  dataSource={filteredLines}
                  columns={lineColumns}
                  rowKey="id"
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        description={
                          filterType || filterStatus 
                            ? "没有符合筛选条件的产线" 
                            : "暂无产线，点击上方按钮添加"
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )
                  }}
                />
              </>
            ) : (
              <Empty
                description="请从左侧选择工厂以管理产线"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 工厂编辑弹窗 */}
      <Modal
        title={editingFactory ? '编辑工厂' : '新建工厂'}
        open={factoryModalOpen}
        onOk={handleSaveFactory}
        onCancel={() => {
          setFactoryModalOpen(false)
          factoryForm.resetFields()
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={factoryForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="code"
            label="工厂代码"
            rules={[
              { required: true, message: '请输入工厂代码' },
              { max: CODE_CONFIG.factorySuffixMaxLength, message: `代码后缀不能超过${CODE_CONFIG.factorySuffixMaxLength}个字符` },
              { pattern: /^[A-Za-z0-9]+$/, message: '代码只能包含字母和数字' }
            ]}
            tooltip={
              editingFactory && editingFactory.productionLines && editingFactory.productionLines.length > 0
                ? "该工厂已有产线，不建议修改代码（会导致产线编码不一致）"
                : "系统将自动添加前缀 HJGS-"
            }
            extra={
              editingFactory && editingFactory.productionLines && editingFactory.productionLines.length > 0 && (
                <span style={{ color: '#fa8c16', fontSize: '12px' }}>
                  ⚠️ 修改工厂代码后，现有产线代码不会自动更新，可能导致编码不一致
                </span>
              )
            }
          >
            <Input 
              addonBefore={FACTORY_CODE_PREFIX}
              placeholder="请输入代码后缀，如：01 或 A" 
              maxLength={CODE_CONFIG.factorySuffixMaxLength}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="工厂名称"
            rules={[{ required: true, message: '请输入工厂名称' }]}
          >
            <Input placeholder="例如：北京工厂" />
          </Form.Item>
          <Form.Item name="location" label="位置/地址">
            <Input placeholder="例如：北京市朝阳区" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea
              rows={3}
              placeholder="工厂的主要业务描述"
              maxLength={200}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="工厂状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择工厂状态">
              {BASIC_DATA_STATUS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Space size={8}>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: option.themeColor 
                      }} 
                    />
                    {option.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 产线编辑弹窗 */}
      <Modal
        title={editingLine ? '编辑产线' : '添加产线'}
        open={lineModalOpen}
        onOk={handleSaveLine}
        onCancel={() => {
          setLineModalOpen(false)
          lineForm.resetFields()
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={lineForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="code"
            label="产线代码"
            tooltip={editingLine ? "产线代码不可修改" : "系统根据工厂代码自动生成"}
          >
            <Input 
              disabled
              placeholder="系统自动生成"
              style={{ 
                backgroundColor: '#f5f5f5',
                color: '#00000073',
                cursor: 'not-allowed'
              }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="产线名称"
            rules={[{ required: true, message: '请输入产线名称' }]}
          >
            <Input placeholder="例如：组装线A" />
          </Form.Item>
          <Form.Item name="type" label="产线类型" rules={[{ required: true, message: '请选择产线类型' }]}>
            <Select placeholder="请选择产线类型" options={LINE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="标准产能(件/月)"
            rules={[{ required: true, message: '请输入标准产能' }]}
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
              placeholder="标准日产能"
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="产线状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择产线状态">
              {BASIC_DATA_STATUS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Space size={8}>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: option.themeColor 
                      }} 
                    />
                    {option.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 产线日历配置 Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <CalendarOutlined />
            <span>产线日历配置 - {selectedLine?.name}</span>
          </div>
        }
        width="85%"
        open={calendarDrawerOpen}
        onClose={() => {
          setCalendarDrawerOpen(false)
          setSelectedLine(null)
        }}
        destroyOnHidden
      >
        {selectedLine && (
          <WorkCalendar 
            productionLineId={selectedLine.id} 
            productionLineName={selectedLine.name}
          />
        )}
      </Drawer>

      <style>{`
        .factory-card {
          transition: all 0.3s ease;
        }

        .factory-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .factory-card.selected {
          box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

export default FactoryManagement
