import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { AdminDashboardService } from '../../../infra/admin/supabase/AdminDashboardService';
import { SupabaseAuditLogService } from '../../../infra/audit/supabase/SupabaseAuditLogService';
import { AdminController } from '../controllers/AdminController';
import { createAdminRoutes } from '../routes/adminRoutes';
import { createAdminFlashcardRoutes } from '../routes/adminFlashcardRoutes';
import { createFlashcardModule } from '../../studyTools/flashcards/factories/createFlashcardModule';
import { SupabaseAdminRepository } from '../../../infra/admin/supabase/SupabaseAdminRepository';
import { GetAllAdminsUseCase } from '../use-cases/GetAllAdminsUseCase';
import { CreateAdminUseCase } from '../use-cases/CreateAdminUseCase';
import { AdminUser, AdminAction, AdminAuditLog } from '../types/AdminTypes';
import {
  validateAdminUser,
  validateAdminAction,
  validateAdminAuditLog,
} from '../validators/adminValidators';
import { v4 as uuidv4 } from 'uuid';
import { Router } from 'express';

export interface AdminModuleOptions {
  supabaseClient?: SupabaseClient;
}

/**
 * Factory para criar o módulo de administração
 */
export class AdminFactory {
  /**
   * Cria uma instância do módulo de administração
   * @param options Opções de configuração
   * @returns Objeto com componentes do módulo
   */
  static create(options?: AdminModuleOptions) {
    // Obter instância do Supabase
    const supabase = options?.supabaseClient;
    if (!supabase) {
      throw new Error('SupabaseClient é obrigatório para AdminFactory');
    }

    // Criar repositório
    const adminRepository = new SupabaseAdminRepository(supabase);

    // Criar casos de uso
    const getAllAdminsUseCase = new GetAllAdminsUseCase(adminRepository);
    const createAdminUseCase = new CreateAdminUseCase(adminRepository);

    // Criar serviços
    const adminService = SupabaseAdminService.getInstance();
    const dashboardService = AdminDashboardService.getInstance();
    const auditService = SupabaseAuditLogService.getInstance();

    // Criar controlador
    const adminController = new AdminController(
      adminService,
      dashboardService,
      auditService,
    );

    // Criar módulo de flashcards
    const flashcardModule = createFlashcardModule();
    const flashcardController = flashcardModule.controllers.flashcardController;

    // Criar rotas
    const adminRoutes = createAdminRoutes(adminController);
    const flashcardRoutes = createAdminFlashcardRoutes(flashcardController);

    // Combinar rotas - ORDEM IMPORTA! Rotas mais específicas primeiro
    const routes = Router();
    routes.use('/flashcards', flashcardRoutes);
    routes.use('/', adminRoutes);  // Genérico por último

    return {
      routes,
      adminRepository,
      adminService,
      dashboardService,
      auditService,
      adminController,
      flashcardController,
      useCases: {
        getAllAdminsUseCase,
        createAdminUseCase,
      },
    };
  }

  static createUser(
    adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): AdminUser {
    const now = new Date();
    const user: AdminUser = {
      ...adminData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    validateAdminUser(user);
    return user;
  }

  static createAction(actionData: Omit<AdminAction, 'timestamp'>): AdminAction {
    const action: AdminAction = {
      ...actionData,
      timestamp: new Date(),
    };
    validateAdminAction(action);
    return action;
  }

  static createAuditLog(action: AdminAction): AdminAuditLog {
    const auditLog: AdminAuditLog = {
      id: uuidv4(),
      action,
      createdAt: new Date(),
    };
    validateAdminAuditLog(auditLog);
    return auditLog;
  }
}
