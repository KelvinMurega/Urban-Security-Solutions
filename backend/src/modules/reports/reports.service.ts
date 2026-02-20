import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createReport = async (data: any) => {
  return await prisma.report.create({
    data: {
      content: data.content,
      user: { connect: { id: data.userId } },
      shift: { connect: { id: data.shiftId } },
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
      shift: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};