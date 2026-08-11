import { Router } from 'express';
import { registerProfessor, loginProfessor, getProfessorProfile } from '../controllers/authController.js';
import { authenticateProfessor } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerProfessor);
router.post('/login', loginProfessor);
router.get('/me', authenticateProfessor, getProfessorProfile);

export default router;
