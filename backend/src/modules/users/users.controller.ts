// backend/src/modules/users/users.controller.ts
import { Request, Response } from 'express';
import * as UserService from './users.service';
import { z } from 'zod';

const guardSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().min(7),
  role: z.enum(['ADMIN', 'GUARD']).optional(),
  siteId: z.string().optional(),
});

const guardUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  role: z.enum(['ADMIN', 'GUARD']).optional(),
  siteId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export class UserController {

  // 1. Create a Guard
  static async createGuard(req: Request, res: Response) {
    try {
      const parsed = guardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      const guard = await UserService.createUser(parsed.data);
      res.status(201).json(guard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 2. Get All Guards
  static async getAllGuards(req: Request, res: Response) {
    try {
      const guards = await UserService.getAllUsers();
      res.json(guards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Get Single Guard (Profile)
  static async getGuard(req: Request, res: Response) {
    try {
      const guard = await UserService.getUserById(req.params.id as string);
      if (!guard) return res.status(404).json({ error: 'Guard not found' });
      res.json(guard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Update Guard / User
  static async updateGuard(req: Request, res: Response) {
    try {
      const parsed = guardUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      // actingUser should be set by authentication middleware (e.g., req.user)
      const actingUser = (req as any).user;
      const updatedGuard = await UserService.updateUser(req.params.id as string, parsed.data, actingUser);
      res.json(updatedGuard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 5. Delete Guard
  static async deleteGuard(req: Request, res: Response) {
    try {
      await UserService.deleteUser(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 6. Login User
  static async login(req: Request, res: Response) {
    try {
      const user = await UserService.login(req.body);
      res.json(user);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}