import { Request, Response } from 'express';
import * as IncidentService from './incidents.service';


export class IncidentController {

  // 1. Log a new Incident
  static async create(req: Request, res: Response) {
    try {
      const incident = await IncidentService.createIncident(req.body);
      res.status(201).json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 2. Get All Incidents
  static async getAll(req: Request, res: Response) {
    try {
      const incidents = await IncidentService.getAllIncidents();
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Update Incident 
  static async update(req: Request, res: Response) {
    try {
      const incident = await IncidentService.updateIncident(req.params.id as string, req.body);
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // 4. Get Incident by ID
  static async getById(req: Request, res: Response) {
    try {
      const incident = await IncidentService.getIncidentById(req.params.id as string);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}