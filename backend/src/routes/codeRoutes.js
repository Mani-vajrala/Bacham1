import { Router } from 'express';
import { runCustomCode } from '../controllers/codeController.js';

const router = Router();

router.post('/run', runCustomCode);

export default router;
