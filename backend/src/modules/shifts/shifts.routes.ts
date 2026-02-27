import { Router } from 'express';
import { ShiftController } from './shifts.controller';

const router = Router();

router.post('/', ShiftController.create); // Assign new shift
router.get('/', ShiftController.getAll);  // View schedule
router.put('/:id/check-in', ShiftController.checkIn);
router.put('/:id/check-out', ShiftController.checkOut);

export default router;
