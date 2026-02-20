import { Request, Response } from 'express';
import * as ReportService from './reports.service';

export class ReportController {

  static async create(req: Request, res: Response) {
    try {
      const report = await ReportService.createReport(req.body);
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const reports = await ReportService.getAllReports();
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}