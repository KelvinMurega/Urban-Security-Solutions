import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ShiftService } from './shifts.service';
import { z } from 'zod';
import { sendError } from '../../shared/http-error';
import { recordAudit } from '../../shared/audit';
import { parsePage, sendPage } from '../../shared/pagination';

const shiftCreateSchema = z.object({
  userId: z.string().min(1).max(64),
  siteId: z.string().min(1).max(64),
  startTime: z.string().min(1).max(40),
  endTime: z.string().min(1).max(40),
});

const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
  previousGuardId: z.string().min(1).max(64).optional(),
});

const checkOutSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
  nextGuardId: z.string().min(1).max(64).optional(),
});

export class ShiftController {

  static async create(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (actor.role !== Role.ADMIN) {
        return res.status(403).json({ error: 'Only admins can assign shifts.' });
      }

      const parsed = shiftCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const shift = await ShiftService.createShift(parsed.data);
      await recordAudit(req, {
        action: 'shift.create',
        entityType: 'shift',
        entityId: shift.id,
        metadata: { guardId: shift.userId, siteId: shift.siteId, startTime: parsed.data.startTime, endTime: parsed.data.endTime },
      });
      res.status(201).json(shift);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const page = parsePage(req);
      const result =
        actor.role === Role.ADMIN
          ? await ShiftService.getAllShifts(page)
          : await ShiftService.getShiftsByUser(actor.id, page);
      sendPage(res, [[...result[0]], result[1]]);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async checkIn(req: Request, res: Response) {
    try {
      const guardId = (req as any).user?.id;
      if (!guardId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = checkInSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const shift = await ShiftService.checkInShift(req.params.id as string, String(guardId), {
        ...parsed.data,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      await recordAudit(req, {
        action: 'shift.check_in',
        entityType: 'shift',
        entityId: shift.id,
        metadata: { distanceMeters: shift.checkInDistanceMeters, accuracy: parsed.data.accuracy ?? null, flagged: shift.locationFlagged },
      });
      res.json(shift);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async checkOut(req: Request, res: Response) {
    try {
      const guardId = (req as any).user?.id;
      if (!guardId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = checkOutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const shift = await ShiftService.checkOutShift(req.params.id as string, String(guardId), {
        ...parsed.data,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      await recordAudit(req, {
        action: 'shift.check_out',
        entityType: 'shift',
        entityId: shift.id,
        metadata: { distanceMeters: shift.checkOutDistanceMeters, accuracy: parsed.data.accuracy ?? null, flagged: shift.locationFlagged },
      });
      res.json(shift);
    } catch (error) {
      sendError(res, error);
    }
  }
}
