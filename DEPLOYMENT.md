# 离线部署指南

本系统完全支持**离线环境部署**，无需互联网连接即可正常运行。

## 系统架构

- **前端**: React + Vite + Ant Design 5
- **后端**: Node.js + Express + Prisma
- **数据库**: SQLite (文件数据库，无需额外服务)

## 部署前准备

### 需要的文件
1. 整个项目目录
2. Node.js 运行环境（v18+ 推荐）

## 离线部署步骤

### 1. 前端部署

#### 开发环境（带热更新）
```bash
cd frontend
npm install    # 首次需要联网安装依赖
npm run dev    # 启动开发服务器，访问 http://localhost:5173
```

#### 生产环境（静态文件部署）
```bash
cd frontend
npm run build  # 构建生产版本

# 构建产物在 dist/ 目录，可以使用任何静态文件服务器
# 方式1: 使用 Node.js 静态服务器
npx serve dist -p 5173

# 方式2: 使用 nginx 等 Web 服务器
# 将 dist/ 目录内容复制到 nginx 的 html 目录
```

### 2. 后端部署

```bash
cd backend
npm install          # 首次需要联网安装依赖
npx prisma db push   # 同步数据库结构
npm start            # 启动后端服务，监听 http://localhost:3001
```

### 3. 数据库初始化

SQLite 数据库文件位于：`backend/dev.db`
- 首次运行会自动创建
- 无需额外安装数据库服务
- 数据文件可直接复制迁移

## 离线运行验证

### ✅ 已验证的离线特性

1. **前端资源完全本地化**
   - ✅ 所有 JavaScript 和 CSS 打包到本地文件
   - ✅ 无 CDN 依赖
   - ✅ 字体使用系统字体，不依赖网络下载
   - ✅ 图标库（@ant-design/icons）打包到本地

2. **后端无外部依赖**
   - ✅ 无外部 API 调用
   - ✅ 无网络服务依赖
   - ✅ SQLite 文件数据库，无需网络连接

3. **完整的构建产物**
   ```
   frontend/dist/
   ├── index.html              # 入口HTML
   ├── assets/
   │   ├── index-*.js         # 所有JS代码（2.6MB）
   │   └── index-*.css        # 所有CSS样式（20KB）
   └── vite.svg               # 图标
   ```

## 生产环境配置建议

### 前端配置

修改 `frontend/src/pages/*/` 中的 API 地址为实际部署地址：
```typescript
const API_BASE_URL = 'http://your-backend-server:3001';
```

或者使用环境变量：
```bash
# .env.production
VITE_API_BASE_URL=http://your-backend-server:3001
```

### 后端配置

修改 `backend/.env`：
```env
DATABASE_URL="file:./dev.db"
PORT=3001
```

## 离线环境迁移步骤

1. **打包依赖（联网环境）**
   ```bash
   # 在有网络的环境下载所有依赖
   cd frontend && npm install
   cd ../backend && npm install

   # 将整个项目打包
   tar -czf system.tar.gz system/
   ```

2. **部署到离线环境**
   ```bash
   # 解压项目
   tar -xzf system.tar.gz
   cd system

   # 启动后端
   cd backend && npm start &

   # 启动前端（生产模式）
   cd ../frontend && npx serve dist -p 5173
   ```

3. **访问系统**
   - 前端：http://localhost:5173
   - 后端：http://localhost:3001
   - API文档：http://localhost:3001/api-docs

## 系统要求

### 最低配置
- CPU: 2核
- 内存: 2GB
- 硬盘: 1GB 可用空间
- 操作系统: Windows / Linux / macOS

### 推荐配置
- CPU: 4核+
- 内存: 4GB+
- 硬盘: 5GB+ 可用空间

## 数据备份

```bash
# 备份数据库
cp backend/dev.db backend/dev.db.backup

# 或使用日期标记
cp backend/dev.db backend/dev.db.$(date +%Y%m%d)
```

## 故障排查

### 前端无法访问后端
- 检查后端是否启动：`curl http://localhost:3001/api/health`
- 检查防火墙设置
- 检查前端 API_BASE_URL 配置

### 数据库连接失败
- 确认 `backend/dev.db` 文件存在
- 运行 `npx prisma db push` 同步数据库结构
- 检查文件权限

### 端口被占用
```bash
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

## 性能优化建议

1. **生产环境使用构建版本**
   - 前端使用 `npm run build` 构建的静态文件
   - 文件体积更小，加载更快

2. **启用 gzip 压缩**
   - Nginx 配置 gzip
   - 可减少 70% 传输数据

3. **数据库优化**
   - 定期备份和清理
   - 建立合适的索引

## 版本信息

- 前端版本: 1.0.0
- 后端版本: 1.0.0
- Node.js: v18+
- 构建时间: 2025-12-28
