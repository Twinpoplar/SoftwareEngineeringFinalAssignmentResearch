import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

type TokenPayload = jwt.JwtPayload & {
  user?: {
    id: string;
    email: string;
    role: string;
  };
};

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 获取 token
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: '无访问权限，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload | string;
    if (typeof decoded === 'string' || !decoded.user) {
      return res.status(401).json({ error: 'Token 无效或已过期' });
    }
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
};

// 角色检查中间件
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '您没有权限执行此操作' });
    }
    
    next();
  };
};
