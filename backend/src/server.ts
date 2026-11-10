import { env } from './config/env';
import { networkInterfaces, NetworkInterfaceInfo } from 'os';
import { createApp } from './app';
import { unassignAdminsFromSites } from './modules/users/users.service';
import { logger } from './shared/logger';
import { prisma } from './shared/prisma';

const startServer = async () => {
  try {
    const result = await unassignAdminsFromSites();
    if (result.count > 0) logger.info({ count: result.count }, 'admin site assignments cleared');
  } catch (error) {
    logger.error({ err: error }, 'failed to normalize admin site assignments');
  }

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT, mode: env.NODE_ENV, storage: env.STORAGE_DRIVER }, 'server listening');
    if (!env.isProduction) {
      const localIps = Object.values(networkInterfaces())
        .reduce<NetworkInterfaceInfo[]>((all, ifaceList) => (ifaceList ? all.concat(ifaceList) : all), [])
        .filter((iface) => iface.family === 'IPv4' && !iface.internal)
        .map((iface) => iface.address);
      if (localIps.length > 0) logger.info(`LAN access: http://${localIps[0]}:${env.PORT}`);
    }
  });

  // Slow-client protection
  server.requestTimeout = 30_000;
  server.headersTimeout = 20_000;

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'unhandled promise rejection'));
};

startServer();
