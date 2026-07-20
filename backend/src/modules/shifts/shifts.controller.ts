import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ShiftService } from './shifts.service';
import { z } from 'zod';

const shiftCreateSchema = z.object({
  userId: z.string().min(1),
  siteId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  previousGuardId: z.string().min(1).optional(),
});

const checkOutSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  nextGuardId: z.string().min(1).optional(),
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
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const shifts =
        actor.role === Role.ADMIN
          ? await ShiftService.getAllShifts()
          : await ShiftService.getShiftsByUser(actor.id);
      res.json(shifts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

      const shift = await ShiftService.checkInShift(
        req.params.id as string,
        String(guardId),
        parsed.data
      );
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

      const shift = await ShiftService.checkOutShift(
        req.params.id as string,
        String(guardId),
        parsed.data
      );
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
