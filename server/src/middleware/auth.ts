import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从HttpOnly Cookie中获取Token
    const token = req.cookies?.auth_token;

    if (!token) {
      throw new ApiError(401, '未登录，请先登录');
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new ApiError(500, '服务器配置错误');
    }

    // 验证Token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      isAdmin: boolean;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, '登录已过期，请重新登录');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, '登录凭证无效');
    }
    next(error);
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    throw new ApiError(403, '权限不足');
  }
  next();
};
