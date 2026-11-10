import { IncidentSeverity, Role, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../shared/prisma';
import { badRequest, forbidden } from '../../shared/http-error';
import { persistImageDataUrls } from '../../shared/uploads';

// A guard may only report incidents for a site they are assigned to or have a shift at.
const assertGuardWorksAtSite = async (guardId: string, siteId: string) => {
  const [assigned, shift] = await Promise.all([
    prisma.user.findFirst({ where: { id: guardId, siteId }, select: { id: true } }),
    prisma.shift.findFirst({ where: { userId: guardId, siteId }, select: { id: true } }),
  ]);
  if (!assigned && !shift) throw forbidden('You can only report incidents for sites you work at.');
};

export const createIncident = async (data: any, actor: { id: string; role: Role }) => {
  const site = await prisma.site.findUnique({ where: { id: data.siteId }, select: { id: true } });
  if (!site) throw badRequest('Selected site does not exist.');

  if (actor.role === Role.GUARD) {
    await assertGuardWorksAtSite(actor.id, data.siteId);
  } else {
    const reporter = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true, status: true } });
    if (!reporter || reporter.role === Role.CLIENT || reporter.status !== UserStatus.ACTIVE) {
      throw badRequest('Reporter must be an active staff member.');
    }
  }

  const id = randomUUID();
  const photoUrls = data.photos?.length
    ? await persistImageDataUrls('incidents', id, data.photos)
    : undefined;

  return await prisma.incident.create({
    data: {
      id,
      title: data.title,
      description: data.description,
      // Default to MEDIUM if invalid
      severity: (data.severity as IncidentSeverity) || IncidentSeverity.MEDIUM,
      status: 'OPEN',
      photoUrls,
      user: { connect: { id: data.userId } },
      site: { connect: { id: data.siteId } },
    },
  });
};

export const getAllIncidents = async () => {
  return await prisma.incident.findMany({
    include: {
      user: { select: { name: true, role: true } },
      site: { select: { name: true } },
    },
    orderBy: {
      createdAt: 'desc', // Use the audit field
    },
  });
};

export const getIncidentById = async (id: string) => {
  return await prisma.incident.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      site: true,
    },
  });
};

export const updateIncident = async (id: string, data: any) => {
  return await prisma.incident.update({
    where: { id },
    data: {
      status: data.status,
      resolutionDetails: data.resolutionDetails,
    },
  });
};

export const getIncidentsByUser = async (userId: string) => {
  return await prisma.incident.findMany({
    where: { userId },
    include: {
      user: { select: { name: true, role: true } },
      site: { select: { name: true } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};
