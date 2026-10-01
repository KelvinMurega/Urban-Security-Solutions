import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { persistImageDataUrls } from '../../shared/uploads';

const prisma = new PrismaClient();

export const createReport = async (data: any) => {
  const shift = await prisma.shift.findUnique({
    where: { id: String(data.shiftId) },
    select: { id: true, userId: true }
  });

  if (!shift) {
    throw new Error('Shift not found.');
  }

  if (shift.userId !== data.userId) {
    throw new Error('You can only submit logs for your own shifts.');
  }

  const id = randomUUID();
  const photoUrls = data.photos?.length
    ? await persistImageDataUrls('reports', id, data.photos)
    : undefined;

  return await prisma.report.create({
    data: {
      id,
      content: data.content,
      photoUrls,
      user: { connect: { id: data.userId } },
      shift: { connect: { id: shift.id } },
    },
  });
};

export const getReportsByShift = async (shiftId: string) => {
  return await prisma.report.findMany({
    where: { shiftId },
    include: {
      user: {
        select: { name: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getAllReports = async () => {
  return await prisma.report.findMany({
    include: {
      user: { select: { name: true } },
      shift: {
        include: {
          site: { select: { name: true } }
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getReportsByUser = async (userId: string) => {
  return await prisma.report.findMany({
    where: { userId },
    include: {
      user: { select: { name: true } },
      shift: {
        include: {
          site: { select: { name: true } }
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
