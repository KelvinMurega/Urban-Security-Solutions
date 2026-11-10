import { Request, Response } from 'express';
import * as SiteService from './site.service';
import { z } from 'zod';
import { sendError } from '../../shared/http-error';

const addGuardSchema = z.object({
  guardId: z.string().min(1).max(64).optional(),
  userId: z.string().min(1).max(64).optional(),
}).refine((value) => value.guardId || value.userId, 'guardId is required.');

const siteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(191),
  location: z.string().trim().max(191).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(5000).optional(),
  managerId: z.string().max(64).optional(),
});

const siteUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(2).max(191).optional(),
  location: z.string().trim().max(191).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(5000).optional(),
  managerId: z.string().max(64).optional(),
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
    } catch (error) {
      sendError(res, error);
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const sites = await SiteService.getAllSites();
      res.json(sites);
    } catch (error) {
      sendError(res, error);
    }
  }

  // FIXED: Added "as string"
  static async getOne(req: Request, res: Response) {
    try {
      const site = await SiteService.getSiteById(req.params.id as string);
      if (!site) return res.status(404).json({ error: 'Site not found' });
      res.json(site);
    } catch (error) {
      sendError(res, error);
    }
  }

  // FIXED: Added "as string"
  static async addGuard(req: Request, res: Response) {
    try {
      const parsed = addGuardSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const guard = await SiteService.addGuardToSite(req.params.id as string, parsed.data);
      res.status(201).json(guard);
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await SiteService.deleteSite(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }
}