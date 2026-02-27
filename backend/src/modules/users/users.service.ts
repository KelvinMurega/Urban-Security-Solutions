import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const unassignAdminsFromSites = async () => {
  return await prisma.user.updateMany({
    where: {
      role: Role.ADMIN,
      siteId: { not: null }
    },
    data: {
      siteId: null
    }
  });
};

export const createUser = async (data: any) => {
  const normalizedEmail = String(data.email || '').trim().toLowerCase();
  const incomingRole: Role = (data.role as Role) || Role.GUARD;

  // Prevent more than one admin
  if (incomingRole === Role.ADMIN) {
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (existingAdmin) {
      throw new Error('Only one admin is allowed.');
    }
    if (data.siteId) {
      throw new Error('Admin cannot be assigned to a site.');
    }
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);

  try {
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: incomingRole,
        status: data.status || 'ACTIVE',
        siteId: incomingRole === Role.ADMIN ? undefined : data.siteId || undefined,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new Error('A user with this email already exists.');
    }
    throw error;
  }
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    where: {
      role: Role.GUARD,
    },
    include: {
      managedSites: true,
      site: true, // Include assigned site
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      managedSites: true,
      site: true, // Include assigned site
      incidents: {
        orderBy: { createdAt: 'desc' }
      },
      reports: {
        orderBy: { createdAt: 'desc' }
      },
    },
  });
};

export const updateUser = async (id: string, data: any, actingUser?: any) => {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true }
  });

  if (!existingUser) {
    throw new Error('User not found.');
  }

  if (data.role !== undefined) {
    if (!actingUser || actingUser.role !== Role.ADMIN) {
      throw new Error('Only admin can change user roles.');
    }
    // Prevent more than one admin
    if (data.role === 'ADMIN' || data.role === Role.ADMIN) {
      const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN, NOT: { id } } });
      if (existingAdmin) {
        throw new Error('Only one admin is allowed.');
      }
    }
  }

  const resultingRole: Role = (data.role as Role) || existingUser.role;
  if (resultingRole === Role.ADMIN) {
    if (data.siteId !== undefined && data.siteId !== null && data.siteId !== '') {
      throw new Error('Admin cannot be assigned to a site.');
    }
    data.siteId = null;
  }

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return await prisma.user.update({
    where: { id },
    data: {
      ...data,
      phone: data.phone,
    },
  });
};

export const deleteUser = async (id: string) => {
  return await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
};

export const login = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw new Error('Invalid email or password');
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
