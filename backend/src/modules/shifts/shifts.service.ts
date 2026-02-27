import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ShiftService {
  private static withWorkedHours<T extends { checkedInAt: Date | null; checkedOutAt: Date | null }>(shift: T) {
    const startedAt = shift.checkedInAt ? new Date(shift.checkedInAt).getTime() : null;
    const endedAt = shift.checkedOutAt ? new Date(shift.checkedOutAt).getTime() : Date.now();

    const workedHours =
      startedAt !== null && endedAt >= startedAt
        ? Number(((endedAt - startedAt) / (1000 * 60 * 60)).toFixed(2))
        : 0;

    return {
      ...shift,
      workedHours
    };
  }
  
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
    const shifts = await prisma.shift.findMany({
      include: {
        user: { select: { name: true, email: true } },
        site: { select: { name: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    return shifts.map((shift) => this.withWorkedHours(shift));
  }

  static async checkInShift(shiftId: string, guardId: string, previousGuardName: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      throw new Error('Shift not found.');
    }
    if (shift.userId !== guardId) {
      throw new Error('You can only check in to your own shift.');
    }
    if (shift.checkedInAt) {
      throw new Error('Shift is already checked in.');
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedInAt: new Date(),
        checkInFromGuardName: previousGuardName,
        status: 'ACTIVE'
      },
      include: {
        user: { select: { name: true, email: true } },
        site: { select: { name: true } }
      }
    });

    return this.withWorkedHours(updated);
  }

  static async checkOutShift(shiftId: string, guardId: string, nextGuardName: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      throw new Error('Shift not found.');
    }
    if (shift.userId !== guardId) {
      throw new Error('You can only check out of your own shift.');
    }
    if (!shift.checkedInAt) {
      throw new Error('You must check in before checking out.');
    }
    if (shift.checkedOutAt) {
      throw new Error('Shift is already checked out.');
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedOutAt: new Date(),
        checkOutToGuardName: nextGuardName,
        status: 'COMPLETED'
      },
      include: {
        user: { select: { name: true, email: true } },
        site: { select: { name: true } }
      }
    });

    return this.withWorkedHours(updated);
  }
}
