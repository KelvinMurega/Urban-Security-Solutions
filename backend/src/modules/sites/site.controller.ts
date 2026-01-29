import { Request, Response } from 'express';
import { SiteService } from './site.service';

export class SiteController {

  static async create(req: Request, res: Response) {
    try {
      const site = await SiteService.createSite(req.body);
      res.status(201).json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const sites = await SiteService.getAllSites();
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // FIXED: Added "as string"
  static async getOne(req: Request, res: Response) {
    try {
      const site = await SiteService.getSiteById(req.params.id as string);
      if (!site) return res.status(404).json({ error: 'Site not found' });
      res.json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // FIXED: Added "as string"
  static async addGuard(req: Request, res: Response) {
    try {
      const guard = await SiteService.addGuardToSite(req.params.id as string, req.body);
      res.status(201).json(guard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Add inside SiteController class
  static async update(req: Request, res: Response) {
    try {
      const site = await SiteService.updateSite(req.params.id as string, req.body);
      res.json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}