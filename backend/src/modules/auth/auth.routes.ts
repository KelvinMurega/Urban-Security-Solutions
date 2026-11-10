// backend/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loginRateLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post('/login', loginRateLimiter, AuthController.login);

// First-admin bootstrap; returns 404 unless ENABLE_SETUP_REGISTRATION=true and no users exist.
router.post('/register', loginRateLimiter, AuthController.register);

router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);
router.put('/me', requireAuth, AuthController.updateMe);

// Handover picker for guards; not exposed to clients.
router.get('/guards-lite', requireAuth, requireRole(Role.ADMIN, Role.GUARD), AuthController.guardsLite);

export default router;
