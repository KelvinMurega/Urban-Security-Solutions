import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ShiftService {
  
  // 1. Create a Shift
  static async createShift(data: any) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      throw new Error('End time must be after start time');
    }

    return await prisma.shift.create({
      data: {
        userId: data.userId,
        siteId: data.siteId,
        startTime: start,
        endTime: end,
        status: 'SCHEDULED' // Default status
      },
      include: {
        user: true, // Return the guard's name
        site: true  // Return the site's name
      }
    });
  }

  // 2. Get All Shifts (Sorted by newest)
  static async getAllShifts() {
    return await prisma.shift.findMany({
      include: {
        user: { select: { name: true, email: true } },
        site: { select: { name: true } }
      },
      orderBy: { startTime: 'desc' }
    });
  }
}