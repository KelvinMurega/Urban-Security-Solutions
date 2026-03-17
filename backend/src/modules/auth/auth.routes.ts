// backend/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller'; // <--- Correct Import
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// 1. Login Route
router.post('/login', AuthController.login);

// 2. Register Route (for creating the first admin)
router.post('/register', AuthController.register);
router.get('/me', requireAuth, AuthController.me);
router.put('/me', requireAuth, AuthController.updateMe);
router.get('/guards-lite', requireAuth, AuthController.guardsLite);

export default router;
