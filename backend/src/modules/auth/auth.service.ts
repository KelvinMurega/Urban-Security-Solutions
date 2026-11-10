// backend/src/modules/auth/auth.service.ts
import { Prisma, Role, UserStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JWT_AUDIENCE, JWT_ISSUER, signAccessToken } from '../../middleware/auth.middleware';
import { prisma } from '../../shared/prisma';
import { badRequest, forbidden, notFound } from '../../shared/http-error';
import { getDummyHash, hashPassword, normalizeEmail, verifyPassword } from '../../shared/password';
import { securityLog } from '../../shared/security-log';
import { deleteManagedUpload, isManagedUploadPath, persistAvatar } from '../../shared/uploads';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  site: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export type LoginResult =
  | { ok: true; user: { id: string; name: string; email: string; role: Role; avatarUrl: string | null; tokenVersion: number } }
  | { ok: false };

export class AuthService {
  // Every failure path returns the same generic result (and takes comparable time), so the
  // login endpoint never reveals whether an email exists, is locked, or is deactivated.
  static async login(emailInput: string, password: string, ip: string | undefined): Promise<LoginResult> {
    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await verifyPassword(password, await getDummyHash());
      securityLog('auth.login_failed', { reason: 'unknown_email', ip });
      return { ok: false };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await verifyPassword(password, await getDummyHash());
      securityLog('auth.login_failed', { reason: 'locked', userId: user.id, ip });
      return { ok: false };
    }

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      securityLog(lock ? 'auth.account_locked' : 'auth.login_failed', { reason: 'bad_password', userId: user.id, attempts, ip });
      return { ok: false };
    }

    if (user.status !== UserStatus.ACTIVE || !user.isActive) {
      securityLog('auth.login_inactive', { userId: user.id, ip });
      return { ok: false };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    securityLog('auth.login_success', { userId: user.id, role: user.role, ip });

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        tokenVersion: user.tokenVersion,
      },
    };
  }

  static generateToken(user: { id: string; role: Role; tokenVersion: number }) {
    return signAccessToken(user);
  }

  // Revokes every outstanding token for the user (used by logout).
  static async revokeSessionsFromToken(token: string | undefined) {
    if (!token) return;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as { sub?: string; tv?: number };
      if (!payload.sub) return;
      await prisma.user.updateMany({
        where: { id: payload.sub, tokenVersion: payload.tv },
        data: { tokenVersion: { increment: 1 } },
      });
      securityLog('auth.logout', { userId: payload.sub });
    } catch {
      // Expired/invalid token: nothing to revoke, the cookie is cleared regardless.
    }
  }

  // One-time bootstrap of the first admin. Disabled unless ENABLE_SETUP_REGISTRATION=true,
  // and refuses to run once any user exists.
  static async registerFirstAdmin(data: { name: string; email: string; password: string; phone?: string }, ip?: string) {
    if (!env.setupRegistrationEnabled) throw notFound();

    const user = await prisma.$transaction(async (tx) => {
      if ((await tx.user.count()) > 0) throw forbidden('Setup has already been completed.');
      return tx.user.create({
        data: {
          name: data.name,
          email: normalizeEmail(data.email),
          phone: data.phone,
          password: await hashPassword(data.password),
          passwordChangedAt: new Date(),
          role: Role.ADMIN,
          siteId: null,
        },
        select: { id: true, name: true, email: true, role: true, tokenVersion: true },
      });
    });
    securityLog('auth.setup_registration', { userId: user.id, ip });
    return user;
  }

  static async getProfile(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; currentPassword?: string; password?: string; avatarUrl?: string | null }
  ) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, password: true },
    });
    if (!existing) throw notFound('User not found.');

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    let passwordChanged = false;
    if (data.password) {
      // Re-authenticate before a password change so a hijacked session cannot take over the account.
      if (!data.currentPassword || !(await verifyPassword(data.currentPassword, existing.password))) {
        throw badRequest('Current password is incorrect.');
      }
      updateData.password = await hashPassword(data.password);
      updateData.passwordChangedAt = new Date();
      updateData.tokenVersion = { increment: 1 }; // sign out every other session
      passwordChanged = true;
    }

    let oldAvatarToDelete: string | null = null;
    if (data.avatarUrl !== undefined) {
      const incoming = String(data.avatarUrl || '').trim();
      if (!incoming) {
        updateData.avatarUrl = null;
        oldAvatarToDelete = existing.avatarUrl;
      } else if (incoming.startsWith('data:image/')) {
        updateData.avatarUrl = await persistAvatar(userId, incoming);
        oldAvatarToDelete = existing.avatarUrl;
      } else if (incoming === existing.avatarUrl && isManagedUploadPath(incoming, 'avatars')) {
        // unchanged
      } else {
        // Only server-managed uploads are accepted: no external URLs (tracking, mixed content).
        throw badRequest('Invalid avatar image.');
      }
    }

    const profile = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { ...PROFILE_SELECT, tokenVersion: true },
    });

    if (oldAvatarToDelete && oldAvatarToDelete !== profile.avatarUrl) {
      await deleteManagedUpload(oldAvatarToDelete, 'avatars');
    }
    if (passwordChanged) securityLog('account.password_changed', { userId });

    return { profile, passwordChanged };
  }

  static async getGuardDirectory() {
    return prisma.user.findMany({
      where: { role: Role.GUARD, status: UserStatus.ACTIVE, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }
}
