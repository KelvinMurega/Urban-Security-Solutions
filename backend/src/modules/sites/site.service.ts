import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export const createSite = async (data: any) => {
  return await prisma.site.create({
    data: {
      name: data.name,
      address: data.address,
      location: data.location,
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

export const getSiteById = async (id: string) => {
  return await prisma.site.findUnique({
    where: { id },
    include: {
      manager: true,
      incidents: true,
      users: true, // Include assigned guards
      shifts: {
        orderBy: { startTime: 'desc' },
        take: 5 // Last 5 shifts
      }
    },
  });
};

export const updateSite = async (id: string, data: any) => {
  return await prisma.site.update({
    where: { id },
    data: {
        name: data.name,
        address: data.address,
        location: data.location,
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
    throw new Error('guardId is required.');
  }

  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) {
    throw new Error('Site not found.');
  }

  const guard = await prisma.user.findUnique({
    where: { id: guardId },
    select: { id: true, role: true, status: true }
  });

  if (!guard) {
    throw new Error('Guard not found.');
  }

  if (guard.role !== Role.GUARD) {
    throw new Error('Only GUARD users can be assigned to a site.');
  }

  if (guard.status !== 'ACTIVE') {
    throw new Error('Cannot assign an inactive guard.');
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
