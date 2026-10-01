import { Request, Response } from 'express';
import { z } from 'zod';
import * as ClientService from './clients.service';

const createClientSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const siteAssignmentSchema = z.object({ siteIds: z.array(z.string()).max(100) });

export class ClientsController {
  static async list(_req: Request, res: Response) {
    try {
      res.json(await ClientService.getClients());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      res.status(201).json(await ClientService.createClient(parsed.data));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async assignSites(req: Request, res: Response) {
    const parsed = siteAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      const client = await ClientService.replaceClientSites(String(req.params.id), parsed.data.siteIds);
      if (!client) return res.status(404).json({ error: 'Client not found.' });
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}