import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const createUser = async (data: any) => {
  // Prevent more than one admin
  if (data.role === 'ADMIN' || data.role === Role.ADMIN) {
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (existingAdmin) {
      throw new Error('Only one admin is allowed.');
    }
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role || Role.GUARD,
      siteId: data.siteId || undefined,
    },
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
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