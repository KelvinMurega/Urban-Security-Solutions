import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { badRequest, conflict, notFound } from '../../shared/http-error';
import { hashPassword, normalizeEmail } from '../../shared/password';
import { Page } from '../../shared/pagination';

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

export const getClients = (page: Page) => Promise.all([
  prisma.user.findMany({ where: { role: Role.CLIENT }, select: CLIENT_SELECT, orderBy: { createdAt: 'desc' }, ...page }),
  prisma.user.count({ where: { role: Role.CLIENT } }),
]);

export const createClient = async (data: { name: string; email: string; password: string; phone?: string }) => {
  try {
    return await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizeEmail(data.email),
        password: await hashPassword(data.password),
        passwordChangedAt: new Date(),
        phone: data.phone?.trim() || null,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
      },
      select: CLIENT_SELECT,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') throw conflict('A user with this email already exists.');
    throw error;
  }
};

export const replaceClientSites = async (clientId: string, requestedSiteIds: string[]) => {
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true },
  });
  if (!client || client.role !== Role.CLIENT) throw notFound('Client not found.');

  const siteIds = [...new Set(requestedSiteIds)];
  const siteCount = siteIds.length
    ? await prisma.site.count({ where: { id: { in: siteIds } } })
    : 0;
  if (siteCount !== siteIds.length) throw badRequest('One or more selected sites do not exist.');

  await prisma.$transaction([
    prisma.clientSite.deleteMany({ where: { clientId } }),
    ...(siteIds.length
      ? [prisma.clientSite.createMany({ data: siteIds.map((siteId) => ({ clientId, siteId })) })]
      : []),
  ]);

  return prisma.user.findUnique({ where: { id: clientId }, select: CLIENT_SELECT });
};