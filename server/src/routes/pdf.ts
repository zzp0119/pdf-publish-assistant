import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { supabaseService } from '../services/supabaseService';

const router = Router();

/**
 * 获取 PDF 列表（需要认证）
 * GET /api/pdf/list
 */
router.get('/list', authenticateToken, async (_req: AuthRequest, res: Response, next) => {
  try {
    const pdfs = await supabaseService.getAllActivePDFs();

    // 转换为前端需要的格式
    const formattedPdfs = pdfs.map(pdf => ({
      id: pdf.id,
      uniqueId: pdf.unique_id,
      originalName: pdf.original_name,
      size: pdf.size,
      ossUrl: pdf.oss_url,
      uploadedAt: pdf.created_at, // Supabase 自动创建 created_at 字段
    }));

    res.json({
      success: true,
      data: formattedPdfs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 根据 uniqueId 获取 PDF 详情（用户端访问，无需认证）
 * GET /api/pdf/:uniqueId
 */
router.get('/:uniqueId', async (req: AuthRequest, res: Response, next) => {
  try {
    const { uniqueId } = req.params;

    const pdf = await supabaseService.getPDFByUniqueId(uniqueId);

    if (!pdf) {
      throw new ApiError(404, 'PDF不存在或已被删除');
    }

    // 记录审计日志
    await supabaseService.logAudit({
      action: 'view',
      pdf_id: pdf.id,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        uniqueId: pdf.unique_id,
        originalName: pdf.original_name,
        size: pdf.size,
        ossUrl: pdf.oss_url,
        uploadedAt: pdf.created_at, // Supabase 自动创建 created_at 字段
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除 PDF（需要认证）
 * DELETE /api/pdf/:uniqueId
 */
router.delete('/:uniqueId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const { uniqueId } = req.params;

    // 先查询PDF是否存在
    const pdf = await supabaseService.getPDFByUniqueId(uniqueId);
    if (!pdf) {
      throw new ApiError(404, 'PDF不存在或已被删除');
    }

    // 软删除
    await supabaseService.softDeletePDF(uniqueId);

    // 记录审计日志
    await supabaseService.logAudit({
      action: 'delete',
      pdf_id: pdf.id,
      username: req.user?.username,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: '删除成功，文件将在30天后永久删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取二维码（需要认证）
 * GET /api/pdf/:uniqueId/qrcode
 */
router.get('/:uniqueId/qrcode', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const { uniqueId } = req.params;

    const pdf = await supabaseService.getPDFWithQRCode(uniqueId);

    if (!pdf) {
      throw new ApiError(404, 'PDF不存在或已被删除');
    }

    res.json({
      success: true,
      data: {
        qrcodeBase64: pdf.qrcode_base64,
        fileName: pdf.original_name,
        uniqueId: pdf.unique_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
