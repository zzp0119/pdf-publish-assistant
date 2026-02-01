import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { ossUploadService } from '../services/ossUploadService';
import { qrcodeService } from '../services/qrcodeService';
import { supabaseService } from '../services/supabaseService';

const router = Router();

// 所有上传路由都需要认证
router.use(authenticateToken);

// 配置 multer 用于接收文件（内存存储）
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
  },
  fileFilter: (_req, file, cb) => {
    // 只允许 PDF 文件
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持PDF格式文件'));
    }
  },
});

/**
 * 上传 PDF 文件（后端代理上传到 OSS）
 * POST /api/upload/upload-pdf
 * Content-Type: multipart/form-data
 */
router.post('/upload-pdf', upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, '请选择文件');
    }

    const { originalname, size, buffer } = req.file;

    // 修复中文文件名乱码：尝试解码 Latin-1 到 UTF-8
    let decodedFileName = originalname;
    try {
      // 如果文件名包含非ASCII字符，尝试解码
      if (/[^\x00-\x7F]/.test(originalname)) {
        // 将 Latin-1 编码的字符串转换为 Buffer，然后用 UTF-8 解码
        const latin1Buffer = Buffer.from(originalname, 'latin1');
        decodedFileName = latin1Buffer.toString('utf8');
      }
    } catch (error) {
      // 如果解码失败，使用原始文件名
      console.warn('文件名解码失败，使用原始文件名');
    }

    console.log('接收到文件:', { originalname, decodedFileName, size });

    // 1. 上传文件到 OSS（使用解码后的文件名）
    const { url: ossUrl } = await ossUploadService.uploadFile(buffer, decodedFileName);

    // 2. 生成唯一 ID
    const uniqueId = uuidv4().substring(0, 8);

    // 3. 生成访问链接
    const domain = process.env.DOMAIN || `http://localhost:${process.env.PORT || 3001}`;
    const accessUrl = `${domain}/view/${uniqueId}`;

    // 4. 生成二维码 Data URL（带 data:image/png;base64, 前缀）
    const qrcodeBase64 = await qrcodeService.generateQRCodeDataURL(accessUrl);

    // 5. 保存元数据到 Supabase（使用解码后的文件名）
    const pdfMetadata = await supabaseService.savePDFMetadata({
      unique_id: uniqueId,
      original_name: decodedFileName,
      size: size,
      oss_url: ossUrl,
      qrcode_base64: qrcodeBase64,
      is_active: true,
    });

    // 6. 记录审计日志
    await supabaseService.logAudit({
      action: 'upload',
      pdf_id: pdfMetadata.id,
      username: req.user?.username,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: '上传成功',
      data: {
        fileName: decodedFileName,  // 返回解码后的文件名
        fileSize: size,
        ossUrl: ossUrl,
        uniqueId: uniqueId,
        accessUrl: accessUrl,
        qrcodeBase64: qrcodeBase64,
        uploadedAt: pdfMetadata.created_at, // Supabase 自动创建 created_at 字段
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
