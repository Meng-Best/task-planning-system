# 项目技术架构文档

**项目名称**: 个人任务筹划系统 (Personal Task Planning System)  
**版本**: 1.0.0  
**目标环境**: Windows Server 2016 (支持离线部署)  
**架构模式**: 前后端分离

---

## 1. 技术栈清单 (Tech Stack)

### 后端 (Backend)
- **语言**: Node.js (v18+)
- **核心框架**: Express.js v4.21.1
- **ORM**: Prisma v5.22.0
- **数据库**: SQLite (本地文件数据库)
- **关键依赖**:
  - `@prisma/client` - Prisma ORM 客户端
  - `cors` v2.8.5 - 跨域中间件
  - `dotenv` v16.4.5 - 环境变量管理
  - `nodemon` v3.1.7 - 开发环境热重载

**注意事项**:
- Prisma 配置了 `binaryTargets = ["native", "windows"]` 以支持 Windows Server 2016 部署
- 数据库文件路径: `backend/prisma/dev.db`

### 前端 (Frontend)
- **核心框架**: React 18.3.1 + TypeScript 5.6.2
- **构建工具**: Vite 6.0.1
- **UI 组件库**: Ant Design 5.22.2 + Ant Design Icons 5.5.1
- **CSS 框架**: Tailwind CSS 3.4.15
- **状态管理**: Zustand 5.0.1 (轻量级状态管理)
- **HTTP 请求**: Vite 内置代理 (开发环境)

**前端特性**:
- TypeScript 严格模式
- Ant Design 中文国际化 (zh_CN)
- 热模块替换 (HMR)
- 响应式设计

### 数据库与存储
- **数据库类型**: SQLite 3
- **存储位置**: `backend/prisma/dev.db`
- **迁移管理**: Prisma Migrate
- **数据表**:
  - `tasks` - 任务表
  - `projects` - 项目表

---

## 2. 项目目录结构 (Project Structure)

```
system/
├── backend/                    # 后端服务
│   ├── prisma/
│   │   ├── dev.db             # SQLite 数据库文件
│   │   ├── schema.prisma      # Prisma 数据模型定义
│   │   └── migrations/        # 数据库迁移记录
│   ├── src/
│   │   └── index.js           # Express 服务入口
│   ├── .env                   # 环境变量配置 (需手动创建)
│   ├── env.template           # 环境变量模板
│   └── package.json
│
└── frontend/                   # 前端应用
    ├── public/
    │   └── images/            # 静态图片资源
    ├── src/
    │   ├── components/
    │   │   ├── Layout/        # 布局组件 (TopBanner, LeftSidebar, MainContent)
    │   │   └── PageView/      # 页面视图组件
    │   ├── config/
    │   │   └── menuConfig.ts  # 菜单配置
    │   ├── store/
    │   │   └── useTabStore.ts # Zustand 标签页状态管理
    │   ├── App.tsx            # 根组件
    │   ├── main.tsx           # 应用入口
    │   └── index.css          # 全局样式
    ├── vite.config.ts         # Vite 配置 (包含代理配置)
    ├── tailwind.config.js     # Tailwind 配置
    └── package.json
```

### 核心目录说明

| 目录 | 作用 |
|------|------|
| `backend/src/` | 后端业务逻辑与 API 路由 |
| `backend/prisma/` | 数据库模型、迁移文件、SQLite 文件 |
| `frontend/src/components/Layout/` | 全局布局组件（顶部栏、侧边栏、主内容区） |
| `frontend/src/store/` | Zustand 全局状态管理 |
| `frontend/src/config/` | 前端配置文件（菜单配置等） |

---

## 3. 开发规范与交互 (Conventions)

### API 风格
- **接口风格**: RESTful API
- **Base URL**: `http://localhost:3001/api`
- **前端代理**: Vite 配置了 `/api` 前缀自动代理到后端

### 统一返回数据结构

**成功响应示例** (来自 `/api/health`):
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-12-18T10:51:21.415Z"
}
```

**错误响应示例**:
```json
{
  "status": "error",
  "message": "Server is running but database connection failed",
  "database": "disconnected",
  "error": "具体错误信息",
  "timestamp": "2025-12-18T10:51:21.415Z"
}
```

### 鉴权机制
**当前状态**: 无鉴权  
**原因**: 系统设计为个人本地使用，无需登录/注册逻辑

**未来扩展建议**: 如需多用户支持，可引入 JWT 或 Session 机制

### 前端路由策略
- **导航方式**: 基于 Zustand 的标签页管理
- **无传统路由**: 不使用 React Router，而是通过 `useTabStore` 管理多标签页状态
- **页面切换**: 点击左侧菜单 → 在右侧标签栏打开新标签页 → 切换显示内容

### 数据模型

**Task 表结构**:
```typescript
{
  id: number           // 主键
  name: string         // 任务名称
  title?: string       // 任务标题
  description?: string // 描述
  status: string       // 状态 (默认 "pending")
  priority: number     // 优先级 (默认 0)
  dueDate?: Date       // 截止日期
  createdAt: Date      // 创建时间
  updatedAt: Date      // 更新时间
}
```

**Project 表结构**:
```typescript
{
  id: number           // 主键
  name: string         // 项目名称
  description?: string // 描述
  color?: string       // 颜色标识
  createdAt: Date      // 创建时间
  updatedAt: Date      // 更新时间
}
```

---

## 4. 环境配置与启动

### 后端启动步骤

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量（首次运行）
copy env.template .env
# 编辑 .env，确保 DATABASE_URL="file:./dev.db"

# 4. 生成 Prisma Client
npm run db:generate

# 5. 应用数据库迁移（首次运行）
npx prisma migrate dev

# 6. 启动开发服务器
npm run dev
# 服务将运行在 http://localhost:3001

# 7. （可选）打开 Prisma Studio 可视化管理数据库
npm run db:studio
```

**生产环境启动**:
```bash
npm start
```

### 前端启动步骤

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 前端将运行在 http://localhost:5173

# 4. 构建生产版本
npm run build
# 输出目录: dist/
```

### 端口配置
| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 3001 | Express 服务器 |
| 前端开发服务器 | 5173 | Vite 开发服务器 |
| Prisma Studio | 5555 | 数据库可视化工具 |

---

## 5. 核心功能模块

### 前端布局系统
- **TopBanner**: 顶部横幅（80px 高度，紫色渐变背景）
  - 左侧：Logo + 系统标题
  - 背景：装饰性图案
  
- **LeftSidebar**: 左侧导航栏（230px 宽度，可折叠）
  - 多级菜单导航
  - 淡紫色渐变背景
  - 底部公司标识区域
  
- **MainContent**: 右侧主内容区
  - 顶部标签栏（支持多标签页切换）
  - 标签页管理（打开、关闭、切换）
  - 内容视图容器

### 状态管理 (Zustand)
**useTabStore** - 标签页状态管理:
- `activeTab`: 当前激活的标签
- `openedTabs`: 已打开的标签列表
- `addTab()`: 添加/激活标签页
- `removeTab()`: 关闭标签页
- `closeOtherTabs()`: 关闭其他标签
- `closeAllTabs()`: 关闭所有标签

---

## 6. 已实现的 API 接口

### `GET /api/health`
**用途**: 健康检查 + 数据库连接测试

**响应**:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-12-18T10:51:21.415Z"
}
```

### `GET /`
**用途**: API 基本信息

**响应**:
```json
{
  "name": "Task Planning System API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health"
  }
}
```

---

## 7. 开发注意事项

### Windows Server 2016 部署要点
1. **Prisma 二进制文件**: 已配置 `binaryTargets = ["native", "windows"]`
2. **SQLite 本地存储**: 无需安装数据库服务，数据文件随应用部署
3. **Node.js 版本**: 建议 v18 LTS 或更高版本
4. **离线部署**: 所有依赖需提前打包到 `node_modules`

### 前端构建与部署
```bash
# 构建生产版本
npm run build

# 输出目录结构
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── images/
```

**部署建议**: 可使用 Nginx 或 IIS 托管 `dist/` 目录

### 数据库备份
```bash
# 备份 SQLite 数据库
copy backend\prisma\dev.db backend\prisma\dev.db.backup

# 或使用 Prisma Studio 导出数据
npm run db:studio
```

---

## 8. 后续开发建议

### 待实现功能
- [ ] 任务 CRUD API 接口
- [ ] 项目管理 API 接口
- [ ] 前端任务管理页面
- [ ] 数据筛选与搜索
- [ ] 数据导入/导出功能

### 技术债务
- [ ] 添加单元测试 (Jest + React Testing Library)
- [ ] API 接口文档 (Swagger/OpenAPI)
- [ ] 错误日志系统
- [ ] 数据验证中间件 (Zod/Joi)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-18  
**维护者**: 项目架构师

