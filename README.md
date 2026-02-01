# 债权公告发布助手 📄✨

一个简单的债权公告文件发布系统，支持管理员上传PDF文件生成访问链接和二维码，用户通过链接在线预览和下载。

## ✨ 功能特点

**管理端** 💼
- 🔐 密码登录，支持"记住我"7天有效
- 📤 拖拽上传PDF文件（最大50MB）
- 📋 查看PDF列表、二维码、复制链接
- 🗑️ 删除不需要的文件

**用户端** 👥
- 👁️ 在线预览PDF（支持桌面和移动端）
- ⬇️ 下载PDF到本地
- 📱 移动端支持手势操作

## 🛠️ 技术栈

- **后端**：Node.js + Express + TypeScript + Supabase数据库 + 阿里云OSS
- **管理端**：React + Vite + Ant Design
- **用户端**：React + Vite + PDF.js

## 🚀 快速开始

### 📋 前置要求

- ✅ Node.js >= 18
- ✅ npm >= 9
- ✅ 阿里云OSS账号（存储文件）
- ✅ Supabase账号（数据库）

### 1️⃣ 准备工作

#### 配置阿里云OSS ☁️

1. 访问 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 创建Bucket，设置权限为"公共读"
3. 获取以下信息：
   - `region`：地域（如 `oss-cn-hangzhou`）
   - `bucket`：Bucket名称
   - `accessKeyId` 和 `accessKeySecret`：在AccessKey管理中创建

#### 配置Supabase数据库 🗄️

1. 访问 [Supabase官网](https://supabase.com/) 注册并创建项目
2. 获取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（在项目设置中）
3. 在SQL编辑器中执行以下SQL创建数据表：

```sql
-- PDF元数据表
CREATE TABLE pdfs (
  id BIGSERIAL PRIMARY KEY,
  unique_id VARCHAR(8) UNIQUE NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  oss_url TEXT NOT NULL,
  qrcode_base64 TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 审计日志表
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  pdf_id BIGINT REFERENCES pdfs(id),
  username VARCHAR(100),
  ip VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_pdfs_unique_id ON pdfs(unique_id);
CREATE INDEX idx_pdfs_is_active ON pdfs(is_active);
```

### 2️⃣ 安装项目

```bash
# 克隆项目
git clone <your-repo-url>
cd pdf-demo

# 安装依赖
npm install
```

### 3️⃣ 配置环境变量 ⚙️

**后端配置 (`server/.env`)** 🔧

创建 `server/.env` 文件：

```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 认证配置
# 生成密码hash: cd server && npx tsx scripts/generate-password.ts 你的密码
ADMIN_PASSWORD_HASH=生成的bcrypt_hash
JWT_SECRET=your-random-jwt-secret-key-min-32-chars
SESSION_SECRET=your-random-session-secret-key-min-32-chars

# CORS配置
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# 阿里云OSS配置
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret

# Supabase数据库配置
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# 域名配置（生成访问链接用）
DOMAIN=http://localhost:5174

# 文件上传限制
MAX_FILE_SIZE=52428800
```

**管理端配置 (`admin/.env`)** 📝

```bash
VITE_API_URL=http://localhost:3001
VITE_DOMAIN=http://localhost:5174
VITE_ADMIN_PASSWORD=Admin123
```

**用户端配置 (`viewer/.env`)** 📝

```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 4️⃣ 生成管理员密码hash 🔑

```bash
cd server
npx tsx scripts/generate-password.ts Admin123
```

将生成的hash复制到 `server/.env` 的 `ADMIN_PASSWORD_HASH`。

### 5️⃣ 启动项目 ▶️

**Windows一键启动（推荐）** 🖥️

双击 `start.bat`，或在命令行执行：

```bash
start.bat
```

**手动启动** 🛠️

打开三个终端窗口：

```bash
# 终端1：启动后端服务（端口 3001）
cd server
npm run dev

# 终端2：启动管理端（端口 5173）
cd admin
npm run dev

# 终端3：启动用户端（端口 5174）
cd viewer
npm run dev
```

**根目录启动** 🏠

```bash
npm run dev
```

### 6️⃣ 访问应用 🌐

- **管理端**：http://localhost:5173
  - 密码：Admin123

- **用户端**：http://localhost:5174/view/{uniqueId}
  - 通过管理端生成的链接访问

- **后端API**：http://localhost:3001

### 停止项目 🛑

```bash
# 批处理方式
stop.bat

# PowerShell方式（推荐）
stop.ps1
```

## 📖 使用说明

### 管理端使用 💼

1. 访问 http://localhost:5173
2. 输入密码登录（默认：Admin123）
3. 拖拽PDF文件到上传区域 📤
4. 等待上传完成，查看生成的二维码和链接
5. 点击"复制链接"或"下载二维码"分享给用户

### 用户端使用 👥

1. 通过扫描二维码或点击链接访问
2. 在线预览PDF内容 👁️
3. 点击"下载PDF"保存到本地 ⬇️

### 配置局域网访问 📱

如需在局域网内让手机等设备访问：

**自动配置（Windows）** ⚡

```bash
setup-network.bat
```

**手动配置** 🔧

1. 查看本机IP：`ipconfig`（找到IPv4地址，如192.168.1.100）
2. 修改 `admin/.env` 和 `server/.env` 中的 `DOMAIN` 为：`http://192.168.1.100:5174`
3. 重启服务

## ❓ 常见问题

**Q: 复制链接没有提示？** 🤔
A: 这是正常的，链接已复制到剪贴板，可直接粘贴。

**Q: 移动端扫描二维码无法访问？** 📱
A: 开发环境默认使用localhost，需要配置局域网IP（运行 `setup-network.bat`）。

**Q: PDF上传失败？** ⚠️
A: 检查OSS配置是否正确，查看后端控制台错误信息。

**Q: 如何修改默认密码？** 🔑
A: 生成新密码的hash并更新到 `server/.env` 和 `admin/.env`。

**Q: 生产环境如何部署？** 🚀
A: 参考 `PRODUCTION_GUIDE.md` 文档。

## 📁 项目结构

```
pdf-demo/
├── server/          # 后端服务 🔧
├── admin/           # 管理端前端 💼
├── viewer/          # 用户端前端 👥
├── start.bat        # 一键启动 ▶️
├── stop.bat         # 停止服务 🛑
├── stop.ps1         # 停止服务（PowerShell）
└── setup-network.bat # 局域网配置 📱
```

## ⚠️ 注意事项

- 🔒 生产环境务必修改默认密码
- 🚫 不要将 `.env` 文件提交到版本控制
- 🔄 定期更新依赖包和安全补丁

## 📄 License

MIT

## 📄 联系作者

![联系方式](images/contact.png)
