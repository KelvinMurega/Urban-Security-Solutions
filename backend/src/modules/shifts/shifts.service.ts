import { Role, UserStatus } from '@prisma/client';
import { distanceMeters } from '../../shared/geo';
import { prisma } from '../../shared/prisma';
import { badRequest, forbidden, notFound } from '../../shared/http-error';

const MAX_SHIFT_HOURS = 24;

// Handover partners must be real, active guards other than the caller.
const assertHandoverGuard = async (guardId: string | undefined, selfId: string) => {
  if (!guardId) return;
  if (guardId === selfId) throw badRequest('You cannot hand over to yourself.');
  const guard = await prisma.user.findUnique({ where: { id: guardId }, select: { role: true, status: true, isActive: true } });
  if (!guard || guard.role !== Role.GUARD || guard.status !== UserStatus.ACTIVE || !guard.isActive) {
    throw badRequest('Handover guard is not an active guard.');
  }
};

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

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw badRequest('Valid start and end times are required.');
    }
    if (end <= start) {
      throw badRequest('End time must be after start time');
    }
    if (end.getTime() - start.getTime() > MAX_SHIFT_HOURS * 3_600_000) {
      throw badRequest(`A shift cannot be longer than ${MAX_SHIFT_HOURS} hours.`);
    }

    const [guard, site] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId }, select: { role: true, status: true, isActive: true } }),
      prisma.site.findUnique({ where: { id: data.siteId }, select: { id: true } }),
    ]);
    if (!guard || guard.role !== Role.GUARD || guard.status !== UserStatus.ACTIVE || !guard.isActive) {
      throw badRequest('Shifts can only be assigned to active guards.');
    }
    if (!site) throw badRequest('Selected site does not exist.');

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
      throw badRequest(
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
      throw notFound('Shift not found.');
    }
    if (shift.userId !== guardId) {
      throw forbidden('You can only check in to your own shift.');
    }
    if (shift.checkedInAt) {
      throw badRequest('Shift is already checked in.');
    }
    if (shift.status === 'CANCELLED') {
      throw badRequest('This shift has been cancelled.');
    }
    await assertHandoverGuard(previousGuardId, guardId);

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
      throw notFound('Shift not found.');
    }
    if (shift.userId !== guardId) {
      throw forbidden('You can only check out of your own shift.');
    }
    if (!shift.checkedInAt) {
      throw badRequest('You must check in before checking out.');
    }
    if (shift.checkedOutAt) {
      throw badRequest('Shift is already checked out.');
    }
    await assertHandoverGuard(nextGuardId, guardId);

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
