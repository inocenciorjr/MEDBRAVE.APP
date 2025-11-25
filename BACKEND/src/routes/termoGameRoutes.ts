import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { TermoGameController } from '../controllers/TermoGameController';
import { supabaseAuthMiddleware, AuthenticatedRequest } from '../domain/auth/middleware/supabaseAuth.middleware';

export const createTermoGameRoutes = (supabase: SupabaseClient): Router => {
  const router = Router();
  const termoGameController = new TermoGameController(supabase);

  // Aplicar middleware de autenticação obrigatório a todas as rotas
  router.use((req, res, next) => {
    supabaseAuthMiddleware(req as AuthenticatedRequest, res, next).catch(next);
  });

  // Rotas do jogo
  router.get('/today-word', termoGameController.getTodayWord.bind(termoGameController));
  router.post('/start', termoGameController.startGame.bind(termoGameController));
  router.post('/guess', termoGameController.makeGuess.bind(termoGameController));
  router.get('/current', termoGameController.getCurrentGame.bind(termoGameController));
  router.get('/can-play', termoGameController.canUserPlay.bind(termoGameController));
  router.get('/stats', termoGameController.getUserStats.bind(termoGameController));
  router.get('/ranking', termoGameController.getDailyRanking.bind(termoGameController));
  router.get('/word', termoGameController.getCorrectWord.bind(termoGameController));

  return router;
};