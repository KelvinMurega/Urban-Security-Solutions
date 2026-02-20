import { Request, Response } from 'express';
import * as SiteService from './site.service';
import { z } from 'zod';

const siteSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  location: z.string().optional(),
  managerId: z.string().optional(),
});

const siteUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(2).optional(),
  location: z.string().optional(),
  managerId: z.string().optional(),
});

export class SiteController {

  static async create(req: Request, res: Response) {
    try {
      const parsed = siteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      const site = await SiteService.createSite(parsed.data);
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
      const parsed = siteUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      const site = await SiteService.updateSite(req.params.id as string, parsed.data);
      res.json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await SiteService.deleteSite(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}