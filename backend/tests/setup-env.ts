import os from 'os';
import path from 'path';

// Runs before any test module is imported, so config validation sees test values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation-0123456789';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = 'https://app.test.local';
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `uss-test-uploads-${process.pid}`);
process.env.ENABLE_SETUP_REGISTRATION = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.SENTRY_DSN = '';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
