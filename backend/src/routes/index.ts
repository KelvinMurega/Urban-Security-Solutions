import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/users.routes';
import siteRoutes from '../modules/sites/site.routes';
import incidentRoutes from '../modules/incidents/incidents.routes';
import shiftRoutes from '../modules/shifts/shifts.routes';
import reportRoutes from '../modules/reports/reports.routes';
import clientRoutes from '../modules/clients/clients.routes';
import clientPortalRoutes from '../modules/client-portal/client-portal.routes';
import invoiceRoutes from '../modules/invoices/invoices.routes';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Centralized Route Registration
// Prefixing all module routes here keeps them organized under /api
router.use('/auth', authRoutes);
router.use('/users', requireAuth, requireRole(Role.ADMIN), userRoutes);
router.use('/sites', requireAuth, requireRole(Role.ADMIN), siteRoutes);
router.use('/incidents', requireAuth, requireRole(Role.ADMIN, Role.GUARD), incidentRoutes);
router.use('/shifts', requireAuth, shiftRoutes);
router.use('/reports', requireAuth, requireRole(Role.ADMIN, Role.GUARD), reportRoutes);
router.use('/clients', requireAuth, requireRole(Role.ADMIN), clientRoutes);
router.use('/client', requireAuth, requireRole(Role.CLIENT), clientPortalRoutes);
router.use('/invoices', requireAuth, invoiceRoutes);

export default router;
