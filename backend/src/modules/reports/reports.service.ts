import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportService {
  
  // 1. Create Report
  static async createReport(data: any) {
    return await prisma.shiftReport.create({
      data: {
        content: data.content,
        userId: data.userId,
        siteId: data.siteId
      }
    });
  }

  // 2. Get All Reports (Newest first)
  static async getAllReports() {
    return await prisma.shiftReport.findMany({
      include: {
        user: { select: { name: true } },
        site: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}