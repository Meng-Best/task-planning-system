# 生产任务筹划系统

一个基于 React + Express + Prisma 的航天产品生产任务筹划与排程管理系统。

## 项目简介

本系统专为航天火箭等复杂产品的生产排程设计，支持订单管理、生产任务拆分、舱段级别的手动排程配置。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **UI 组件库**: Ant Design 5.x
- **样式**: TailwindCSS
- **HTTP 客户端**: Axios
- **日期处理**: Day.js
- **状态管理**: Zustand

### 后端
- **框架**: Express.js
- **数据库**: SQLite
- **ORM**: Prisma
- **API 文档**: Swagger UI

## 项目结构

```
system/
├── backend/                 # 后端服务
│   ├── prisma/
│   │   ├── schema.prisma   # 数据库模型定义
│   │   └── dev.db          # SQLite 数据库文件
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── config/         # 配置文件
│   │   ├── prismaClient.js # Prisma 客户端
│   │   └── index.js        # 服务入口
│   └── package.json
│
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面组件
│   │   ├── config/         # 配置文件（字典、菜单）
│   │   ├── store/          # 状态管理
│   │   └── App.tsx
│   └── package.json
│
└── README.md
```

## 功能模块

### 1. 基础数据管理
- **工作日历**: 管理工作日、节假日、调休配置
- **工厂管理**: 工厂基本信息维护
- **产线管理**: 生产线配置（部装/整装）、日产能设置
- **工位管理**: 工位配置、能力关联
- **设备管理**: 设备台账、维护记录
- **人员管理**: 员工信息、专业职级
- **班组管理**: 班组配置、能力关联

### 2. 产品工艺管理
- **产品管理**: 产品基本信息、类型分类
- **工艺路线管理**: 工艺路线配置（部装/总装）
- **工序配置管理**: 标准工序库、标准工时

### 3. 生产调度管理

#### 3.1 销售订单管理 (OrderManagement.tsx)
- 创建销售订单（试制/销售预测/销售下单）
- 订单列表查询、筛选
- 订单统计展示（试制订单、销售预测、销售下单）
- 支持编辑、删除订单

#### 3.2 生产订单管理 (TaskManagement.tsx)
- 从销售订单创建生产任务（三步向导）
- 动态任务数量追踪（scheduledQuantity 字段）
- 支持分批创建、补充创建
- 任务列表管理（待排程/排程中）
- 防止超量排程

#### 3.3 生产订单拆分 (ScheduleManagement.tsx)
**三栏布局设计：**
- **左侧**：待排程任务列表（status=0）
- **中间**：任务拆分配置
  - 添加舱段生产步骤
  - 手动选择舱段产品
  - 上下移动按钮调整执行顺序
  - 支持总装步骤配置
- **右侧**：配置摘要
  - 显示步骤总数
  - 舱段/总装统计
  - 执行顺序预览

**核心特性：**
- 每次拆分独立配置（无预设规则）
- 完全自由调整顺序（非流水线模式）
- 保存后任务状态变更为"排程中"

#### 3.4 生产计划制定
- 功能开发中...

#### 3.5 模拟排程评估
- 功能开发中...

#### 3.6 排程结果展示
- 功能开发中...

## 数据模型

### 核心表结构

#### Order (销售订单)
- id: 主键
- code: 订单编号（唯一）
- name: 订单名称
- type: 订单类型（0=试制, 1=销售预测, 2=销售下单）
- productId: 关联产品
- quantity: 订单数量
- scheduledQuantity: 已排程数量
- deadline: 截止时间
- status: 订单状态（0=待排程, 1=排程中, 2=生产中, 3=已完成, 4=已推迟）

#### ProductionTask (生产任务)
- id: 主键
- code: 任务编号（自动生成，如 TASK-20250101-001）
- orderId: 关联订单
- productId: 关联产品
- quantity: 任务数量（通常为1）
- status: 任务状态（0=待排程, 1=排程中）
- priority: 优先级（0-9）
- deadline: 截止时间

#### ScheduleStep (排程步骤)
- id: 主键
- taskId: 关联生产任务
- seq: 步骤序号（执行顺序）
- type: 步骤类型（0=舱段生产, 1=总装）
- productId: 舱段产品ID（type=0时必填）
- name: 步骤名称
- status: 步骤状态（0=待执行, 1=执行中, 2=已完成）

## API 接口

### 订单相关
- GET /api/orders - 获取订单列表（支持筛选、分页）
- POST /api/orders - 创建订单
- PUT /api/orders/:id - 更新订单
- DELETE /api/orders/:id - 删除订单

### 生产任务相关
- GET /api/production-tasks - 获取任务列表（支持状态筛选）
- POST /api/production-tasks/from-order - 从订单创建任务
- PUT /api/production-tasks/:id - 更新任务
- DELETE /api/production-tasks/:id - 删除任务

### 排程步骤相关
- GET /api/schedules/:taskId - 获取任务的排程步骤列表
- POST /api/schedules/:taskId - 批量保存排程步骤
- DELETE /api/schedules/:taskId - 删除任务的所有排程步骤

## 快速开始

### 环境要求
- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 启动开发服务

```bash
# 启动后端服务（端口 3001）
cd backend
npm start

# 启动前端服务（端口 5173）
cd frontend
npm run dev
```

### 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001
- API 文档: http://localhost:3001/api-docs

## 数据库管理

```bash
# 进入后端目录
cd backend

# 同步数据库结构（开发环境）
npx prisma db push

# 生成 Prisma Client
npx prisma generate

# 打开数据库可视化界面
npx prisma studio
```

## 核心业务逻辑

### 订单到任务的流程

1. **创建销售订单**: 在订单管理页面创建订单，指定产品和数量
2. **生成生产任务**: 在生产订单管理页面从订单创建任务
   - 支持部分创建（如订单 10 个，先创建 5 个任务）
   - scheduledQuantity 自动追踪已创建数量
   - 防止超量创建（不能超过 order.quantity）
3. **任务拆分**: 在生产订单拆分页面配置生产步骤
   - 手动选择舱段产品
   - 自由调整执行顺序
   - 保存后任务状态变为"排程中"

### 关键设计决策

**方案 A: 动态任务数量追踪**
- 订单添加 scheduledQuantity 字段追踪已创建任务数
- 创建/删除任务时通过事务更新计数
- 只显示 scheduledQuantity < quantity 的订单
- 支持分批创建和后续补充

**替代方案（未采用）：**
- 方案 B: 订单状态锁定（过于严格，不灵活）
- 方案 C: 任务完成追溯（属于执行系统，非筹划系统）
- 方案 D: BOM 组件追踪（过度设计，无法满足手动拆分需求）

## 注意事项

1. **Prisma Client 生成问题**: 如果后端服务正在运行，npx prisma generate 可能失败（文件被占用），需先停止服务
2. **数据一致性**: 创建/删除任务使用 Prisma 事务确保 scheduledQuantity 准确性
3. **排程步骤验证**: 保存排程前必须为所有舱段步骤选择产品
4. **至少一个总装步骤**: 删除步骤时系统会保留至少一个总装步骤

## 字典配置

所有基础数据的"唯一真理源"位于 frontend/src/config/dictionaries.ts：
- 订单类型 (ORDER_TYPE_OPTIONS)
- 订单状态 (ORDER_STATUS_OPTIONS)
- 生产任务状态 (PRODUCTION_TASK_STATUS_OPTIONS)
- 工序类型 (PROCESS_TYPE_OPTIONS)
- 设备类型 (DEVICE_TYPE_OPTIONS)
- 等等...

**禁止在组件内硬编码状态文本或配置！**

## 开发规范

### 前端
- 使用 TypeScript 严格模式
- 遵循 Ant Design 5.x 组件规范
- 状态文本统一从字典获取
- 业务代码（编号）使用 .business-code 样式类

### 后端
- API 响应统一格式: { status: 'ok'|'error', data?: any, message?: string }
- 涉及多表操作使用 Prisma 事务
- 错误处理返回具体错误信息
- Swagger 注释完整

## 版本历史

### v1.0.0 (2025-01-29)
- ✅ 基础数据管理模块
- ✅ 产品工艺管理模块
- ✅ 销售订单管理
- ✅ 生产订单管理（动态数量追踪）
- ✅ 生产订单拆分（三栏布局、手动配置）

## License

MIT

## 联系方式

如有问题或建议，请提交 Issue。
