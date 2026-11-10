import { NextFunction, Request, Response } from 'express';
import { toHttpError } from '../shared/http-error';
import { logger } from '../shared/logger';
import { captureException } from '../shared/monitoring';

export const notFoundHandler = (_req: Request, res: Response) => {
  // Do not echo the requested path back (reflected content / route enumeration).
  res.status(404).json({ error: 'Not found' });
};

// Express recognizes this as an error handler by its 4-argument signature.
// Only HttpError messages are shown to callers; everything else becomes a generic 500.
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const httpError = toHttpError(err);
  if (httpError.status >= 500) {
    logger.error({ err, method: req.method, path: req.originalUrl }, 'unhandled error');
    captureException(err, { method: req.method, path: req.originalUrl });
  }
  if (res.headersSent) return;
  res.status(httpError.status).json({ error: httpError.message });
};
