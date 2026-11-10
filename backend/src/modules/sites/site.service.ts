import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { badRequest, notFound } from '../../shared/http-error';

const assertManager = async (managerId?: string) => {
  if (!managerId) return;
  const manager = await prisma.user.findUnique({ where: { id: managerId }, select: { role: true, status: true } });
  if (!manager || manager.role === Role.CLIENT || manager.status !== UserStatus.ACTIVE) {
    throw badRequest('Selected manager is not a valid active staff member.');
  }
};

export const createSite = async (data: any) => {
  await assertManager(data.managerId);
  return await prisma.site.create({
    data: {
      name: data.name,
      address: data.address,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      ...(data.geofenceRadiusMeters !== undefined && { geofenceRadiusMeters: data.geofenceRadiusMeters }),
      // If a managerId is provided, connect it
      ...(data.managerId && {
        manager: { connect: { id: data.managerId } }
      })
    },
  });
};

export const getAllSites = async () => {
  return await prisma.site.findMany({
    include: {
      manager: {
        select: { id: true, name: true, email: true }
      },
      // We can see active shifts at this site
      shifts: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  siteId: true,
};

export const getSiteById = async (id: string) => {
  return await prisma.site.findUnique({
    where: { id },
    include: {
      manager: { select: USER_PUBLIC_SELECT },
      incidents: true,
      users: { select: USER_PUBLIC_SELECT }, // Include assigned guards
      shifts: {
        orderBy: { startTime: 'desc' },
        take: 5 // Last 5 shifts
      }
    },
  });
};

export const updateSite = async (id: string, data: any) => {
  await assertManager(data.managerId);
  return await prisma.site.update({
    where: { id },
    data: {
        name: data.name,
        address: data.address,
        location: data.location,
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.geofenceRadiusMeters !== undefined && { geofenceRadiusMeters: data.geofenceRadiusMeters }),
        // Only update manager if provided
        ...(data.managerId && {
            manager: { connect: { id: data.managerId } }
        })
    },
  });
};

export const deleteSite = async (id: string) => {
  return await prisma.site.delete({
    where: { id },
  });
};

export const addGuardToSite = async (siteId: string, data: any) => {
  const guardId = String(data.userId || data.guardId || '').trim();
  if (!guardId) {
    throw badRequest('guardId is required.');
  }

  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) {
    throw notFound('Site not found.');
  }

  const guard = await prisma.user.findUnique({
    where: { id: guardId },
    select: { id: true, role: true, status: true }
  });

  if (!guard) {
    throw notFound('Guard not found.');
  }

  if (guard.role !== Role.GUARD) {
    throw badRequest('Only GUARD users can be assigned to a site.');
  }

  if (guard.status !== UserStatus.ACTIVE) {
    throw badRequest('Cannot assign an inactive guard.');
  }

  return await prisma.user.update({
    where: { id: guardId },
    data: { siteId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      siteId: true
    }
  });
};
