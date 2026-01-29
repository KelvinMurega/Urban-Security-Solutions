// backend/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller'; // <--- Correct Import

const router = Router();

// 1. Login Route
router.post('/login', AuthController.login);

// 2. Register Route (for creating the first admin)
router.post('/register', AuthController.register);

export default router;