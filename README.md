# 任务筹划系统 (Personal Task Planning System)

这是一个为总装工厂设计的生产任务筹划与基础数据管理系统。系统采用前后端分离架构，支持离线部署，旨在提供高效的资源管理和任务调度能力。

## 🚀 核心功能

### 1. 工作台 (Dashboard)
- **数据可视化**: 使用 ECharts 展示设备状态、工厂占用率、产线负荷等核心指标。
- **趋势分析**: 实时监控生产资源的变化趋势。
- **瓶颈识别**: 通过热力图识别生产流程中的潜在瓶颈。

### 2. 基础数据管理 (Basic Data)
- **工厂与产线**: 管理物理工厂及其内部的生产线配置。
- **工位与设备**: 细化到最小生产单元，管理设备台账及维护记录。
- **人员与班组**: 组织架构管理，支持班组长任命及成员分配。
- **工作日历**: 支持全局及产线级别的节假日、调休配置。

### 3. 任务中心 (Task Center)
- **任务管理**: 完整的任务 CRUD 功能，支持优先级、状态跟踪及截止日期提醒。
- **多维筛选**: 按状态、优先级等维度快速定位任务。

---

## 🛠 技术架构

### 前端 (Frontend)
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI 组件**: Ant Design 5
- **样式**: Tailwind CSS
- **状态管理**: Zustand (用于多标签页及全局状态)
- **图表**: ECharts

### 后端 (Backend)
- **运行环境**: Node.js (v18+)
- **框架**: Express.js
- **ORM**: Prisma
- **数据库**: SQLite (本地文件数据库，无需安装服务)
- **文档**: Swagger (OpenAPI 3.0)

---

## 📦 快速开始

### 1. 克隆与安装
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 后端配置
1. 在 `backend` 目录下创建 `.env` 文件（可参考 `env.template`）：
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   PORT=3001
   ```
2. 初始化数据库：
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name init
   ```

### 3. 启动项目
```bash
# 启动后端 (http://localhost:3001)
cd backend
npm run dev

# 启动前端 (http://localhost:5173)
cd frontend
npm run dev
```

---

## 📂 项目结构

```text
system/
├── backend/                # 后端代码
│   ├── prisma/             # 数据库模型与迁移
│   ├── src/
│   │   ├── controllers/    # 业务逻辑
│   │   ├── routes/         # API 路由
│   │   └── index.js        # 入口文件
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面视图
│   │   ├── store/          # 状态管理
│   │   └── config/         # 菜单与业务配置
└── README.md               # 项目文档
```

---

## 📖 API 文档
启动后端后，访问 [http://localhost:3001/api-docs](http://localhost:3001/api-docs) 查看完整的 Swagger 接口文档。

## ⚠️ 注意事项
- **离线部署**: 系统设计考虑了 Windows Server 2016 离线环境，Prisma 已配置 `binaryTargets`。
- **数据库**: SQLite 数据库文件位于 `backend/prisma/dev.db`，请定期备份该文件。
- **代理配置**: 前端开发环境已配置代理，所有 `/api` 请求会自动转发至后端。

---

## 📅 后续开发计划
- [ ] 完善任务排程算法
- [ ] 增加数据导入/导出功能 (Excel)
- [ ] 强化设备维护提醒系统
- [ ] 增加系统操作日志
