import { Request, Response } from 'express';
import { sendError } from '../../shared/http-error';
import * as ClientPortalService from './client-portal.service';

export class ClientPortalController {
  static async dashboard(req: Request, res: Response) {
    try {
      const clientId = (req as any).user?.id;
      if (!clientId) return res.status(401).json({ error: 'Unauthorized' });
      res.json(await ClientPortalService.getDashboard(String(clientId)));
    } catch (error) {
      sendError(res, error);
    }
  }
}