import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseOfficialExamService } from '../../../infra/officialExam/supabase/SupabaseOfficialExamService';
import { OfficialExamController } from '../controllers/OfficialExamController';
import { createOfficialExamRoutes } from '../routes/officialExamRoutes';
import { IQuestionService } from '../../questions/interfaces/IQuestionService';
import { ISimulatedExamService } from '../../simulatedExam/interfaces/ISimulatedExamService';
import { supabase } from '../../../config/supabase';

interface CreateOfficialExamModuleOptions {
  supabaseClient?: SupabaseClient;
  questionService: IQuestionService;
  simulatedExamService: ISimulatedExamService;
}

/**
 * Creates and configures the official exam module
 * @param options Configuration options
 * @returns Configured router
 */
export const createOfficialExamModule = (
  options: CreateOfficialExamModuleOptions
): Router => {
  const {
    supabaseClient = supabase,
    questionService,
    simulatedExamService,
  } = options;

  // Create service
  const officialExamService = new SupabaseOfficialExamService(
    supabaseClient,
    questionService,
    simulatedExamService
  );

  // Create controller
  const controller = new OfficialExamController(officialExamService);

  // Create and return routes
  return createOfficialExamRoutes(controller);
};
