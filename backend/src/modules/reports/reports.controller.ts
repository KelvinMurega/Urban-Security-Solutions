import { Request, Response } from 'express';
import * as ReportService from './reports.service';
import { Role } from '@prisma/client';

export class ReportController {

  static async create(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload = {
        ...req.body,
        userId: actor.role === Role.GUARD ? actor.id : req.body.userId
      };

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
