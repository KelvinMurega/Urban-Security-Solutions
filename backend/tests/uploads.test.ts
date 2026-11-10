import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { app, createSite, createUser, loginAs, ORIGIN, PNG_DATA_URL, resetDatabase } from './helpers';
import { prisma } from '../src/shared/prisma';

const setup = async () => {
  const site = await createSite();
  const otherSite = await createSite();
  const admin = await createUser(Role.ADMIN);
  const reporter = await createUser(Role.GUARD, { siteId: site.id });
  const otherGuard = await createUser(Role.GUARD, { siteId: otherSite.id });
  const siteClient = await createUser(Role.CLIENT);
  const otherClient = await createUser(Role.CLIENT);
  await prisma.clientSite.create({ data: { clientId: siteClient.id, siteId: site.id } });
  return { site, otherSite, admin, reporter, otherGuard, siteClient, otherClient };
};

const fileIncident = async (email: string, siteId: string, photos = [PNG_DATA_URL]) =>
  (await loginAs(email)).post('/api/incidents').set('Origin', ORIGIN).send({ title: 'Broken gate', description: 'Gate lock forced', siteId, photos });

describe('incident evidence uploads', () => {
  beforeEach(resetDatabase);

  it('stores photos privately and serves them only to authorized users', async () => {
    const { site, admin, reporter, otherGuard, siteClient, otherClient } = await setup();
    const created = await fileIncident(reporter.email, site.id);
    expect(created.status).toBe(201);
    const [url] = created.body.photoUrls as string[];
    expect(url).toMatch(/^\/uploads\/incidents\/[0-9a-f-]{36}-[0-9a-f-]{36}\.png$/);

    expect((await request(app).get(url)).status).toBe(401);
    for (const user of [admin, reporter, siteClient]) {
      const res = await (await loginAs(user.email)).get(url);
      expect(res.status, user.role).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['cache-control']).toMatch(/private/);
    }
    for (const user of [otherGuard, otherClient]) {
      expect((await (await loginAs(user.email)).get(url)).status, user.email).toBe(404);
    }
  });

  it('rejects disguised files and too many photos', async () => {
    const { site, reporter } = await setup();
    const html = `data:image/png;base64,${Buffer.from('<html><script>alert(1)</script></html>').toString('base64')}`;
    expect((await fileIncident(reporter.email, site.id, [html])).status).toBe(400);
    expect((await fileIncident(reporter.email, site.id, Array(5).fill(PNG_DATA_URL))).status).toBe(400);
    expect(await prisma.incident.count()).toBe(0);
  });

  it('only lets guards report incidents at sites they work at', async () => {
    const { otherSite, reporter } = await setup();
    expect((await fileIncident(reporter.email, otherSite.id)).status).toBe(403);
  });

  it('only accepts uploaded images as avatars, never external URLs', async () => {
    const { reporter } = await setup();
    const agent = await loginAs(reporter.email);
    expect((await agent.put('/api/auth/me').set('Origin', ORIGIN).send({ avatarUrl: 'https://tracker.example/pixel.png' })).status).toBe(400);
    const ok = await agent.put('/api/auth/me').set('Origin', ORIGIN).send({ avatarUrl: PNG_DATA_URL });
    expect(ok.status).toBe(200);
    expect(ok.body.avatarUrl).toMatch(/^\/uploads\/avatars\//);
  });
});
