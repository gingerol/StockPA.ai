import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    status: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        trialEndDate: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

export const auth = authenticate;

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided - continue without user
      req.user = undefined;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        trialEndDate: true,
      }
    });

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Invalid token - continue without user
    req.user = undefined;
    next();
  }
};

// All features are now free - this is just a placeholder for easier migration
export const requirePro = authenticate;