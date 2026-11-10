import { logger } from './logger';

// Structured, greppable security events (authentication, authorization, account changes).
// Never pass passwords, tokens or request bodies in `details`.
export type SecurityEvent =
  | 'auth.login_success'
  | 'auth.login_failed'
  | 'auth.account_locked'
  | 'auth.login_inactive'
  | 'auth.logout'
  | 'auth.token_rejected'
  | 'auth.setup_registration'
  | 'access.denied'
  | 'csrf.blocked'
  | 'account.password_changed'
  | 'account.updated'
  | 'account.created'
  | 'shift.location_flagged';

const WARN_EVENTS = new Set<SecurityEvent>(['auth.account_locked', 'csrf.blocked', 'access.denied', 'shift.location_flagged']);

export const securityLog = (event: SecurityEvent, details: Record<string, unknown> = {}) => {
  const level = WARN_EVENTS.has(event) ? 'warn' : 'info';
  logger[level]({ security: true, event, ...details }, event);
};
