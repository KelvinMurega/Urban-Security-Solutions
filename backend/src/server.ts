import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import path from 'path';
import apiRouter from './routes'; // Import the centralized router
import { unassignAdminsFromSites } from './modules/users/users.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const isPrivateNetworkOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/i.test(origin);

// Global Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || isPrivateNetworkOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Single entry point for all API routes
app.use('/api', apiRouter);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

const startServer = async () => {
  try {
    const result = await unassignAdminsFromSites();
    if (result.count > 0) {
      console.log(`Admin site assignments cleared: ${result.count}`);
    }
  } catch (error) {
    console.error('Failed to normalize admin site assignments:', error);
  }

  app.listen(Number(PORT), HOST, () => {
    const interfaces = networkInterfaces();
    const localIps = Object.values(interfaces)
      .reduce<NetworkInterfaceInfo[]>((all, ifaceList) => {
        if (!ifaceList) return all;
        all.push(...ifaceList);
        return all;
      }, [])
      .filter((iface) => iface.family === 'IPv4' && !iface.internal)
      .map((iface) => iface.address);

    console.log(`Server is running on http://${HOST}:${PORT}`);
    if (localIps.length > 0) {
      console.log(`LAN access: http://${localIps[0]}:${PORT}`);
    }
  });
};

startServer();
