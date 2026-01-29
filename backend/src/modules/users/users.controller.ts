// backend/src/modules/users/users.controller.ts
import { Request, Response } from 'express';
import { UserService } from './users.service';

export class UserController {

  // 1. Create a Guard
  static async createGuard(req: Request, res: Response) {
    try {
      const guard = await UserService.createGuard(req.body);
      res.status(201).json(guard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 2. Get All Guards
  static async getAllGuards(req: Request, res: Response) {
    try {
      // FIX 1: Use the correct method name 'findAllGuards'
      const guards = await UserService.findAllGuards();
      res.json(guards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Get Single Guard (Profile)
  static async getGuard(req: Request, res: Response) {
    try {
      const guard = await UserService.getGuardById(req.params.id as string);
      if (!guard) return res.status(404).json({ error: 'Guard not found' });
      res.json(guard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Update Guard / User
  static async updateGuard(req: Request, res: Response) {
    try {
      // FIX 2: Use the correct method name 'updateUser'
      const updatedGuard = await UserService.updateUser(req.params.id as string, req.body);
      res.json(updatedGuard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}