// backend/src/modules/users/users.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import * as UserService from './users.service';
import { sendError } from '../../shared/http-error';
import { recordAudit } from '../../shared/audit';
import { parsePage, sendPage } from '../../shared/pagination';
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
      const user = await UserService.createUser(parsed.data, req.user!.id);
      await recordAudit(req, { action: 'user.create', entityType: 'user', entityId: user.id, metadata: { role: user.role } });
      res.status(201).json(user);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async getAllGuards(req: Request, res: Response) {
    try {
      sendPage(res, await UserService.getAllUsers(parsePage(req)));
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
      const user = await UserService.updateUser(String(req.params.id), parsed.data, req.user!);
      const { password: _password, ...changes } = parsed.data;
      await recordAudit(req, {
        action: 'user.update',
        entityType: 'user',
        entityId: user.id,
        metadata: { ...changes, passwordReset: Boolean(parsed.data.password) },
      });
      res.json(user);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async deactivateGuard(req: Request, res: Response) {
    try {
      await UserService.deactivateUser(String(req.params.id), req.user!.id);
      await recordAudit(req, { action: 'user.deactivate', entityType: 'user', entityId: String(req.params.id) });
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }
}
