import { PrismaClient, IncidentSeverity } from '@prisma/client';
import { randomUUID } from 'crypto';
import { persistImageDataUrls } from '../../shared/uploads';

const prisma = new PrismaClient();

export const createIncident = async (data: any) => {
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
