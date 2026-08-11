import { Router } from 'express';
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz
} from '../controllers/quizController.js';
import { authenticateProfessor } from '../middleware/authMiddleware.js';

const router = Router();

// All quiz routes require professor authentication
router.use(authenticateProfessor);

router.get('/', getQuizzes);
router.post('/', createQuiz);
router.get('/:id', getQuizById);
router.put('/:id', updateQuiz);
router.delete('/:id', deleteQuiz);
router.post('/:id/duplicate', duplicateQuiz);

export default router;
