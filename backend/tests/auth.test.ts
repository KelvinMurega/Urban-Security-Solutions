import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role, UserStatus } from '@prisma/client';
import { app, createUser, loginAs, ORIGIN, PASSWORD, resetDatabase } from './helpers';
import { prisma } from '../src/shared/prisma';

describe('authentication', () => {
  beforeEach(resetDatabase);

  it('logs in with an httpOnly cookie and never returns the token in the body', async () => {
    const admin = await createUser(Role.ADMIN);
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: admin.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.body.user).toMatchObject({ id: admin.id, role: 'ADMIN' });
    expect(res.body.user.password).toBeUndefined();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('accepts the email case-insensitively', async () => {
    const admin = await createUser(Role.ADMIN, { email: 'boss@test.local' });
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: '  BOSS@Test.Local ', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(admin.id);
  });

  it('returns the same generic error for unknown email, wrong password and inactive accounts', async () => {
    const active = await createUser(Role.GUARD);
    const inactive = await createUser(Role.GUARD, { status: UserStatus.INACTIVE });
    const attempts = [
      { email: 'nobody@test.local', password: PASSWORD },
      { email: active.email, password: 'wrong-password-123' },
      { email: inactive.email, password: PASSWORD },
    ];
    for (const body of attempts) {
      const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send(body);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid email or password.' });
    }
  });

  it('locks the account after 5 failed attempts, even for the right password', async () => {
    const guard = await createUser(Role.GUARD);
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: guard.email, password: 'wrong-password-123' });
    }
    const locked = await prisma.user.findUniqueOrThrow({ where: { id: guard.id } });
    expect(locked.lockedUntil).not.toBeNull();

    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: guard.email, password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects requests immediately after the account is deactivated', async () => {
    const guard = await createUser(Role.GUARD);
    const agent = await loginAs(guard.email);
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    await prisma.user.update({ where: { id: guard.id }, data: { status: UserStatus.INACTIVE } });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('revokes the session on logout, so a copied cookie stops working', async () => {
    const guard = await createUser(Role.GUARD);
    const login = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: guard.email, password: PASSWORD });
    const cookie = login.headers['set-cookie'];

    await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(replay.status).toBe(401);
  });

  it('requires the current password to change password, and signs out other sessions', async () => {
    const guard = await createUser(Role.GUARD);
    const phone = await loginAs(guard.email);
    const laptop = await loginAs(guard.email);

    const noCurrent = await laptop.put('/api/auth/me').set('Origin', ORIGIN).send({ password: 'a-brand-new-passphrase' });
    expect(noCurrent.status).toBe(400);

    const changed = await laptop
      .put('/api/auth/me')
      .set('Origin', ORIGIN)
      .send({ currentPassword: PASSWORD, password: 'a-brand-new-passphrase' });
    expect(changed.status).toBe(200);

    expect((await laptop.get('/api/auth/me')).status).toBe(200); // re-issued cookie
    expect((await phone.get('/api/auth/me')).status).toBe(401); // other session revoked
    await loginAs(guard.email, 'a-brand-new-passphrase');
  });

  it('rejects forged and tampered tokens', async () => {
    const admin = await createUser(Role.ADMIN);
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: admin.id, role: 'ADMIN', tv: 0 })).toString('base64url')}.`;
    const wrongKey = jwt.sign({ role: 'ADMIN', tv: 0 }, 'attacker-key-attacker-key-attacker-key', {
      subject: admin.id,
      issuer: 'urban-security-api',
      audience: 'urban-security-app',
    });
    for (const token of [none, wrongKey]) {
      const res = await request(app).get('/api/users/guards').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('keeps public registration disabled by default', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', ORIGIN)
      .send({ name: 'Mallory', email: 'mallory@test.local', password: 'i-want-to-be-admin' });
    expect(res.status).toBe(404);
    expect(await prisma.user.count()).toBe(0);
  });
});
