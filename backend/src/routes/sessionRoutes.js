import { Router } from 'express';
import {
  createSession,
  getSessionByCode,
  getSessionDetails,
  endSession,
  getSessionAnalytics,
  exportSessionCsv
} from '../controllers/sessionController.js';
import { authenticateProfessor } from '../middleware/authMiddleware.js';

const router = Router();

// Public / Student endpoints
router.get('/code/:code', getSessionByCode);
router.get('/:id/results', getSessionAnalytics);

// Professor endpoints
router.post('/start', authenticateProfessor, createSession);
router.get('/:id/details', authenticateProfessor, getSessionDetails);
router.post('/:id/end', authenticateProfessor, endSession);
router.get('/:id/export-csv', exportSessionCsv);

export default router;
