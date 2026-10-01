import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CLIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  clientSites: {
    include: {
      site: { select: { id: true, name: true, address: true } },
    },
    orderBy: { assignedAt: 'asc' as const },
  },
};

export const getClients = () => prisma.user.findMany({
  where: { role: Role.CLIENT },
  select: CLIENT_SELECT,
  orderBy: { createdAt: 'desc' },
});

export const createClient = async (data: { name: string; email: string; password: string; phone?: string }) => {
  try {
    return await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: await bcrypt.hash(data.password, 10),
        phone: data.phone?.trim() || null,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
      },
      select: CLIENT_SELECT,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new Error('A user with this email already exists.');
    throw error;
  }
};

export const replaceClientSites = async (clientId: string, requestedSiteIds: string[]) => {
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true },
  });
  if (!client || client.role !== Role.CLIENT) throw new Error('Client not found.');

  const siteIds = [...new Set(requestedSiteIds)];
  const siteCount = siteIds.length
    ? await prisma.site.count({ where: { id: { in: siteIds } } })
    : 0;
  if (siteCount !== siteIds.length) throw new Error('One or more selected sites do not exist.');

  await prisma.$transaction([
    prisma.clientSite.deleteMany({ where: { clientId } }),
    ...(siteIds.length
      ? [prisma.clientSite.createMany({ data: siteIds.map((siteId) => ({ clientId, siteId })) })]
      : []),
  ]);

  return prisma.user.findUnique({ where: { id: clientId }, select: CLIENT_SELECT });
};