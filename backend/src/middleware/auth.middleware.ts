import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role, UserStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../shared/prisma';
import { securityLog } from '../shared/security-log';

export const AUTH_COOKIE_NAME = 'token';
export const JWT_ISSUER = 'urban-security-api';
export const JWT_AUDIENCE = 'urban-security-app';

export type AuthUser = { id: string; role: Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type TokenPayload = { sub: string; role: Role; tv: number };

export const signAccessToken = (user: { id: string; role: Role; tokenVersion: number }) =>
  jwt.sign({ role: user.role, tv: user.tokenVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

const readToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim() || null;
  return (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME] || null;
};

const reject = (req: Request, res: Response, reason: string) => {
  securityLog('auth.token_rejected', { reason, ip: req.ip, path: req.originalUrl });
  return res.status(401).json({ error: 'Unauthorized' });
};

// Verifies the token AND re-checks the account on every request, so deactivating a user,
// changing their role or bumping tokenVersion (logout / password change) takes effect
// immediately instead of when the token eventually expires. Role comes from the database,
// never from the token.
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as TokenPayload;
  } catch {
    return reject(req, res, 'invalid_or_expired');
  }

  if (!payload?.sub || typeof payload.tv !== 'number') return reject(req, res, 'malformed_claims');

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, isActive: true, tokenVersion: true },
    });

    if (!user) return reject(req, res, 'user_missing');
    if (user.status !== UserStatus.ACTIVE || !user.isActive) return reject(req, res, 'user_inactive');
    if (user.tokenVersion !== payload.tv) return reject(req, res, 'token_revoked');

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!allowedRoles.includes(user.role)) {
      securityLog('access.denied', { userId: user.id, role: user.role, path: req.originalUrl, method: req.method });
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
