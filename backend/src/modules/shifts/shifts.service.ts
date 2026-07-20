import { PrismaClient } from '@prisma/client';
import { distanceMeters } from '../../shared/geo';

const prisma = new PrismaClient();

const HANDOVER_INCLUDE = {
  user: { select: { name: true, email: true } },
  site: { select: { name: true } },
  checkInFromUser: { select: { id: true, name: true } },
  checkOutToUser: { select: { id: true, name: true } },
};

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
      include: HANDOVER_INCLUDE
    });
  }

  // 2. Get All Shifts (Sorted by newest)
  static async getAllShifts() {
    const shifts = await prisma.shift.findMany({
      include: HANDOVER_INCLUDE,
      orderBy: { startTime: 'desc' }
    });

    return shifts.map((shift) => this.withWorkedHours(shift));
  }

  static async getShiftsByUser(userId: string) {
    const shifts = await prisma.shift.findMany({
      where: { userId },
      include: HANDOVER_INCLUDE,
      orderBy: { startTime: 'desc' }
    });

    return shifts.map((shift) => this.withWorkedHours(shift));
  }

  // Enforces the site's geofence when both the site and the submitted position have
  // coordinates; returns the distance (or null when no geofence could be evaluated).
  private static enforceGeofence(
    site: { latitude: number | null; longitude: number | null; geofenceRadiusMeters: number; name: string },
    lat: number,
    lng: number
  ) {
    if (site.latitude === null || site.longitude === null) {
      return null;
    }

    const distance = distanceMeters(site.latitude, site.longitude, lat, lng);
    if (distance > site.geofenceRadiusMeters) {
      throw new Error(
        `You are ${Math.round(distance)}m from ${site.name}. You must be within ${site.geofenceRadiusMeters}m to do this.`
      );
    }

    return distance;
  }

  static async checkInShift(
    shiftId: string,
    guardId: string,
    { lat, lng, previousGuardId }: { lat: number; lng: number; previousGuardId?: string }
  ) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { site: true } });
    if (!shift) {
      throw new Error('Shift not found.');
    }
    if (shift.userId !== guardId) {
      throw new Error('You can only check in to your own shift.');
    }
    if (shift.checkedInAt) {
      throw new Error('Shift is already checked in.');
    }

    const distance = this.enforceGeofence(shift.site, lat, lng);

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedInAt: new Date(),
        checkInLat: lat,
        checkInLng: lng,
        checkInFromUserId: previousGuardId || null,
        status: 'ACTIVE'
      },
      include: HANDOVER_INCLUDE
    });

    return { ...this.withWorkedHours(updated), checkInDistanceMeters: distance !== null ? Math.round(distance) : null };
  }

  static async checkOutShift(
    shiftId: string,
    guardId: string,
    { lat, lng, nextGuardId }: { lat: number; lng: number; nextGuardId?: string }
  ) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { site: true } });
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

    const distance = this.enforceGeofence(shift.site, lat, lng);

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedOutAt: new Date(),
        checkOutLat: lat,
        checkOutLng: lng,
        checkOutToUserId: nextGuardId || null,
        status: 'COMPLETED'
      },
      include: HANDOVER_INCLUDE
    });

    return { ...this.withWorkedHours(updated), checkOutDistanceMeters: distance !== null ? Math.round(distance) : null };
  }
}
