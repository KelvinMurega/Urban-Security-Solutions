import request from 'supertest';
import { Role, UserStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/shared/prisma';
import { hashPassword } from '../src/shared/password';

export const app = createApp();
export const ORIGIN = 'https://app.test.local';
export const PASSWORD = 'correct-horse-battery-staple';

// Guard rail: integration tests wipe tables, so they refuse to touch anything that is not
// obviously a throwaway test database.
export const assertTestDatabase = () => {
  const url = process.env.DATABASE_URL || '';
  const dbName = url.split('/').pop()?.split('?')[0] || '';
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run integration tests against database "${dbName}". Set TEST_DATABASE_URL to a *_test database.`);
  }
};

export const resetDatabase = async () => {
  assertTestDatabase();
  await prisma.auditLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.clientSite.deleteMany();
  await prisma.report.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.updateMany({ data: { siteId: null } });
  await prisma.site.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();
};

let counter = 0;
export const createUser = async (role: Role, overrides: Partial<{ email: string; status: UserStatus; siteId: string | null }> = {}) => {
  counter += 1;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}${counter}@test.local`,
      name: `${role} ${counter}`,
      password: await hashPassword(PASSWORD),
      role,
      status: overrides.status ?? UserStatus.ACTIVE,
      siteId: overrides.siteId ?? null,
    },
  });
};

export const createSite = (overrides: Partial<{ latitude: number | null; longitude: number | null; geofenceRadiusMeters: number }> = {}) => {
  counter += 1;
  return prisma.site.create({
    data: {
      name: `Site ${counter}`,
      address: `${counter} Test Road`,
      latitude: overrides.latitude === undefined ? -1.2921 : overrides.latitude,
      longitude: overrides.longitude === undefined ? 36.8219 : overrides.longitude,
      geofenceRadiusMeters: overrides.geofenceRadiusMeters ?? 150,
    },
  });
};

// A cookie-carrying client that behaves like the real browser frontend (sends Origin).
export const loginAs = async (email: string, password = PASSWORD) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').set('Origin', ORIGIN).send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

// 1x1 transparent PNG
export const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
