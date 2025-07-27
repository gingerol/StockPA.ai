import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`📨 ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};