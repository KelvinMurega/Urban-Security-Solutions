import * as Sentry from '@sentry/node';
import { env } from '../config/env';

// Error tracking is opt-in: set SENTRY_DSN to enable. No request bodies, cookies or
// headers are sent (sendDefaultPii=false + beforeSend scrub).
export const monitoringEnabled = Boolean(env.SENTRY_DSN) && env.NODE_ENV !== 'test';

if (monitoringEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (monitoringEnabled) Sentry.captureException(error, context ? { extra: context } : undefined);
};
