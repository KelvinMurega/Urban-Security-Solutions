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
  | 'account.created';

export const securityLog = (event: SecurityEvent, details: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level: 'security', event, at: new Date().toISOString(), ...details }));
};
