import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/users.routes';
import siteRoutes from '../modules/sites/site.routes';
import incidentRoutes from '../modules/incidents/incidents.routes';
import shiftRoutes from '../modules/shifts/shifts.routes';
import reportRoutes from '../modules/reports/reports.routes';

const router = Router();

// Centralized Route Registration
// Prefixing all module routes here keeps them organized under /api
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sites', siteRoutes);
router.use('/incidents', incidentRoutes);
router.use('/shifts', shiftRoutes);
router.use('/reports', reportRoutes);

export default router;