// backend/src/modules/users/users.routes.ts
// Mounted behind requireAuth + requireRole(ADMIN) in routes/index.ts.
import { Router } from 'express';
import { UserController } from './users.controller';

const router = Router();

router.post('/guards', UserController.createGuard);
router.get('/guards', UserController.getAllGuards);
router.get('/guards/:id', UserController.getGuard);
router.put('/guards/:id', UserController.updateGuard);
router.delete('/guards/:id', UserController.deactivateGuard); // soft delete: deactivates + revokes sessions

export default router;
