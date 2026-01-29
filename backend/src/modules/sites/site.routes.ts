import { Router } from 'express';
import { SiteController } from './site.controller';


const router = Router();

// Add these lines BEFORE "export default router"
router.get('/:id', SiteController.getOne);         // View Site Details
router.post('/:id/guards', SiteController.addGuard); // Register Guard
router.put('/:id', SiteController.update);

router.post('/', SiteController.create); // POST /api/sites -> Create
router.get('/', SiteController.getAll);  // GET /api/sites -> List

export default router;