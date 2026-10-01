import { Router } from 'express';
import { ClientPortalController } from './client-portal.controller';

const router = Router();

router.get('/dashboard', ClientPortalController.dashboard);

export default router;