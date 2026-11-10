import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { app, createSite, createUser, loginAs, ORIGIN, resetDatabase } from './helpers';
import { prisma } from '../src/shared/prisma';

describe('authorization and request hygiene', () => {
  beforeEach(resetDatabase);

  it('requires a session for every API module', async () => {
    for (const path of ['/api/users/guards', '/api/sites', '/api/shifts', '/api/incidents', '/api/reports', '/api/invoices', '/api/clients', '/api/client/dashboard', '/api/audit-logs']) {
      expect((await request(app).get(path)).status, path).toBe(401);
    }
  });

  it('enforces role allow-lists', async () => {
    const guard = await createUser(Role.GUARD);
    const client = await createUser(Role.CLIENT);
    const guardAgent = await loginAs(guard.email);
    const clientAgent = await loginAs(client.email);

    for (const path of ['/api/users/guards', '/api/sites', '/api/clients', '/api/invoices', '/api/audit-logs', '/api/client/dashboard']) {
      expect((await guardAgent.get(path)).status, `guard ${path}`).toBe(403);
    }
    for (const path of ['/api/users/guards', '/api/sites', '/api/shifts', '/api/incidents', '/api/reports', '/api/auth/guards-lite']) {
      expect((await clientAgent.get(path)).status, `client ${path}`).toBe(403);
    }
  });

  it('only shows a client their own invoices', async () => {
    const admin = await createUser(Role.ADMIN);
    const alice = await createUser(Role.CLIENT);
    const bob = await createUser(Role.CLIENT);
    for (const client of [alice, bob]) {
      await prisma.invoice.create({
        data: { invoiceNumber: `INV-${client.id.slice(0, 6)}`, description: 'Guarding', amount: 100, currency: 'KES', dueDate: new Date(), clientId: client.id, issuedById: admin.id },
      });
    }
    const res = await (await loginAs(alice.email)).get('/api/invoices');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientId).toBe(alice.id);
  });

  it('blocks cross-site (CSRF) and origin-less state-changing requests', async () => {
    const admin = await createUser(Role.ADMIN);
    const agent = await loginAs(admin.email);
    const site = { name: 'Evil Site', address: '1 Evil Road' };

    expect((await agent.post('/api/sites').set('Origin', 'https://evil.example').send(site)).status).toBe(403);
    expect((await agent.post('/api/sites').send(site)).status).toBe(403);
    expect((await agent.post('/api/sites').set('Origin', ORIGIN).send(site)).status).toBe(201);
  });

  it('does not grant CORS to unknown origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app).get('/health').set('Origin', ORIGIN);
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('never leaks password hashes or session internals from user endpoints', async () => {
    const admin = await createUser(Role.ADMIN);
    await createUser(Role.GUARD);
    const agent = await loginAs(admin.email);
    const res = await agent.get('/api/users/guards');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/"password"|tokenVersion|failedLoginAttempts|\$2[aby]\$/);
  });

  it('prevents an admin from deactivating or demoting themselves', async () => {
    const admin = await createUser(Role.ADMIN);
    const agent = await loginAs(admin.email);
    expect((await agent.put(`/api/users/guards/${admin.id}`).set('Origin', ORIGIN).send({ status: 'INACTIVE' })).status).toBe(400);
    expect((await agent.put(`/api/users/guards/${admin.id}`).set('Origin', ORIGIN).send({ role: 'GUARD' })).status).toBe(400);
  });

  it('bounds list endpoints and reports the total', async () => {
    const admin = await createUser(Role.ADMIN);
    for (let i = 0; i < 3; i += 1) await createSite();
    const res = await (await loginAs(admin.email)).get('/api/sites?limit=2');
    expect(res.body).toHaveLength(2);
    expect(res.headers['x-total-count']).toBe('3');
  });

  it('writes an audit entry for admin changes and exposes it read-only', async () => {
    const admin = await createUser(Role.ADMIN);
    const agent = await loginAs(admin.email);
    const created = await agent.post('/api/sites').set('Origin', ORIGIN).send({ name: 'HQ', address: '1 Main St' });

    const logs = await agent.get(`/api/audit-logs?entityType=site&entityId=${created.body.id}`);
    expect(logs.status).toBe(200);
    expect(logs.body[0]).toMatchObject({ action: 'site.create', actorId: admin.id });
    expect((await agent.delete(`/api/audit-logs/${logs.body[0].id}`).set('Origin', ORIGIN)).status).toBe(404);
  });

  it('returns generic errors without internal details', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' }); // path is not echoed back
    const admin = await createUser(Role.ADMIN);
    const missing = await (await loginAs(admin.email)).put('/api/sites/not-a-real-id').set('Origin', ORIGIN).send({ name: 'Renamed' });
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body)).not.toMatch(/prisma|P2025|stack/i);
  });
});
