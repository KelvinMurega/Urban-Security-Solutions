import { Request, Response } from 'express';
import * as IncidentService from './incidents.service';
import { Role, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { z } from 'zod';

const incidentCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  siteId: z.string().min(1),
  userId: z.string().min(1).optional(),
});

const incidentUpdateSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  resolutionDetails: z.string().optional(),
});

export class IncidentController {

  // 1. Log a new Incident
  static async create(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = incidentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const payload = {
        ...parsed.data,
        userId: actor.role === Role.GUARD ? actor.id : parsed.data.userId
      };

      if (!payload.userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }

      const incident = await IncidentService.createIncident(payload);
      res.status(201).json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 2. Get All Incidents
  static async getAll(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const incidents =
        actor.role === Role.ADMIN
          ? await IncidentService.getAllIncidents()
          : await IncidentService.getIncidentsByUser(actor.id);
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Update Incident 
  static async update(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (actor.role !== Role.ADMIN) {
        return res.status(403).json({ error: 'Only admins can resolve incidents.' });
      }

      const parsed = incidentUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const incident = await IncidentService.updateIncident(req.params.id as string, parsed.data);
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 4. Get Incident by ID
  static async getById(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const incident = await IncidentService.getIncidentById(req.params.id as string);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      if (actor.role !== Role.ADMIN && incident.userId !== actor.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
