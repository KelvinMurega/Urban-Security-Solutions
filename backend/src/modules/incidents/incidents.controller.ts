import { Request, Response } from 'express';
import * as IncidentService from './incidents.service';
import { Role } from '@prisma/client';


export class IncidentController {

  // 1. Log a new Incident
  static async create(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload = {
        ...req.body,
        userId: actor.role === Role.GUARD ? actor.id : req.body.userId
      };

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

      const incident = await IncidentService.updateIncident(req.params.id as string, req.body);
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
