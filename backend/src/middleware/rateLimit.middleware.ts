import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const WINDOW_MS = 15 * 60 * 1000;
// Automated tests exercise auth hundreds of times from one IP; limits are enforced everywhere else.
const skip = () => env.NODE_ENV === 'test';

// Brute-force guard on login (per IP). Per-account lockout is enforced separately in AuthService.
export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// General API guard against abuse/scraping (per IP). Raise API_RATE_LIMIT if many guards
// share one NAT'd office/site connection.
export const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: env.API_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { error: 'Too many requests. Please try again later.' },
});
