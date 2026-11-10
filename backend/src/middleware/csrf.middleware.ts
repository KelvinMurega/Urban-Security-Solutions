import { NextFunction, Request, Response } from 'express';
import { isAllowedOrigin } from '../config/origins';
import { securityLog } from '../shared/security-log';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const originOf = (value: string | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

// CSRF defence for cookie-authenticated requests: a state-changing request must come from
// one of our own frontend origins. Requests authenticated with an explicit Bearer header
// cannot be forged cross-site, so they are exempt. Fails closed when no origin is present.
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const origin = originOf(req.headers.origin) || originOf(req.headers.referer);
  if (origin && isAllowedOrigin(origin)) return next();

  securityLog('csrf.blocked', { method: req.method, path: req.originalUrl, origin: origin || null, ip: req.ip });
  return res.status(403).json({ error: 'Request origin not allowed.' });
};
