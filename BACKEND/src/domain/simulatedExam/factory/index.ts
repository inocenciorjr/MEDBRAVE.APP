import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSimulatedExamService } from '../../../infra/simulatedExam/supabase';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { simulatedExamRoutes } from '../routes/simulatedExamRoutes';

/**
 * Cria o módulo de simulados
 * @param supabase Instância do Supabase
 * @returns Router com as rotas configuradas
 */
export const createSimulatedExamModule = (supabase: SupabaseClient): Router => {
  const simulatedExamService = new SupabaseSimulatedExamService(supabase);
  const simulatedExamController = new SimulatedExamController(
    simulatedExamService,
  );

  return simulatedExamRoutes(simulatedExamController);
};

export default createSimulatedExamModule;
