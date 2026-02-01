import { Router, Response, Request } from 'express';
import axios from 'axios';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * 代理 OSS 文件访问
 * GET /api/proxy/pdf?url=<encoded_url>
 *
 * 这个路由用于解决 OSS 文件的 CORS 和权限问题
 * 前端通过后端代理访问 OSS 文件，后端使用服务器端请求获取文件
 */
router.get('/pdf', async (req: Request, res: Response, next) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      throw new ApiError(400, '缺少文件 URL 参数');
    }

    console.log('代理请求 OSS 文件:', url);

    // 使用 axios 从 OSS 获取文件
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        // 添加必要的请求头
        'Accept': 'application/pdf',
      },
    });

    // 设置响应头
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': response.headers['content-length'] || '0',
      'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
    });

    // 返回文件内容
    res.send(response.data);
  } catch (error: any) {
    console.error('代理 OSS 文件失败:', error.message);

    if (error.response?.status === 403) {
      throw new ApiError(403, '文件访问被拒绝，请检查 OSS 权限配置');
    } else if (error.response?.status === 404) {
      throw new ApiError(404, '文件不存在');
    } else {
      throw new ApiError(500, '文件加载失败，请稍后重试');
    }
  }
});

export default router;
