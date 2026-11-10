import { env } from './config/env'; // must be first: validates configuration and fails closed
import './shared/monitoring';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import apiRouter from './routes';
import filesRouter from './modules/files/files.routes';
import { isAllowedOrigin } from './config/origins';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { csrfProtection } from './middleware/csrf.middleware';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { logger } from './shared/logger';
import { prisma } from './shared/prisma';

export const createApp = () => {
  const app = express();

  // Behind a load balancer / reverse proxy, trust exactly that many hops so req.ip (used by
  // rate limiting and security logs) is the real client and cannot be spoofed via headers.
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // Request logging with a correlation id (echoed as X-Request-Id for support/debugging).
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
    })
  );

  app.use(
    helmet({
      // This is a JSON API: deny everything a browser could render or embed.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin = same-origin or non-browser client; CSRF middleware covers unsafe methods.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
      maxAge: 600,
    })
  );

  // Small JSON bodies by default; only the endpoints that accept photos get a larger limit
  // (4 photos x 2MB, base64-encoded). body-parser skips bodies that were already parsed.
  const photoBody = express.json({ limit: '12mb' });
  app.use(['/api/incidents', '/api/reports', '/api/auth/me'], photoBody);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Liveness + readiness (database reachable). Safe for load balancers and uptime monitors.
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'OK' });
    } catch {
      res.status(503).json({ status: 'UNAVAILABLE' });
    }
  });

  // Uploaded evidence is served only through an authenticated, authorized route.
  app.use('/uploads', filesRouter);

  app.use('/api', apiRateLimiter, csrfProtection, apiRouter);

  // Unmatched routes and centralized error handling (must be registered last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
