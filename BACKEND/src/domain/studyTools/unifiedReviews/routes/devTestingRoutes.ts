import { Router } from 'express';
import { DevTestingController } from '../controllers/DevTestingController';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const controller = new DevTestingController(supabase);

export const createDevTestingRoutes = (): Router => {
  const router = Router();

  // ⚠️ APENAS DESENVOLVIMENTO - Verificar NODE_ENV em cada endpoint
  // Todas as rotas requerem autenticação + plano ativo
  router.use(enhancedAuthMiddleware);

  /**
   * POST /api/unified-reviews/dev/simulate-overdue
   * Simula revisões atrasadas alterando datas
   */
  router.post('/simulate-overdue', controller.simulateOverdueReviews);

  /**
   * POST /api/unified-reviews/dev/reset-dates
   * Reseta datas para hoje
   */
  router.post('/reset-dates', controller.resetDates);

  /**
   * POST /api/unified-reviews/dev/create-test-cards
   * Cria cards de teste
   */
  router.post('/create-test-cards', controller.createTestCards);

  /**
   * DELETE /api/unified-reviews/dev/delete-test-cards
   * Deleta cards de teste
   */
  router.delete('/delete-test-cards', controller.deleteTestCards);

  return router;
};

/**
 * GUIA DE USO - TESTES DE DESENVOLVIMENTO
 * 
 * 1. CRIAR CARDS DE TESTE (50 cards)
 * POST /api/unified-reviews/dev/create-test-cards
 * {
 *   "count": 50
 * }
 * 
 * 2. SIMULAR REVISÕES ATRASADAS (45 dias)
 * POST /api/unified-reviews/dev/simulate-overdue
 * {
 *   "days_overdue": 45,
 *   "count": 50
 * }
 * 
 * 3. TESTAR SISTEMA
 * - Acesse /revisoes
 * - Veja BacklogStatusCard (modo smart)
 * - Desative e reative sistema no wizard
 * - Veja OverdueReviewsModal
 * 
 * 4. RESETAR DATAS (voltar ao normal)
 * POST /api/unified-reviews/dev/reset-dates
 * 
 * 5. DELETAR CARDS DE TESTE (limpar)
 * DELETE /api/unified-reviews/dev/delete-test-cards
 * 
 * CENÁRIOS DE TESTE:
 * 
 * A. Testar BacklogStatusCard (Modo Smart)
 *    1. Criar 50 cards
 *    2. Simular 45 dias de atraso
 *    3. Configurar modo smart no wizard
 *    4. Acessar /revisoes
 *    5. Ver status SEVERE
 * 
 * B. Testar OverdueReviewsModal (Reativação)
 *    1. Criar 50 cards
 *    2. Simular 45 dias de atraso
 *    3. Desativar sistema no wizard
 *    4. Reativar sistema
 *    5. Ver modal com opções
 * 
 * C. Testar Modo Recuperação
 *    1. Criar 150 cards
 *    2. Simular 30 dias de atraso
 *    3. Modo smart com limite 50/dia
 *    4. Ver status CRITICAL
 *    5. Clicar "Ativar Modo Recuperação"
 *    6. Ver redistribuição em 3 dias
 * 
 * D. Testar Reagendamento
 *    1. Criar 100 cards
 *    2. Simular 60 dias de atraso
 *    3. Desativar e reativar
 *    4. No modal, escolher "Reagendar 7 dias"
 *    5. Ver distribuição (~14 cards/dia)
 */
