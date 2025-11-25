import { Router } from 'express';
import { requireAdmin } from '../../../middleware/adminAuth';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { FlashcardController } from '../../studyTools/flashcards/controllers/flashcardController';

export function createAdminFlashcardRoutes(controller: FlashcardController): Router {
  const router = Router();

  // Middleware de autenticação (deve vir ANTES do adminMiddleware)
  router.use(authMiddleware);

  // Middleware para garantir que apenas administradores acessem essas rotas
  router.use(requireAdmin as any);

  // ===== ROTAS DE COLEÇÕES OFICIAIS =====
  
  // GET /api/admin/flashcards/official-collections - Listar coleções oficiais
  router.get('/official-collections', async (req, res, next) => {
    try {
      // Reutilizar o método getCollectionsMetadata mas filtrar apenas oficiais
      await controller.getCollectionsMetadata(req as any, res);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/flashcards/mark-official/:collectionName - Marcar coleção como oficial
  router.post('/mark-official/:collectionName', async (req, res, next) => {
    try {
      const { collectionName } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Atualizar a coleção na tabela collections
      const { supabase } = await import('../../../config/supabase');
      
      // Buscar a coleção pelo nome
      const { data: collection, error: findError } = await supabase
        .from('collections')
        .select('id')
        .eq('name', collectionName)
        .single();

      if (findError || !collection) {
        console.error('Erro ao buscar coleção:', findError);
        return res.status(404).json({
          success: false,
          message: 'Coleção não encontrada',
        });
      }

      // Atualizar is_official na tabela collections
      const { error } = await supabase
        .from('collections')
        .update({ is_official: true })
        .eq('id', collection.id);

      if (error) {
        console.error('Erro ao marcar coleção como oficial:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao marcar coleção como oficial',
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: 'Coleção marcada como oficial',
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/admin/flashcards/unmark-official/:collectionName - Desmarcar coleção como oficial
  router.post('/unmark-official/:collectionName', async (req, res, next) => {
    try {
      const { collectionName } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      // Atualizar a coleção na tabela collections
      const { supabase } = await import('../../../config/supabase');
      
      // Buscar a coleção pelo nome
      const { data: collection, error: findError } = await supabase
        .from('collections')
        .select('id')
        .eq('name', collectionName)
        .single();

      if (findError || !collection) {
        console.error('Erro ao buscar coleção:', findError);
        return res.status(404).json({
          success: false,
          message: 'Coleção não encontrada',
        });
      }

      // Atualizar is_official na tabela collections
      const { error } = await supabase
        .from('collections')
        .update({ is_official: false })
        .eq('id', collection.id);

      if (error) {
        console.error('Erro ao desmarcar coleção como oficial:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao desmarcar coleção como oficial',
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: 'Coleção desmarcada como oficial',
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/flashcards/community/official - Listar coleções oficiais públicas (para comunidade)
  router.get('/community/official', async (req, res, next) => {
    try {
      const { supabase } = await import('../../../config/supabase');
      
      // Buscar coleções oficiais e públicas
      const { data, error } = await supabase
        .from('decks')
        .select('collection, is_public, is_official, user_id, created_at, updated_at')
        .eq('is_official', true)
        .eq('is_public', true)
        .not('collection', 'is', null);

      if (error) {
        console.error('Erro ao buscar coleções oficiais:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar coleções oficiais',
          error: error.message,
        });
      }

      // Agrupar por coleção
      const collectionsMap = new Map();
      
      data?.forEach((deck: any) => {
        const collectionName = deck.collection;
        if (!collectionsMap.has(collectionName)) {
          collectionsMap.set(collectionName, {
            name: collectionName,
            is_official: true,
            is_public: deck.is_public,
            user_id: deck.user_id,
            deck_count: 0,
            created_at: deck.created_at,
            updated_at: deck.updated_at,
          });
        }
        const collection = collectionsMap.get(collectionName);
        collection.deck_count++;
      });

      const collections = Array.from(collectionsMap.values());

      return res.json({
        success: true,
        data: collections,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
