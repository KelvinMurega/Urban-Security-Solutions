import pino from 'pino';
import { env } from '../config/env';

// Structured JSON logs in production (ship them to your log platform as-is); pretty output
// locally. Credentials are redacted at the logger level so they can never be written,
// even if someone logs a whole request by mistake.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  base: { service: 'urban-security-api', env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.token',
      '*.photos',
      '*.avatarUrl',
    ],
    censor: '[REDACTED]',
  },
  ...(env.isProduction || env.NODE_ENV === 'test'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
});
