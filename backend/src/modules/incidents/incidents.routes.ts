import { Router } from 'express';
import { IncidentController } from './incidents.controller';

const router = Router();

router.post('/', IncidentController.create);
router.get('/', IncidentController.getAll);
router.put('/:id', IncidentController.update);

export default router;