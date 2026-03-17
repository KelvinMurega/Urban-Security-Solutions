import { PrismaClient } from '@prisma/client';

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

  return await prisma.report.create({
    data: {
      content: data.content,
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
