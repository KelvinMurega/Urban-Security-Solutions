import { Router } from 'express';
import { ClientsController } from './clients.controller';

const router = Router();

router.get('/', ClientsController.list);
router.post('/', ClientsController.create);
router.put('/:id/sites', ClientsController.assignSites);

export default router;