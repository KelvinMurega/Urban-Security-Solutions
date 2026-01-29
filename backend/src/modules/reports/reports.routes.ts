import { Router } from 'express';
import { ReportController } from './reports.controller';

const router = Router();

router.post('/', ReportController.create);
router.get('/', ReportController.getAll);

export default router;