import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { AdminDashboardService } from '../../../infra/admin/supabase/AdminDashboardService';
import { SupabaseAuditLogService } from '../../../infra/audit/supabase/SupabaseAuditLogService';
import { AdminController } from '../controllers/AdminController';
 
import { createAdminRoutes } from '../routes/adminRoutes';
 
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

    // Criar controlador de flashcards
    let adminFlashcardController: any = null;
    try {
      const mod = require('../controllers/AdminFlashcardController');
      const Controller = mod.AdminFlashcardController || mod.default;
      adminFlashcardController = new Controller(supabase);
    } catch (e) {
      console.warn('[AdminFactory] Flashcard controller indisponível:', e);
    }

    // Criar rotas
    const adminRoutes = createAdminRoutes(adminController);
    let flashcardRoutes = Router();
    try {
      const mod = require('../routes/adminFlashcardRoutes');
      const createRoutes = mod.createAdminFlashcardRoutes || mod.default;
      flashcardRoutes = createRoutes(adminFlashcardController);
    } catch (e) {
      console.warn('[AdminFactory] Rotas de flashcards indisponíveis:', e);
    }

    // Criar rotas de filtros
    let filterRoutes = Router();
    try {
      const { createFilterModule } = require('../../filters/factories/FilterFactory');
      const factoryResult = createFilterModule();
      if (factoryResult && factoryResult.router) {
        filterRoutes = factoryResult.router;
      }
    } catch (error) {
      console.error('[AdminFactory] ❌ Erro ao carregar rotas de filtros:', error);
    }

    // Combinar rotas - ORDEM IMPORTA! Rotas mais específicas primeiro
    const routes = Router();
    routes.use('/filters', filterRoutes);  // Mais específico primeiro
    routes.use('/subfilters', filterRoutes);  // Alias para subfiltros
    routes.use('/flashcards', flashcardRoutes);
    routes.use('/', adminRoutes);  // Genérico por último

    return {
      routes,
      adminRepository,
      adminService,
      dashboardService,
      auditService,
      adminController,
      adminFlashcardController,
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
