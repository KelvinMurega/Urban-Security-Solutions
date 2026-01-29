// backend/src/modules/users/users.routes.ts
import { Router } from 'express';
import { UserController } from './users.controller';

const router = Router();

// 1. Create a new employee (Admin Feature)
router.post('/guards', UserController.createGuard);

// 2. Get list of all employees (Admin Feature - THIS FIXES YOUR DASHBOARD)
router.get('/guards', UserController.getAllGuards);

// 3. Get profile of one employee (Admin Feature)
router.get('/guards/:id', UserController.getGuard);

// 4. Update employee details (Admin Feature)
router.put('/guards/:id', UserController.updateGuard);

export default router;