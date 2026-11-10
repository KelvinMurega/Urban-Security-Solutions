import { randomUUID } from 'crypto';
import { prisma } from '../../shared/prisma';
import { forbidden, notFound } from '../../shared/http-error';
import { persistImageDataUrls } from '../../shared/uploads';
import { Page } from '../../shared/pagination';

export const createReport = async (data: any) => {
  const shift = await prisma.shift.findUnique({
    where: { id: String(data.shiftId) },
    select: { id: true, userId: true }
  });

  if (!shift) {
    throw notFound('Shift not found.');
  }

  if (shift.userId !== data.userId) {
    throw forbidden('You can only submit logs for your own shifts.');
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

export const getAllReports = async (page: Page) => {
  return Promise.all([prisma.report.findMany({
    ...page,
    include: {
      user: { select: { name: true } },
      shift: {
        include: {
          site: { select: { name: true } }
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  }), prisma.report.count()]);
};

export const getReportsByUser = async (userId: string, page: Page) => {
  return Promise.all([prisma.report.findMany({
    ...page,
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
  }), prisma.report.count({ where: { userId } })]);
};
