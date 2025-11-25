import { Router } from 'express';
import { QuestionListController } from '../controllers/QuestionListController';
import { supabaseAuthMiddleware as authMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';

const router = Router();
const controller = new QuestionListController();

// Todas as rotas requerem autenticação (não requer admin)
router.use(authMiddleware as any);

// GET /api/question-lists - Listar todas as listas do usuário
router.get('/', (req, res) => controller.getUserQuestionLists(req as any, res));

// POST /api/question-lists - Criar nova lista
router.post('/', (req, res) => controller.createQuestionList(req as any, res));

// GET /api/question-lists/questions/:questionId/alternative-stats - Buscar estatísticas de alternativas (DEVE VIR ANTES DE /:id)
router.get('/questions/:questionId/alternative-stats', (req, res) => controller.getQuestionAlternativeStats(req as any, res));

// GET /api/question-lists/:id/stats - Buscar estatísticas da lista (deve vir antes de /:id)
router.get('/:id/stats', (req, res) => controller.getQuestionListStats(req as any, res));

// GET /api/question-lists/:id/question-ids - Buscar IDs das questões da lista
router.get('/:id/question-ids', (req, res) => controller.getQuestionListIds(req as any, res));

// GET /api/question-lists/:id/responses - Buscar respostas do usuário para a lista
router.get('/:id/responses', (req, res) => controller.getQuestionListResponses(req as any, res));

// GET /api/question-lists/:id/incorrect - Buscar questões incorretas da lista
router.get('/:id/incorrect', (req, res) => controller.getIncorrectQuestions(req as any, res));

// GET /api/question-lists/:id - Buscar lista específica
router.get('/:id', (req, res) => controller.getQuestionListById(req as any, res));

// PUT /api/question-lists/:id - Atualizar lista
router.put('/:id', (req, res) => controller.updateQuestionList(req as any, res));

// DELETE /api/question-lists/:id - Deletar lista
router.delete('/:id', (req, res) => controller.deleteQuestionList(req as any, res));

export default router;
