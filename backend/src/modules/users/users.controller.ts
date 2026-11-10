// backend/src/modules/users/users.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import * as UserService from './users.service';
import { sendError } from '../../shared/http-error';
import { emailSchema, passwordSchema } from '../../shared/password';

const guardSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  role: z.enum(['ADMIN', 'GUARD']).optional(),
  siteId: z.string().max(64).optional(),
});

const guardUpdateSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  role: z.enum(['ADMIN', 'GUARD']).optional(),
  siteId: z.string().max(64).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export class UserController {
  static async createGuard(req: Request, res: Response) {
    try {
      const parsed = guardSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      res.status(201).json(await UserService.createUser(parsed.data, req.user!.id));
    } catch (error) {
      sendError(res, error);
    }
  }

  static async getAllGuards(_req: Request, res: Response) {
    try {
      res.json(await UserService.getAllUsers());
    } catch (error) {
      sendError(res, error);
    }
  }

  static async getGuard(req: Request, res: Response) {
    try {
      const guard = await UserService.getUserById(String(req.params.id));
      if (!guard) return res.status(404).json({ error: 'Guard not found' });
      res.json(guard);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async updateGuard(req: Request, res: Response) {
    try {
      const parsed = guardUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      res.json(await UserService.updateUser(String(req.params.id), parsed.data, req.user!));
    } catch (error) {
      sendError(res, error);
    }
  }

  static async deactivateGuard(req: Request, res: Response) {
    try {
      await UserService.deactivateUser(String(req.params.id), req.user!.id);
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }
}
