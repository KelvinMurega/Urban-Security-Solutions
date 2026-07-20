import { Request, Response } from 'express';
import * as ReportService from './reports.service';
import { Role } from '@prisma/client';
import { z } from 'zod';

const reportCreateSchema = z.object({
  content: z.string().min(1),
  shiftId: z.string().min(1),
  userId: z.string().min(1).optional(),
});

export class ReportController {

  static async create(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = reportCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const payload = {
        ...parsed.data,
        userId: actor.role === Role.GUARD ? actor.id : parsed.data.userId
      };

      if (!payload.userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }

      const report = await ReportService.createReport(payload);
      res.status(201).json(report);
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

      const reports =
        actor.role === Role.ADMIN
          ? await ReportService.getAllReports()
          : await ReportService.getReportsByUser(actor.id);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
