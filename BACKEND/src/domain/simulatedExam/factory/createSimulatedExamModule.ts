import { SupabaseClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { SupabaseSimulatedExamService } from '../../../infra/simulatedExam/supabase';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { simulatedExamRoutes } from '../routes/simulatedExamRoutes';

interface CreateSimulatedExamModuleOptions {
  supabase?: SupabaseClient;
}

export const createSimulatedExamModule = (
  options: CreateSimulatedExamModuleOptions,
): Router => {
  if (!options.supabase) {
    throw new Error('Supabase client is required');
  }

  // Criar o serviço de simulados
  const simulatedExamService = new SupabaseSimulatedExamService(
    options.supabase,
  );

  // Criar o serviço de questões
  const { SupabaseQuestionService } = require('../../../infra/questions/supabase/SupabaseQuestionService');
  const questionService = new SupabaseQuestionService(options.supabase);

  // Criar o serviço de histórico de questões
  const { QuestionHistoryService } = require('../../questions/services/QuestionHistoryService');
  const questionHistoryService = new QuestionHistoryService(options.supabase);

  // Criar o controlador com todos os serviços
  const simulatedExamController = new SimulatedExamController(
    simulatedExamService,
    questionService,
    questionHistoryService,
  );

  // Criar as rotas
  return simulatedExamRoutes(simulatedExamController);
};
