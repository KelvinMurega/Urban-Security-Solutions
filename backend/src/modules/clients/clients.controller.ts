import { Request, Response } from 'express';
import { sendError } from '../../shared/http-error';
import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../shared/password';
import * as ClientService from './clients.service';

const createClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(30).optional(),
});

const siteAssignmentSchema = z.object({ siteIds: z.array(z.string().max(64)).max(100) });

export class ClientsController {
  static async list(_req: Request, res: Response) {
    try {
      res.json(await ClientService.getClients());
    } catch (error) {
      sendError(res, error);
    }
  }

  static async create(req: Request, res: Response) {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      res.status(201).json(await ClientService.createClient(parsed.data));
    } catch (error) {
      sendError(res, error);
    }
  }

  static async assignSites(req: Request, res: Response) {
    const parsed = siteAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      const client = await ClientService.replaceClientSites(String(req.params.id), parsed.data.siteIds);
      if (!client) return res.status(404).json({ error: 'Client not found.' });
      res.json(client);
    } catch (error) {
      sendError(res, error);
    }
  }
}