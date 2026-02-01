import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// 加载环境变量
dotenv.config();

// 获取 __dirname (ES Module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入路由
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import pdfRoutes from './routes/pdf';
import proxyRoutes from './routes/proxy';

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 开发环境禁用CSP
  crossOriginEmbedderPolicy: false,
}));

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.DOMAIN
    : (origin, callback) => {
        // 开发环境允许 localhost 和 局域网IP
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://192.168.31.206:5173',
          'http://192.168.31.206:5174',
          'http://192.168.31.206:3001',
        ];

        // 允许所有 localhost 和局域网IP
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
          callback(null, true);
        } else {
          callback(new Error('不允许的跨域请求'));
        }
      },
  credentials: true,
}));

// 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 请求日志
app.use(requestLogger);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境：托管 viewer 静态文件
if (process.env.NODE_ENV === 'production') {
  // 托管 viewer 构建后的静态文件
  const viewerDistPath = path.join(__dirname, '../../viewer/dist');
  app.use('/view', express.static(viewerDistPath));

  // 托管 admin 构建后的静态文件（可选）
  const adminDistPath = path.join(__dirname, '../../admin/dist');
  app.use('/admin', express.static(adminDistPath));

  logger.info('📦 静态文件服务已启用');
  logger.info(`   - Viewer: ${viewerDistPath}`);
  logger.info(`   - Admin: ${adminDistPath}`);
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/proxy', proxyRoutes);

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 服务器启动成功`);
  logger.info(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 端口: ${PORT}`);
  logger.info(`🔗 域名: ${process.env.DOMAIN || 'http://localhost:' + PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

export default app;
