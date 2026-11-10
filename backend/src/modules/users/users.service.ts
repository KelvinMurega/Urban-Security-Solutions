import { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../shared/http-error';
import { hashPassword, normalizeEmail } from '../../shared/password';
import { securityLog } from '../../shared/security-log';

// Every User read in this module must exclude secrets (password hash, tokenVersion, lockout state).
const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  siteId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;


type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: 'ADMIN' | 'GUARD';
  siteId?: string;
};

type UpdateUserInput = Partial<CreateUserInput> & { status?: 'ACTIVE' | 'INACTIVE' };

const assertSiteExists = async (siteId: string) => {
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) throw badRequest('Selected site does not exist.');
};

export const unassignAdminsFromSites = async () => {
  return prisma.user.updateMany({
    where: { role: Role.ADMIN, siteId: { not: null } },
    data: { siteId: null },
  });
};

export const createUser = async (data: CreateUserInput, actorId: string) => {
  const role: Role = data.role === 'ADMIN' ? Role.ADMIN : Role.GUARD; // least privilege default

  if (role === Role.ADMIN) {
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true } });
    if (existingAdmin) throw conflict('Only one admin is allowed.');
    if (data.siteId) throw badRequest('Admin cannot be assigned to a site.');
  }
  if (data.siteId) await assertSiteExists(data.siteId);

  try {
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(data.email),
        password: await hashPassword(data.password),
        passwordChangedAt: new Date(),
        name: data.name,
        phone: data.phone,
        role,
        status: UserStatus.ACTIVE,
        siteId: role === Role.ADMIN ? null : data.siteId || null,
      },
      select: USER_SAFE_SELECT,
    });
    securityLog('account.created', { actorId, userId: user.id, role });
    return user;
  } catch (error: any) {
    if (error?.code === 'P2002') throw conflict('A user with this email already exists.');
    throw error;
  }
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    where: { role: Role.GUARD },
    select: {
      ...USER_SAFE_SELECT,
      managedSites: true,
      site: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_SAFE_SELECT,
      managedSites: true,
      site: true,
      incidents: { orderBy: { createdAt: 'desc' } },
      reports: { orderBy: { createdAt: 'desc' } },
    },
  });
};

export const updateUser = async (id: string, data: UpdateUserInput, actor: { id: string; role: Role }) => {
  const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
  if (!existingUser) throw notFound('User not found.');

  // Client accounts are managed through the clients module only.
  if (existingUser.role === Role.CLIENT) throw forbidden('Client accounts are managed from the Clients page.');

  // Prevent an admin from locking themselves out or demoting the only admin.
  if (id === actor.id) {
    if (data.role !== undefined && data.role !== existingUser.role) throw badRequest('You cannot change your own role.');
    if (data.status === 'INACTIVE') throw badRequest('You cannot deactivate your own account.');
    // Own password changes must go through PUT /api/auth/me, which re-verifies the current password.
    if (data.password) throw badRequest('Change your own password from your profile page.');
  }

  if (data.role === 'ADMIN' && existingUser.role !== Role.ADMIN) {
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN, NOT: { id } }, select: { id: true } });
    if (existingAdmin) throw conflict('Only one admin is allowed.');
  }

  const resultingRole: Role = data.role ? (data.role as Role) : existingUser.role;
  const updateData: Prisma.UserUncheckedUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = normalizeEmail(data.email);
  if (data.role !== undefined) updateData.role = resultingRole;
  if (data.status !== undefined) {
    updateData.status = data.status as UserStatus;
    updateData.isActive = data.status === 'ACTIVE';
  }

  if (resultingRole === Role.ADMIN) {
    if (data.siteId) throw badRequest('Admin cannot be assigned to a site.');
    updateData.siteId = null;
  } else if (data.siteId !== undefined) {
    if (data.siteId) await assertSiteExists(data.siteId);
    updateData.siteId = data.siteId || null;
  }

  // Any change to credentials, privileges or account state revokes existing sessions.
  const emailChanged = data.email !== undefined && normalizeEmail(data.email) !== existingUser.email;
  const roleChanged = data.role !== undefined && data.role !== existingUser.role;
  const revokesSessions = Boolean(data.password) || roleChanged || data.status === 'INACTIVE' || emailChanged;
  if (data.password) {
    updateData.password = await hashPassword(data.password);
    updateData.passwordChangedAt = new Date();
    updateData.failedLoginAttempts = 0;
    updateData.lockedUntil = null;
  }
  if (revokesSessions) updateData.tokenVersion = { increment: 1 };

  try {
    const user = await prisma.user.update({ where: { id }, data: updateData, select: USER_SAFE_SELECT });
    securityLog('account.updated', {
      actorId: actor.id,
      userId: id,
      fields: Object.keys(data).filter((key) => key !== 'password').concat(data.password ? ['password'] : []),
    });
    return user;
  } catch (error: any) {
    if (error?.code === 'P2002') throw conflict('A user with this email already exists.');
    throw error;
  }
};

export const deactivateUser = async (id: string, actorId: string) => {
  if (id === actorId) throw badRequest('You cannot deactivate your own account.');
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false, status: UserStatus.INACTIVE, tokenVersion: { increment: 1 } },
    select: { id: true },
  });
  securityLog('account.updated', { actorId, userId: id, fields: ['status'] });
  return user;
};
