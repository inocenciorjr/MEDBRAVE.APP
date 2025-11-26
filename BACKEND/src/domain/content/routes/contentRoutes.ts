// Rotas de Conteúdo (Artigos)
// Implementação inicial - esqueleto
import { Router } from 'express';
import { ContentController } from '../controllers/contentController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const controller = new ContentController();

// Todas as rotas requerem autenticação + plano ativo
router.use(enhancedAuthMiddleware);

router.post('/', controller.createContent.bind(controller));
router.get('/:id', controller.getContentById.bind(controller));
router.put('/:id', controller.updateContent.bind(controller));
router.delete('/:id', controller.deleteContent.bind(controller));
router.get('/', controller.listContent.bind(controller));

export default router;
