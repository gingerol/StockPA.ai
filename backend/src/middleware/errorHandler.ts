import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('🚨 Error:', err);

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      error.message = 'Duplicate field value entered';
      error.statusCode = 400;
    } else if (err.code === 'P2025') {
      error.message = 'Record not found';
      error.statusCode = 404;
    } else {
      error.message = 'Database error';
      error.statusCode = 500;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = 'Validation failed';
    error.statusCode = 400;
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};