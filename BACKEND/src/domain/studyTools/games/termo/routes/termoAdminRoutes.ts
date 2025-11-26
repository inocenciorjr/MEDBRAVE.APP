import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { TermoAdminController } from '../controllers/TermoAdminController';
import { enhancedAuthMiddleware } from '../../../../auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../../../../auth/middleware/admin.middleware';

export const createTermoAdminRoutes = (supabase: SupabaseClient): Router => {
  const router = Router();
  const termoAdminController = new TermoAdminController(supabase);

  // Aplicar middleware de autenticação + plano e admin
  router.use(enhancedAuthMiddleware);
  router.use(adminMiddleware);

  // Rotas administrativas para gerenciamento do jogo Termo
  
  // Gerar palavra do dia manualmente
  router.post('/daily-word/generate', 
    termoAdminController.generateManualDailyWord.bind(termoAdminController)
  );

  // Listar palavras do dia (útil para debug)
  router.get('/daily-word/list', 
    termoAdminController.listDailyWords.bind(termoAdminController)
  );

  // Forçar geração da palavra do dia (caso esteja faltando)
  router.post('/daily-word/force-generate', 
    termoAdminController.forceGenerateTodayWord.bind(termoAdminController)
  );

  return router;
};