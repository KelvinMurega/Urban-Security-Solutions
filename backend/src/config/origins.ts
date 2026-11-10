import { env } from './env';

const allowedOrigins = new Set(env.corsOrigins);

const PRIVATE_NETWORK_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/i;

// Production: only the explicitly configured origins. Development additionally allows
// localhost / LAN origins so guards can test on phones over Wi-Fi.
export const isAllowedOrigin = (origin: string) =>
  allowedOrigins.has(origin) || (!env.isProduction && PRIVATE_NETWORK_ORIGIN.test(origin));
