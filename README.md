<div align="center">

# 🚀 生产任务筹划系统

<p align="center">
  <strong>航天火箭复杂产品生产任务筹划与拆分管理系统</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Ant%20Design-5.x-0170fe?style=flat-square&logo=ant-design" alt="Ant Design">
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/Prisma-5.x-2d3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/SQLite-3.x-003b57?style=flat-square&logo=sqlite" alt="SQLite">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Version-v1.1.0-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js" alt="Node.js">
</p>

</div>

---

## 📑 目录

- [✨ 项目简介](#-项目简介)
- [🎯 核心特性](#-核心特性)
- [🛠️ 技术栈](#️-技术栈)
- [📂 项目结构](#-项目结构)
- [🎨 功能模块](#-功能模块)
- [💾 数据模型](#-数据模型)
- [🔌 API 接口](#-api-接口)
- [🚀 快速开始](#-快速开始)
- [📊 核心业务逻辑](#-核心业务逻辑)
- [⚙️ 配置说明](#️-配置说明)
- [⚠️ 注意事项](#️-注意事项)
- [📝 开发规范](#-开发规范)
- [📜 版本历史](#-版本历史)
- [📄 License](#-license)

---

## ✨ 项目简介

> 本系统专为**航天火箭**等复杂产品的生产拆分设计，支持订单管理、生产任务拆分、舱段级别的手动拆分配置。

采用**总-分两段式结构**：
- 🎯 总装步骤固定在第一位（使用任务产品）
- 🔧 舱段生产步骤可灵活配置（并行生产）
- 📋 支持分批创建、动态追踪、手动拆分

---

## 🎯 核心特性

<table>
<tr>
<td width="50%">

### 🎨 现代化UI
- ✅ Ant Design 5.x 组件库
- ✅ TailwindCSS 样式系统
- ✅ 响应式布局设计
- ✅ 深色主题支持

</td>
<td width="50%">

### ⚡ 高性能架构
- ✅ React 18 并发特性
- ✅ TypeScript 类型安全
- ✅ Prisma ORM 优化
- ✅ RESTful API 设计

</td>
</tr>
<tr>
<td width="50%">

### 📊 智能拆分
- ✅ 总-分两段式结构
- ✅ 第一步固定为总装
- ✅ 舱段步骤无序并行
- ✅ 动态数量追踪

</td>
<td width="50%">

### 🔒 数据安全
- ✅ Prisma 事务保证
- ✅ 数据一致性校验
- ✅ 防止超量拆分
- ✅ 完整的日志记录

</td>
</tr>
</table>

---

## 🛠️ 技术栈

### 前端技术

```
React 18         - 现代化UI框架
TypeScript 5     - 类型安全保障
Ant Design 5     - 企业级UI组件库
TailwindCSS      - 原子化CSS框架
Axios            - HTTP客户端
Day.js           - 日期处理库
Zustand          - 轻量级状态管理
```

### 后端技术

```
Express.js       - Node.js Web框架
Prisma           - 下一代ORM
SQLite           - 轻量级数据库
Swagger UI       - API文档生成
```

---

## 📂 项目结构

```
system/
├── 📁 backend/                 # 后端服务
│   ├── 📁 prisma/
│   │   ├── 📄 schema.prisma   # 数据库模型定义
│   │   └── 💾 dev.db          # SQLite 数据库文件
│   ├── 📁 src/
│   │   ├── 📁 routes/         # API 路由
│   │   │   ├── orderRoutes.js
│   │   │   ├── productionTaskRoutes.js
│   │   │   └── scheduleRoutes.js
│   │   ├── 📁 config/         # 配置文件
│   │   ├── 📄 prismaClient.js # Prisma 客户端
│   │   └── 📄 index.js        # 服务入口
│   └── 📄 package.json
│
├── 📁 frontend/                # 前端应用
│   ├── 📁 src/
│   │   ├── 📁 components/     # 通用组件
│   │   ├── 📁 pages/          # 页面组件
│   │   │   ├── 📁 BasicData/
│   │   │   └── 📁 SchedulingManagement/
│   │   ├── 📁 config/         # 配置文件
│   │   │   ├── dictionaries.ts  # 字典配置
│   │   │   └── menuConfig.ts    # 菜单配置
│   │   ├── 📁 store/          # 状态管理
│   │   └── 📄 App.tsx
│   └── 📄 package.json
│
└── 📄 README.md
```

---

## 🎨 功能模块

### 1️⃣ 基础数据管理

<details>
<summary><b>点击展开查看详情</b></summary>

| 模块 | 功能描述 |
|------|---------|
| 🗓️ **工作日历** | 管理工作日、节假日、调休配置 |
| 🏭 **工厂管理** | 工厂基本信息维护 |
| 🏗️ **产线管理** | 生产线配置（部装/整装）、日产能设置 |
| 📍 **工位管理** | 工位配置、能力关联 |
| 🔧 **设备管理** | 设备台账、维护记录 |
| 👥 **人员管理** | 员工信息、专业职级 |
| 👨‍👩‍👧‍👦 **班组管理** | 班组配置、能力关联 |

</details>

### 2️⃣ 产品工艺管理

<details>
<summary><b>点击展开查看详情</b></summary>

| 模块 | 功能描述 |
|------|---------|
| 📦 **产品管理** | 产品基本信息、类型分类 |
| 🛤️ **工艺路线管理** | 工艺路线配置（部装/总装） |
| ⚙️ **工序配置管理** | 标准工序库、标准工时 |

</details>

### 3️⃣ 生产调度管理 ⭐

#### 📋 销售订单管理 (OrderManagement.tsx)

```
✓ 创建销售订单（试制/销售预测/销售下单）
✓ 订单列表查询、筛选
✓ 订单统计展示
✓ 支持编辑、删除订单
```

#### 📝 生产订单管理 (TaskManagement.tsx)

```
✓ 从销售订单创建生产任务（三步向导）
✓ 动态任务数量追踪（scheduledQuantity 字段）
✓ 支持分批创建、补充创建
✓ 任务列表管理（待拆分/已拆分）
✓ 防止超量拆分
```

#### 🔧 生产订单拆分 (ScheduleManagement.tsx)

<table>
<tr>
<td width="33%">

**左侧栏**
```
📌 任务清单
└─ 显示待拆分任务
   (status=0)
```

</td>
<td width="33%">

**中间栏**
```
🎯 拆分配置
├─ 第一步：总装（固定）
└─ 其他步骤：舱段生产
   ├─ 弹窗选择产品
   ├─ 无执行顺序
   └─ 可自由删除
```

</td>
<td width="33%">

**右侧栏**
```
📊 配置摘要
├─ 步骤总数
├─ 舱段/总装统计
└─ 步骤清单
```

</td>
</tr>
</table>

**核心特性：**
- 🎯 总-分两段式结构（总装必须在舱段之后）
- 🔒 第一步固定为火箭总装，产品为任务关联产品
- 🔄 舱段步骤无序，可自由添加/删除
- ✅ 保存后任务状态变更为"已拆分"

#### 📅 生产计划制定
> 🚧 功能开发中...

#### 🧪 模拟排程评估
> 🚧 功能开发中...

#### 📈 排程结果展示
> 🚧 功能开发中...

---

## 💾 数据模型

### 核心表结构

#### 📋 Order (销售订单)

```typescript
{
  id: number                    // 主键
  code: string                  // 订单编号（唯一）
  name: string                  // 订单名称
  type: number                  // 订单类型（0=试制, 1=销售预测, 2=销售下单）
  productId: number             // 关联产品
  quantity: number              // 订单数量
  scheduledQuantity: number     // 已拆分数量
  deadline: Date                // 截止时间
  status: number                // 订单状态（0=待拆分, 1=拆分中, 2=生产中, 3=已完成, 4=已推迟）
}
```

#### 📝 ProductionTask (生产任务)

```typescript
{
  id: number                    // 主键
  code: string                  // 任务编号（自动生成，如 TASK-20250101-001）
  orderId: number               // 关联订单
  productId: number             // 关联产品
  quantity: number              // 任务数量（通常为1）
  status: number                // 任务状态（0=待拆分, 1=已拆分）
  priority: number              // 优先级（0-9）
  deadline: Date                // 截止时间
}
```

#### 🔧 ScheduleStep (拆分步骤)

```typescript
{
  id: number                    // 主键
  taskId: number                // 关联生产任务
  seq: number                   // 步骤序号（总装固定为1，其他步骤依次递增）
  type: number                  // 步骤类型（0=舱段生产, 1=火箭总装）
  productId: number             // 产品ID（type=1时为任务产品，type=0时为舱段产品）
  name: string                  // 步骤名称
  status: number                // 步骤状态（0=待执行, 1=执行中, 2=已完成）
}
```

---

## 🔌 API 接口

### 📋 订单相关

```http
GET    /api/orders           # 获取订单列表（支持筛选、分页）
POST   /api/orders           # 创建订单
PUT    /api/orders/:id       # 更新订单
DELETE /api/orders/:id       # 删除订单
```

### 📝 生产任务相关

```http
GET    /api/production-tasks               # 获取任务列表（支持状态筛选）
POST   /api/production-tasks/from-order    # 从订单创建任务
PUT    /api/production-tasks/:id           # 更新任务
DELETE /api/production-tasks/:id           # 删除任务
```

### 🔧 拆分步骤相关

```http
GET    /api/schedules/:taskId    # 获取任务的拆分步骤列表
POST   /api/schedules/:taskId    # 批量保存拆分步骤
DELETE /api/schedules/:taskId    # 删除任务的所有拆分步骤（任务状态恢复为待拆分）
```

---

## 🚀 快速开始

### 环境要求

- ![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js) Node.js >= 18
- ![npm](https://img.shields.io/badge/npm-latest-CB3837?style=flat-square&logo=npm) npm 或 yarn

### 📦 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### ▶️ 启动开发服务

```bash
# 启动后端服务（端口 3001）
cd backend
npm start

# 启动前端服务（端口 5173）
cd frontend
npm run dev
```

### 🌐 访问应用

| 服务 | 地址 | 说明 |
|------|------|------|
| 🎨 前端 | http://localhost:5173 | React应用 |
| 🔌 后端API | http://localhost:3001 | Express服务 |
| 📖 API文档 | http://localhost:3001/api-docs | Swagger UI |

### 🗄️ 数据库管理

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

---

## 📊 核心业务逻辑

### 🔄 订单到任务的流程

```mermaid
graph LR
    A[创建销售订单] --> B[生成生产任务]
    B --> C[任务拆分配置]
    C --> D[保存拆分结果]

    style A fill:#e1f5ff
    style B fill:#fff9c4
    style C fill:#f3e5f5
    style D fill:#c8e6c9
```

#### 1️⃣ 创建销售订单
在订单管理页面创建订单，指定产品和数量

#### 2️⃣ 生成生产任务
在生产订单管理页面从订单创建任务
- ✅ 支持部分创建（如订单 10 个，先创建 5 个任务）
- ✅ `scheduledQuantity` 自动追踪已创建数量
- ✅ 防止超量创建（不能超过 `order.quantity`）

#### 3️⃣ 任务拆分
在生产订单拆分页面配置生产步骤
- 🎯 第一步自动生成总装步骤（使用任务产品，不可删除）
- 📦 通过弹窗选择舱段产品，添加舱段生产步骤
- 🔄 舱段步骤之间无执行顺序（并行生产）
- ✅ 保存后任务状态变为"已拆分"

### 💡 关键设计决策

#### ✅ 方案 A: 动态任务数量追踪（已采用）

- 订单添加 `scheduledQuantity` 字段追踪已创建任务数
- 创建/删除任务时通过事务更新计数
- 只显示 `scheduledQuantity < quantity` 的订单
- 支持分批创建和后续补充

#### ❌ 替代方案（未采用）

- **方案 B**: 订单状态锁定 → 过于严格，不灵活
- **方案 C**: 任务完成追溯 → 属于执行系统，非筹划系统
- **方案 D**: BOM 组件追踪 → 过度设计，无法满足手动拆分需求

---

## ⚙️ 配置说明

### 📚 字典配置

所有基础数据的**唯一真理源**位于 `frontend/src/config/dictionaries.ts`：

```typescript
// 订单类型
ORDER_TYPE_OPTIONS

// 订单状态
ORDER_STATUS_OPTIONS

// 生产任务状态
PRODUCTION_TASK_STATUS_OPTIONS

// 工序类型
PROCESS_TYPE_OPTIONS

// 设备类型
DEVICE_TYPE_OPTIONS

// ... 等等
```

> ⚠️ **禁止在组件内硬编码状态文本或配置！**

### 🍔 菜单配置

菜单结构配置位于 `frontend/src/config/menuConfig.ts`

---

## ⚠️ 注意事项

### 1️⃣ Prisma Client 生成问题

如果后端服务正在运行，`npx prisma generate` 可能失败（文件被占用），需先停止服务。

### 2️⃣ 数据一致性

创建/删除任务使用 Prisma 事务确保 `scheduledQuantity` 准确性。

### 3️⃣ 拆分步骤结构

- 🎯 第一步固定为总装步骤，使用任务关联的产品，不可删除
- 📦 其他步骤为舱段生产步骤，添加时通过弹窗选择产品
- 🔄 舱段步骤可以自由添加和删除

### 4️⃣ 总-分两段式设计

总装必须在所有舱段生产完成后执行（业务逻辑层面），但舱段之间可并行生产。

---

## 📝 开发规范

### 前端规范

```
✓ 使用 TypeScript 严格模式
✓ 遵循 Ant Design 5.x 组件规范
✓ 状态文本统一从字典获取
✓ 业务代码（编号）使用 .business-code 样式类
```

### 后端规范

```
✓ API 响应统一格式: { status: 'ok'|'error', data?: any, message?: string }
✓ 涉及多表操作使用 Prisma 事务
✓ 错误处理返回具体错误信息
✓ Swagger 注释完整
```

---

## 📜 版本历史

### 🎉 v1.1.0 (2025-12-29)

- ✅ 优化生产订单拆分逻辑为总-分两段式结构
- ✅ 统一术语：排程 → 拆分
- ✅ 第一步固定为总装，舱段步骤无序
- ✅ 优化添加舱段流程（弹窗选择产品）
- ✅ 修复工位能力页签工序类型显示问题

### 🚀 v1.0.0 (2025-01-29)

- ✅ 基础数据管理模块
- ✅ 产品工艺管理模块
- ✅ 销售订单管理
- ✅ 生产订单管理（动态数量追踪）
- ✅ 生产订单拆分（三栏布局、手动配置）

---

## 📄 License

本项目采用 [MIT](LICENSE) 许可证。

---

## 📮 联系方式

如有问题或建议，请提交 [Issue](https://github.com/yourusername/task-planning-system/issues)。

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！ ⭐**

Made with ❤️ by Your Team

</div>
