import { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express recognizes this as an error handler by its 4-argument signature.
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
};
