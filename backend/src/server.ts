import { env } from './config/env'; // must be first: validates configuration and fails closed
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import apiRouter from './routes';
import filesRouter from './modules/files/files.routes';
import { isAllowedOrigin } from './config/origins';
import { unassignAdminsFromSites } from './modules/users/users.service';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { csrfProtection } from './middleware/csrf.middleware';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { prisma } from './shared/prisma';

const app = express();

// Behind a load balancer / reverse proxy, trust exactly that many hops so req.ip (used by
// rate limiting and security logs) is the real client and cannot be spoofed via headers.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

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
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

// Small JSON bodies by default; only the endpoints that accept photos get a larger limit
// (4 photos x 2MB, base64-encoded). body-parser skips bodies that were already parsed.
const photoBody = express.json({ limit: '12mb' });
app.use(['/api/incidents', '/api/reports', '/api/auth/me'], photoBody);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

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

const startServer = async () => {
  try {
    const result = await unassignAdminsFromSites();
    if (result.count > 0) {
      console.log(`Admin site assignments cleared: ${result.count}`);
    }
  } catch (error) {
    console.error('Failed to normalize admin site assignments:', error);
  }

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running on http://${env.HOST}:${env.PORT} (${env.NODE_ENV} mode)`);
    if (!env.isProduction) {
      const localIps = Object.values(networkInterfaces())
        .reduce<NetworkInterfaceInfo[]>((all, ifaceList) => (ifaceList ? all.concat(ifaceList) : all), [])
        .filter((iface) => iface.family === 'IPv4' && !iface.internal)
        .map((iface) => iface.address);
      if (localIps.length > 0) console.log(`LAN access: http://${localIps[0]}:${env.PORT}`);
    }
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
