import { Request, Response } from 'express';
import { ShiftService } from './shifts.service';

export class ShiftController {

  static async create(req: Request, res: Response) {
    try {
      const shift = await ShiftService.createShift(req.body);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const shifts = await ShiftService.getAllShifts();
      res.json(shifts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}