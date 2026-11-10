import { Request, Response } from 'express';
import * as IncidentService from './incidents.service';
import { Role, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { z } from 'zod';
import { sendError } from '../../shared/http-error';
import { recordAudit } from '../../shared/audit';
import { parsePage, sendPage } from '../../shared/pagination';

const incidentCreateSchema = z.object({
  // VARCHAR(191) columns: reject cleanly instead of failing in the database.
  title: z.string().trim().min(2).max(191),
  description: z.string().trim().min(2).max(191),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  siteId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64).optional(),
  photos: z.array(z.string()).max(4).optional(),
});

const incidentUpdateSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  resolutionDetails: z.string().trim().max(191).optional(),
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

      const incident = await IncidentService.createIncident(payload, actor);
      await recordAudit(req, {
        action: 'incident.create',
        entityType: 'incident',
        entityId: incident.id,
        metadata: { siteId: incident.siteId, severity: incident.severity, reporterId: incident.userId },
      });
      res.status(201).json(incident);
    } catch (error) {
      sendError(res, error);
    }
  }

  // 2. Get All Incidents
  static async getAll(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const page = parsePage(req);
      sendPage(
        res,
        actor.role === Role.ADMIN
          ? await IncidentService.getAllIncidents(page)
          : await IncidentService.getIncidentsByUser(actor.id, page)
      );
    } catch (error) {
      sendError(res, error);
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
      await recordAudit(req, {
        action: 'incident.update',
        entityType: 'incident',
        entityId: incident.id,
        metadata: { status: incident.status },
      });
      res.json(incident);
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  }
}
