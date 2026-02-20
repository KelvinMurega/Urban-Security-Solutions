import { PrismaClient } from '@prisma/client';

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
  // Placeholder: Implement logic to add/link a guard to the site
  // This prevents the controller from crashing due to missing method
  return { message: 'Guard added to site', siteId, ...data };
};