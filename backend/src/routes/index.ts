import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/users.routes';
import siteRoutes from '../modules/sites/site.routes';
import incidentRoutes from '../modules/incidents/incidents.routes';
import shiftRoutes from '../modules/shifts/shifts.routes';
import reportRoutes from '../modules/reports/reports.routes';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Centralized Route Registration
// Prefixing all module routes here keeps them organized under /api
router.use('/auth', authRoutes);
router.use('/users', requireAuth, userRoutes);
router.use('/sites', requireAuth, siteRoutes);
router.use('/incidents', requireAuth, incidentRoutes);
router.use('/shifts', requireAuth, shiftRoutes);
router.use('/reports', requireAuth, reportRoutes);

export default router;
