import { Router } from 'express';
import { UnifiedQuestionController } from '../controllers/UnifiedQuestionController';
import { FirebaseQuestionService } from '../services/FirebaseQuestionService';


import { firestore } from '../../../config/firebaseAdmin';
import { authMiddleware } from '../../auth/middleware/auth.middleware';

const router = Router();
const db = firestore;
const questionService = new FirebaseQuestionService(db);
const controller = new UnifiedQuestionController(questionService);

// CRUD
router.post('/', authMiddleware, (req, res, next) => controller.createQuestion(req, res, next));
router.get('/:id', (req, res, next) => controller.getQuestionById(req, res, next));
router.put('/:id', authMiddleware, (req, res, next) => controller.updateQuestion(req, res, next));
router.delete('/:id', authMiddleware, (req, res, next) => controller.deleteQuestion(req, res, next));

// Listagem e busca
router.get('/', (req, res, next) => controller.listQuestions(req, res, next));
router.post('/search', (req, res, next) => controller.searchQuestions(req, res, next));
router.get('/search', (req, res, next) => controller.searchQuestions(req, res, next));
router.get('/count', (req, res, next) => controller.countQuestions(req, res, next));
router.post('/count', (req, res, next) => controller.countQuestions(req, res, next));

// Tags, status, rating
router.post('/:id/rate', authMiddleware, (req, res, next) => controller.rateQuestion(req, res, next));
router.post('/:id/tags', authMiddleware, (req, res, next) => controller.addTags(req, res, next));
router.delete('/:id/tags', authMiddleware, (req, res, next) => controller.removeTags(req, res, next));
router.patch('/:id/status', authMiddleware, (req, res, next) => controller.changeStatus(req, res, next));

// Filtros, relacionados, bulk
router.get('/filters', (req, res, next) => controller.listQuestionsByFilters(req, res, next));
router.get('/:id/related', (req, res, next) => controller.listRelatedQuestions(req, res, next));
router.get('/lists/:id/items', (req, res, next) => controller.getQuestionsFromList(req, res, next));
router.post('/bulk-get', (req, res, next) => controller.getBulkQuestions(req, res, next));
router.post('/batch-counts', (req, res, next) => controller.batchCountQuestions(req, res, next));

// Performance por especialidade
router.get('/user-performance-by-specialty', authMiddleware, (req, res, next) => controller.getUserPerformanceBySpecialty(req, res, next));

export default router;