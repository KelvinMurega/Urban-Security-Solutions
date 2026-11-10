import { Role, UserStatus } from '@prisma/client';
import { distanceMeters } from '../../shared/geo';
import { prisma } from '../../shared/prisma';
import { badRequest, forbidden, notFound } from '../../shared/http-error';
import { Page } from '../../shared/pagination';
import { securityLog } from '../../shared/security-log';

// Device/network evidence captured with every check-in/out.
export type PositionEvidence = {
  lat: number;
  lng: number;
  accuracy?: number;
  ip?: string;
  userAgent?: string;
};

const EARLY_CHECK_IN_MINUTES = 120;

// Phones can spoof GPS. We cannot prove a location, so we record the evidence and flag
// patterns a supervisor should review rather than silently trusting the coordinates.
const locationFlagReasons = (
  site: { latitude: number | null; longitude: number | null; geofenceRadiusMeters: number },
  evidence: PositionEvidence,
  timing?: { startTime: Date; endTime: Date | null; now: Date }
) => {
  const reasons: string[] = [];
  if (site.latitude === null || site.longitude === null) reasons.push('site has no geofence coordinates');
  if (evidence.accuracy === undefined) reasons.push('device did not report GPS accuracy');
  else if (evidence.accuracy > site.geofenceRadiusMeters) reasons.push(`GPS accuracy ${Math.round(evidence.accuracy)}m exceeds geofence`);
  else if (evidence.accuracy === 0) reasons.push('GPS accuracy of 0m is typical of mock locations');
  if (Number.isInteger(evidence.lat) && Number.isInteger(evidence.lng)) reasons.push('coordinates look synthetic');
  if (timing) {
    const minutesEarly = (timing.startTime.getTime() - timing.now.getTime()) / 60_000;
    if (minutesEarly > EARLY_CHECK_IN_MINUTES) reasons.push(`checked in ${Math.round(minutesEarly)} minutes before shift start`);
    if (timing.endTime && timing.now > timing.endTime) reasons.push('checked in after scheduled shift end');
  }
  return reasons;
};

const mergeFlags = (existing: string | null, reasons: string[]) =>
  [existing, ...reasons].filter(Boolean).join('; ').slice(0, 255) || null;

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
  static async getAllShifts(page: Page) {
    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({ include: HANDOVER_INCLUDE, orderBy: { startTime: 'desc' }, ...page }),
      prisma.shift.count(),
    ]);
    return [shifts.map((shift) => this.withWorkedHours(shift)), total] as const;
  }

  static async getShiftsByUser(userId: string, page: Page) {
    const where = { userId };
    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({ where, include: HANDOVER_INCLUDE, orderBy: { startTime: 'desc' }, ...page }),
      prisma.shift.count({ where }),
    ]);
    return [shifts.map((shift) => this.withWorkedHours(shift)), total] as const;
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
    { previousGuardId, ...evidence }: PositionEvidence & { previousGuardId?: string }
  ) {
    const { lat, lng } = evidence;
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
    const checkInFlags = locationFlagReasons(shift.site, evidence, {
      startTime: shift.startTime,
      endTime: shift.endTime,
      now: new Date(),
    });
    if (checkInFlags.length) securityLog('shift.location_flagged', { shiftId, guardId, reasons: checkInFlags });

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedInAt: new Date(),
        checkInLat: lat,
        checkInLng: lng,
        checkInAccuracyMeters: evidence.accuracy ?? null,
        checkInIp: evidence.ip?.slice(0, 45) ?? null,
        checkInUserAgent: evidence.userAgent?.slice(0, 255) ?? null,
        locationFlagged: checkInFlags.length > 0,
        locationFlagReason: mergeFlags(null, checkInFlags.map((reason) => `check-in: ${reason}`)),
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
    { nextGuardId, ...evidence }: PositionEvidence & { nextGuardId?: string }
  ) {
    const { lat, lng } = evidence;
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
    const checkOutFlags = locationFlagReasons(shift.site, evidence);
    if (checkOutFlags.length) securityLog('shift.location_flagged', { shiftId, guardId, reasons: checkOutFlags });

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        checkedOutAt: new Date(),
        checkOutLat: lat,
        checkOutLng: lng,
        checkOutAccuracyMeters: evidence.accuracy ?? null,
        checkOutIp: evidence.ip?.slice(0, 45) ?? null,
        checkOutUserAgent: evidence.userAgent?.slice(0, 255) ?? null,
        locationFlagged: shift.locationFlagged || checkOutFlags.length > 0,
        locationFlagReason: mergeFlags(shift.locationFlagReason, checkOutFlags.map((reason) => `check-out: ${reason}`)),
        checkOutToUserId: nextGuardId || null,
        status: 'COMPLETED'
      },
      include: HANDOVER_INCLUDE
    });

    return { ...this.withWorkedHours(updated), checkOutDistanceMeters: distance !== null ? Math.round(distance) : null };
  }
}
