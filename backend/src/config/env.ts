import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Secure by default: anything other than an explicit development/test value runs in
// production mode, so a forgotten NODE_ENV never silently relaxes cookies, CORS or errors.
const rawNodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
const nodeEnv: 'development' | 'test' | 'production' =
  rawNodeEnv === 'development' || rawNodeEnv === 'test' ? rawNodeEnv : 'production';

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'change_this_to_a_long_random_secret',
  'secret',
  'changeme',
  'jwt_secret',
]);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters (use a long random value)')
    .refine((value) => !KNOWN_PLACEHOLDER_SECRETS.has(value.toLowerCase()), 'JWT_SECRET is a placeholder value'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 12h, 30m, 1d').default('12h'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default(''),
  COOKIE_DOMAIN: z.string().optional(),
  // Number of reverse proxies in front of the API (load balancer, nginx). 0 = none.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  // The one-time /api/auth/register bootstrap endpoint is OFF unless explicitly enabled.
  ENABLE_SETUP_REGISTRATION: z.enum(['true', 'false']).default('false'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // Fail closed: refuse to boot with an unsafe or incomplete configuration.
  console.error(`Invalid server configuration:\n${problems}`);
  process.exit(1);
}

const corsOrigins = parsed.data.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (nodeEnv === 'production' && corsOrigins.length === 0) {
  console.error('Invalid server configuration:\n  - CORS_ORIGINS must list the frontend origin(s) in production');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  NODE_ENV: nodeEnv,
  isProduction: nodeEnv === 'production',
  corsOrigins,
  setupRegistrationEnabled: parsed.data.ENABLE_SETUP_REGISTRATION === 'true',
};
