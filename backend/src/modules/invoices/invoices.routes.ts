import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../../middleware/auth.middleware';
import { InvoicesController } from './invoices.controller';

const router = Router();

router.get('/', requireRole(Role.ADMIN, Role.CLIENT), InvoicesController.list);
router.post('/', requireRole(Role.ADMIN), InvoicesController.create);
router.patch('/:id/status', requireRole(Role.ADMIN), InvoicesController.updateStatus);

export default router;