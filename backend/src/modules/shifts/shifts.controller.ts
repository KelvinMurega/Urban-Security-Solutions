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

  static async checkIn(req: Request, res: Response) {
    try {
      const { previousGuardName } = req.body;
      const guardId = (req as any).user?.id;
      if (!guardId || !previousGuardName) {
        return res.status(400).json({ error: 'previousGuardName is required.' });
      }

      const shift = await ShiftService.checkInShift(
        req.params.id as string,
        String(guardId),
        String(previousGuardName).trim()
      );
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async checkOut(req: Request, res: Response) {
    try {
      const { nextGuardName } = req.body;
      const guardId = (req as any).user?.id;
      if (!guardId || !nextGuardName) {
        return res.status(400).json({ error: 'nextGuardName is required.' });
      }

      const shift = await ShiftService.checkOutShift(
        req.params.id as string,
        String(guardId),
        String(nextGuardName).trim()
      );
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
