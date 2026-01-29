import { Router } from 'express';
import { ShiftController } from './shifts.controller';

const router = Router();

router.post('/', ShiftController.create); // Assign new shift
router.get('/', ShiftController.getAll);  // View schedule

export default router;