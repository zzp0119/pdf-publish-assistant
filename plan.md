# 债权公告发布助手 - 实施方案

## 项目概述
构建一个安全的债权公告发布助手，采用轻量级后端生成STS临时凭证，前端直传OSS，云数据库存储元数据，实现高安全性和低成本部署。

**访问链接格式：** `https://yourdomain.com/view/{uniqueId}`

## 技术架构

### 技术栈
- **管理端前端：** React + Ant Design
- **用户端前端：** React + PDF.js
- **轻量级后端：** Node.js + Express（或Serverless函数）
- **文件存储：** 阿里云OSS（STS临时凭证上传）
- **数据存储：** Supabase（PostgreSQL数据库）
- **二维码生成：** qrcode.react

### 架构优势
- ✅ **安全性高**：STS临时凭证，AccessKey不暴露
- ✅ **成本低**：仅需轻量级后端，可使用Serverless按需付费
- ✅ **可扩展**：云数据库支持多用户、多设备
- ✅ **性能好**：OSS CDN加速
- ✅ **易维护**：前后端分离，职责清晰

### 系统架构图
```
┌─────────────┐
│  管理端前端  │
└──────┬──────┘
       │ 1. 上传PDF文件（multipart/form-data）
       ▼
┌─────────────┐
│  轻量级后端   │
└──────┬──────┘
       │ 2. 上传到阿里云OSS
       ▼
┌─────────────┐
│  阿里云OSS   │
└──────┬──────┘
       │ 3. 返回文件URL
       ▼
┌─────────────┐
│  轻量级后端   │
└──────┬──────┘
       │ 4. 生成二维码（base64）
       │ 5. 保存元数据到数据库
       ▼
┌─────────────┐
│  Supabase    │
└─────────────┘
       │ 6. 返回上传结果
       ▼
┌─────────────┐
│  管理端前端  │
└─────────────┘
```

## 上传方案说明

### 方案选择：后端代理上传（已采用）

**原因**：
- ✅ 简化前端复杂度（无需处理STS临时凭证）
- ✅ 后端统一处理文件名校验（解决中文文件名乱码问题）
- ✅ 便于生成和存储二维码base64
- ✅ 更好的错误处理和重试机制
- ✅ 统一的审计日志记录

**流程**：
1. 前端使用FormData上传PDF文件到后端
2. 后端接收文件后上传到阿里云OSS（使用阿里云OSS SDK）
3. 后端生成唯一ID（8位UUID）和访问链接
4. 后端生成二维码（base64格式）
5. 后端保存元数据到Supabase数据库
6. 返回上传结果给前端（包含文件信息、访问链接、二维码）

**前端示例**：
```typescript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('/api/upload/upload-pdf', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
// result.data: { fileName, fileSize, ossUrl, uniqueId, accessUrl, qrcodeBase64 }
```

**后端示例**：
```typescript
router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  // 1. 上传到OSS
  const { url } = await ossUploadService.uploadFile(buffer, fileName);

  // 2. 生成唯一ID和二维码
  const uniqueId = uuidv4().substring(0, 8);
  const accessUrl = `${domain}/view/${uniqueId}`;
  const qrcodeBase64 = await qrcodeService.generateQRCodeDataURL(accessUrl);

  // 3. 保存到数据库
  await supabaseService.savePDFMetadata({
    unique_id: uniqueId,
    oss_url: url,
    qrcode_base64: qrcodeBase64,
    original_name: fileName,
    size: fileSize,
    is_active: true
  });

  // 4. 记录审计日志
  await supabaseService.logAudit({
    action: 'upload',
    pdf_id: metadata.id,
    username: req.user?.username,
    ip: req.ip,
    user_agent: req.headers['user-agent']
  });

  res.json({ success: true, data: { /* ... */ } });
});
```

## 项目结构
```
pdf-demo/
├── server/                    # 轻量级后端（Node.js + TypeScript）
│   ├── src/
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts        # JWT认证中间件
│   │   │   ├── errorHandler.ts # 错误处理
│   │   │   └── requestLogger.ts # 请求日志
│   │   ├── routes/           # 路由
│   │   │   ├── auth.ts        # 登录认证
│   │   │   ├── upload.ts      # 上传（后端代理）
│   │   │   ├── pdf.ts         # PDF查询
│   │   │   └── proxy.ts       # PDF代理（解决CORS）
│   │   ├── services/         # 服务层
│   │   │   ├── supabaseService.ts  # 数据库操作
│   │   │   ├── ossUploadService.ts # OSS上传
│   │   │   ├── ossStsService.ts    # STS凭证生成
│   │   │   ├── qrcodeService.ts    # 二维码生成
│   │   │   ├── auditService.ts     # 审计日志
│   │   │   └── loginAttemptService.ts # 登录限制
│   │   ├── types/            # TypeScript类型定义
│   │   │   └── index.ts
│   │   ├── utils/            # 工具函数
│   │   │   └── logger.ts
│   │   └── index.ts          # 入口文件
│   ├── .env                  # 环境变量
│   └── package.json
├── admin/                    # 管理端前端（React + TypeScript）
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadArea.tsx       # 上传组件
│   │   │   ├── SimpleUploadArea.tsx # 简化上传组件
│   │   │   └── EnvDebug.tsx         # 环境调试
│   │   ├── pages/
│   │   │   ├── Login.tsx            # 登录页
│   │   │   └── Dashboard.tsx        # 主页面
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # 认证上下文
│   │   ├── services/
│   │   │   └── api.ts               # API调用
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                  # 环境变量
│   └── package.json
├── viewer/                   # 用户端前端（React + TypeScript）
│   ├── src/
│   │   ├── components/
│   │   │   ├── PDFViewer.tsx            # PDF查看器
│   │   │   ├── MobileDownloadModal.tsx  # 移动端下载模态框（V1.1新增）
│   │   │   ├── LoadingState.tsx         # 加载状态
│   │   │   └── ErrorState.tsx           # 错误状态
│   │   ├── pages/
│   │   │   └── ViewPDF.tsx              # PDF查看页面
│   │   ├── services/
│   │   │   └── api.ts                   # API调用
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                  # 环境变量
│   └── package.json
├── prd.md                    # 产品需求文档
├── plan.md                   # 实施方案
└── README.md
```

## 数据库设计

### Supabase（PostgreSQL）方案（已采用）

#### pdfs 表（PDF元数据）
```sql
CREATE TABLE pdfs (
  id BIGSERIAL PRIMARY KEY,              -- 主键（自增）
  unique_id VARCHAR(8) UNIQUE NOT NULL,  -- 唯一标识符（用于URL，8位UUID）
  original_name VARCHAR(255) NOT NULL,   -- 用户上传的原始文件名
  size BIGINT NOT NULL,                  -- 文件大小（字节）
  oss_url TEXT NOT NULL,                 -- OSS完整URL
  qrcode_base64 TEXT,                    -- 二维码图片（base64格式）
  is_active BOOLEAN DEFAULT true,        -- 是否有效（软删除标记）
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- 创建时间（自动生成）
  deleted_at TIMESTAMPTZ                 -- 删除时间（软删除，NULL表示未删除）
);

-- 索引优化
CREATE INDEX idx_pdfs_unique_id ON pdfs(unique_id);
CREATE INDEX idx_pdfs_is_active ON pdfs(is_active);
```

#### audit_logs 表（审计日志）
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,              -- 主键（自增）
  action VARCHAR(50) NOT NULL,           -- 操作类型：login/login_failed/upload/delete/view
  pdf_id BIGINT REFERENCES pdfs(id),    -- 关联的PDF ID（外键）
  username VARCHAR(100),                 -- 操作用户名
  ip VARCHAR(50),                        -- IP地址
  user_agent TEXT,                       -- 用户代理（浏览器信息）
  created_at TIMESTAMPTZ DEFAULT NOW()   -- 操作时间（自动生成）
);

-- 索引优化
CREATE INDEX idx_audit_logs_pdf_id ON audit_logs(pdf_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### TypeScript类型定义
```typescript
// PDF 元数据
export interface PDFMetadata {
  id?: number;
  unique_id: string;           // 8位唯一标识符
  original_name: string;       // 原始文件名
  size: number;                // 文件大小（字节）
  oss_url: string;             // OSS URL
  qrcode_base64?: string;      // 二维码base64
  is_active: boolean;          // 是否有效
  created_at?: string;         // 创建时间
  deleted_at?: string | null;  // 删除时间
}

// 审计日志
export interface AuditLog {
  id?: number;
  action: 'login' | 'login_failed' | 'upload' | 'delete' | 'view';
  pdf_id?: number;
  username?: string;
  ip?: string;
  user_agent?: string;
  created_at?: string;
}
```

## 安全功能

### 1. 身份验证系统

#### JWT Token认证
```typescript
// JWT Token生成
const token = jwt.sign(
  { username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// JWT Token验证中间件
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.sendStatus(401); // 未授权
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // 禁止访问
    req.user = user;
    next();
  });
};
```

**特性**：
- ✅ JWT Token认证（无状态）
- ✅ Token有效期：7天
- ✅ Token存储：HttpOnly Cookie（防止XSS攻击）
- ✅ 密码加密：bcrypt（盐值>=10轮）

#### 密码复杂度要求
```typescript
// 密码验证规则
const passwordSchema = Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/);
// 至少8位，必须包含数字和字母
```

### 2. 登录失败限制

**功能**：防止暴力破解攻击

**实现**：
```typescript
// 登录尝试限制服务
class LoginAttemptService {
  private attempts: Map<string, number> = new Map();
  private lockouts: Map<string, Date> = new Map();

  async checkLockout(ip: string): Promise<boolean> {
    const lockout = this.lockouts.get(ip);
    if (lockout && lockout > new Date()) {
      return true; // 已锁定
    }
    return false;
  }

  async recordFailedAttempt(ip: string): Promise<void> {
    const count = (this.attempts.get(ip) || 0) + 1;
    this.attempts.set(ip, count);

    if (count >= MAX_LOGIN_ATTEMPTS) {
      // 锁定30分钟
      this.lockouts.set(ip, new Date(Date.now() + LOCKOUT_DURATION));
    }
  }
}
```

**规则**：
- ✅ 连续5次失败锁定30分钟
- ✅ 记录失败IP和时间
- ✅ 锁定期间显示剩余时间

### 3. 速率限制

**功能**：防止API滥用

**实现**：
```typescript
// 速率限制中间件
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**规则**：
- ✅ 每个IP地址15分钟内最多100次请求
- ✅ 超出限制返回429状态码
- ✅ 显示友好提示信息

### 4. 审计日志

**功能**：记录所有关键操作

**记录内容**：
- 登录（login）
- 登录失败（login_failed）
- 上传PDF（upload）
- 删除PDF（delete）
- 查看PDF（view）

**实现**：
```typescript
await supabaseService.logAudit({
  action: 'upload',
  pdf_id: metadata.id,
  username: req.user?.username,
  ip: req.ip,
  user_agent: req.headers['user-agent']
});
```

### 5. 文件安全校验

**功能**：防止恶意文件上传

**校验规则**：
```typescript
// 文件类型校验
fileFilter: (_req, file, cb) => {
  // 只允许 PDF 文件
  if (file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('仅支持PDF格式文件'));
  }
}

// 文件大小限制（50MB）
limits: {
  fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800')
}
```

### 6. CORS配置

**功能**：控制跨域访问

**实现**：
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true, // 允许携带Cookie
}));
```

### 7. 安全头设置

**功能**：增强HTTP安全性

**实现**：
```typescript
app.use(helmet()); // 使用Helmet中间件
```

**包含的安全头**：
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security（生产环境）

## 阿里云OSS + STS配置

### 1. RAM角色创建
在阿里云RAM控制台创建角色：
```
1. 创建RAM角色：角色类型为"阿里云服务"
2. 受信服务选择："对象存储服务（OSS）"
3. 添加权限策略：
   - PutObject（上传）
   - GetObject（下载）
   - DeleteObject（删除）
```

### 2. 后端STS配置
```javascript
// server/config/oss-sts.js
module.exports = {
  oss: {
    region: 'oss-cn-hangzhou',
    bucket: 'your-bucket-name',
  },
  sts: {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    roleArn: 'acs:ram::YOUR_ACCOUNT_ID:role/YOUR_ROLE_NAME',
    roleSessionName: 'pdf-upload-session',
    durationSeconds: 3600,  // 临时凭证有效期（秒）
  }
};
```

### 3. Bucket权限设置
- **读权限**：公共读（PDF可直接访问）
- **写权限**：私有（通过STS临时凭证控制）
- **CORS配置**：允许前端域名跨域访问

## 实施步骤

### Phase 1: 基础设施配置
1. 创建阿里云OSS Bucket
2. 配置RAM角色和STS权限
3. 创建云数据库（LeanCloud）
4. 配置CORS和Bucket权限

### Phase 2: 后端开发
1. 搭建Express服务器
2. 实现STS凭证生成服务
3. 配置环境变量
4. 部署到Serverless平台

### Phase 3: 管理端开发
1. 初始化React项目
2. 实现OSS上传服务（使用STS）
3. 集成云数据库SDK
4. 实现文件上传和列表管理
5. 实现二维码生成

### Phase 4: 用户端开发
1. 初始化React项目
2. 集成云数据库查询
3. 实现PDF在线预览
4. 实现下载功能
5. 移动端适配

### Phase 5: 测试和部署
1. 功能测试
2. 安全测试
3. 性能测试
4. 生产环境部署

## 核心功能

### 管理端功能
- ✅ **身份验证**：JWT Token认证，密码加密（bcrypt）
- ✅ **登录保护**：登录失败限制（5次锁定30分钟）
- ✅ **PDF文件上传**：后端代理上传到OSS，支持拖拽
- ✅ **文件名校验**：自动修复中文文件名乱码
- ✅ **PDF列表管理**：按时间倒序显示，支持实时刷新
- ✅ **二维码预生成**：上传时生成并存储base64格式
- ✅ **软删除机制**：删除后标记is_active=false，30天后自动清理
- ✅ **审计日志**：记录所有上传、删除操作（时间、IP、用户）

### 用户端功能
- ✅ **通过链接访问PDF**：`/view/{uniqueId}`格式
- ✅ **PDF在线预览**：使用PDF.js渲染，支持桌面端和移动端
- ✅ **桌面端功能**：
  - 缩放控制（放大、缩小、适应页面）
  - 翻页按钮（上一页、下一页）
  - 直接下载PDF
- ✅ **移动端优化**（V1.1新增）：
  - 移除冗余按钮（缩放、翻页）
  - 支持双指缩放手势
  - 支持上下滚动查看所有页面
  - 智能下载模态框（4种下载方案）
  - Web Share API集成（iOS 15+）
  - 详细操作指引（iOS Safari保存PDF）

### PDF代理功能
- ✅ **CORS代理**：`/api/proxy/pdf?url=xxx`解决OSS跨域问题
- ✅ **访问控制**：仅代理已激活的PDF（is_active=true）
- ✅ **审计记录**：记录每次PDF查看操作

### 安全功能
- ✅ **JWT认证**：无状态Token，7天有效期
- ✅ **密码加密**：bcrypt加密（盐值>=10轮）
- ✅ **速率限制**：每IP 15分钟最多100次请求
- ✅ **登录锁定**：5次失败锁定30分钟
- ✅ **文件校验**：仅允许PDF格式，最大50MB
- ✅ **CORS保护**：控制跨域访问来源
- ✅ **安全头**：Helmet中间件增强HTTP安全

## 部署方案

### 后端部署选项
- **Vercel Serverless**（推荐）：按需付费，零配置
- **阿里云函数计算（FC）**：国内访问快
- **轻量级云服务器**：使用PM2管理

### 前端部署
- **Vercel / Netlify**：免费托管，自动部署
- **阿里云OSS静态网站**：国内访问快

## 成本估算

### 月成本（中等规模）
- **阿里云OSS存储**：¥0.12/GB
- **OSS流量**：¥0.50/GB
- **后端Serverless**：免费额度或按调用次数
- **云数据库**：LeanCloud免费版（500条记录）
- **前端托管**：Vercel免费版

**总计**：约 ¥20-50/月（小规模几乎免费）

## 安全保障

### 1. STS凭证安全
- ✅ 临时凭证有效期短（1小时）
- ✅ 可限制文件路径（只能上传特定文件）
- ✅ 可限制操作类型
- ✅ AccessKey不暴露在前端

### 2. 数据安全
- ✅ 云数据库权限控制
- ✅ HTTPS加密传输
- ✅ CORS白名单配置
- ✅ 文件类型验证

## 优势与局限

### ✅ 优势
1. 无需完整后端服务器，降低成本
2. OSS提供高可用和CDN加速
3. 前端开发快速迭代
4. 部署简单，支持静态托管
5. 安全性高，使用STS临时凭证

### ⚠️ 局限
1. 需要配置阿里云RAM角色
2. 本地存储仅适合单用户
3. 多用户需要云数据库支持
