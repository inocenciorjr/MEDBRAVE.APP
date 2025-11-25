import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAchievementService } from '../../../infra/achievements/supabase/SupabaseAchievementService';
import { AchievementController } from '../controllers/AchievementController';
import { createAchievementRoutes } from '../routes/achievementRoutes';

/**
 * Cria o módulo completo de conquistas
 * @param supabaseClient - Cliente do Supabase
 * @returns Router com as rotas de conquistas configuradas
 */
export function createAchievementModule(supabaseClient: SupabaseClient): Router {
  // Instancia o serviço
  const achievementService = new SupabaseAchievementService(supabaseClient);
  
  // Instancia o controller
  const achievementController = new AchievementController(achievementService);
  
  // Cria e retorna as rotas
  return createAchievementRoutes(achievementController);
}