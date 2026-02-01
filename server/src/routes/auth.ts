import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditLogger } from '../services/auditService';
import { loginAttemptManager } from '../services/loginAttemptService';

const router = Router();

// 登录接口
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { username, password } = req.body;

    // 参数校验
    if (!username) {
      throw new ApiError(400, '请输入用户名');
    }
    if (!password) {
      throw new ApiError(400, '请输入密码');
    }

    // 用户名校验
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
    if (username !== ADMIN_USERNAME) {
      throw new ApiError(401, '用户名或密码错误');
    }

    // 密码复杂度校验
    if (password.length < 8) {
      throw new ApiError(400, '密码至少8位');
    }
    if (!/(?=.*\d)(?=.*[a-zA-Z])/.test(password)) {
      throw new ApiError(400, '密码必须包含数字和字母');
    }

    // 检查登录失败记录
    const ip = req.ip || 'unknown';
    const attemptResult = await loginAttemptManager.checkAttempt(ip);

    if (attemptResult.locked) {
      throw new ApiError(
        429,
        `账户已锁定${attemptResult.remainingMinutes}分钟`
      );
    }

    // 验证密码
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
    if (!ADMIN_PASSWORD_HASH) {
      throw new ApiError(500, '服务器配置错误');
    }

    const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isPasswordValid) {
      // 记录失败尝试
      await loginAttemptManager.recordFailedAttempt(ip);
      await auditLogger.log({
        action: 'login_failed',
        username,
        ip,
        userAgent: req.headers['user-agent'],
      });

      const attempts = await loginAttemptManager.getRemainingAttempts(ip);

      throw new ApiError(
        401,
        `用户名或密码错误，还有${attempts}次尝试机会`
      );
    }

    // 重置登录失败记录
    await loginAttemptManager.resetAttempts(ip);

    // 生成JWT Token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new ApiError(500, '服务器配置错误');
    }

    const token = jwt.sign(
      {
        id: uuidv4(),
        username,
        isAdmin: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 记录登录审计日志
    await auditLogger.log({
      action: 'login',
      username,
      ip,
      userAgent: req.headers['user-agent'],
    });

    // 设置HttpOnly Cookie
    const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '604800000');

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        expiresIn: 7 * 24 * 60 * 60, // 7天（秒）
      },
    });
  } catch (error) {
    next(error);
  }
});

// 验证登录状态
router.get('/verify', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      isLoggedIn: true,
      isAdmin: req.user?.isAdmin || false,
    },
  });
});

// 退出登录
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    success: true,
    message: '退出登录成功',
  });
});

export default router;
