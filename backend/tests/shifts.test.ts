import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { createSite, createUser, loginAs, ORIGIN, resetDatabase } from './helpers';
import { prisma } from '../src/shared/prisma';

const AT_SITE = { lat: -1.2921, lng: 36.8219, accuracy: 12 };
const FAR_AWAY = { lat: -1.3, lng: 36.9, accuracy: 10 }; // ~9km away

const setup = async () => {
  const admin = await createUser(Role.ADMIN);
  const guard = await createUser(Role.GUARD);
  const otherGuard = await createUser(Role.GUARD);
  const site = await createSite();
  const adminAgent = await loginAs(admin.email);
  const now = Date.now();
  const created = await adminAgent.post('/api/shifts').set('Origin', ORIGIN).send({
    userId: guard.id,
    siteId: site.id,
    startTime: new Date(now - 10 * 60_000).toISOString(),
    endTime: new Date(now + 8 * 3_600_000).toISOString(),
  });
  expect(created.status).toBe(201);
  return { admin, guard, otherGuard, site, adminAgent, shiftId: created.body.id as string };
};

describe('shifts and GPS check-in', () => {
  beforeEach(resetDatabase);

  it('only lets admins assign shifts, and only to active guards', async () => {
    const { guard, site, adminAgent } = await setup();
    const guardAgent = await loginAs(guard.email);
    const body = { userId: guard.id, siteId: site.id, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3_600_000).toISOString() };

    expect((await guardAgent.post('/api/shifts').set('Origin', ORIGIN).send(body)).status).toBe(403);
    const client = await createUser(Role.CLIENT);
    expect((await adminAgent.post('/api/shifts').set('Origin', ORIGIN).send({ ...body, userId: client.id })).status).toBe(400);
    expect((await adminAgent.post('/api/shifts').set('Origin', ORIGIN).send({ ...body, endTime: new Date(Date.now() + 48 * 3_600_000).toISOString() })).status).toBe(400);
  });

  it('enforces the geofence', async () => {
    const { guard, shiftId } = await setup();
    const agent = await loginAs(guard.email);

    const far = await agent.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send(FAR_AWAY);
    expect(far.status).toBe(400);
    expect(far.body.error).toMatch(/must be within 150m/);

    const ok = await agent.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send(AT_SITE);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('ACTIVE');
    expect(ok.body.locationFlagged).toBe(false);
  });

  it('prevents checking in to someone else’s shift, double check-in, and early check-out', async () => {
    const { guard, otherGuard, shiftId } = await setup();
    const intruder = await loginAs(otherGuard.email);
    expect((await intruder.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send(AT_SITE)).status).toBe(403);

    const agent = await loginAs(guard.email);
    expect((await agent.put(`/api/shifts/${shiftId}/check-out`).set('Origin', ORIGIN).send(AT_SITE)).status).toBe(400);
    expect((await agent.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send(AT_SITE)).status).toBe(200);
    expect((await agent.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send(AT_SITE)).status).toBe(400);
    expect((await agent.put(`/api/shifts/${shiftId}/check-out`).set('Origin', ORIGIN).send(AT_SITE)).status).toBe(200);
  });

  it('records device evidence and flags suspicious locations for review', async () => {
    const { guard, shiftId } = await setup();
    const agent = await loginAs(guard.email);
    const res = await agent
      .put(`/api/shifts/${shiftId}/check-in`)
      .set('Origin', ORIGIN)
      .set('User-Agent', 'GuardPhone/1.0')
      .send({ lat: AT_SITE.lat, lng: AT_SITE.lng, accuracy: 0 });
    expect(res.status).toBe(200);

    const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
    expect(shift.locationFlagged).toBe(true);
    expect(shift.locationFlagReason).toMatch(/mock locations/);
    expect(shift.checkInUserAgent).toBe('GuardPhone/1.0');
    expect(shift.checkInIp).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({ where: { entityId: shiftId, action: 'shift.check_in' } });
    expect(audit?.actorId).toBe(guard.id);
  });

  it('rejects handovers to people who are not active guards', async () => {
    const { guard, admin, shiftId } = await setup();
    const agent = await loginAs(guard.email);
    const res = await agent.put(`/api/shifts/${shiftId}/check-in`).set('Origin', ORIGIN).send({ ...AT_SITE, previousGuardId: admin.id });
    expect(res.status).toBe(400);
  });

  it('shows guards only their own shifts', async () => {
    const { otherGuard } = await setup();
    const res = await (await loginAs(otherGuard.email)).get('/api/shifts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
