import { firestore } from 'firebase-admin';
import { FirebaseAdminService } from '../services/FirebaseAdminService';
import { AdminDashboardService } from '../services/AdminDashboardService';
import { FirebaseAuditLogService } from '../../audit/FirebaseAuditLogService';
import { AdminController } from '../controllers/AdminController';
import { AdminFlashcardController } from '../controllers/AdminFlashcardController';
import { createAdminRoutes } from '../routes/adminRoutes';
import { createAdminFlashcardRoutes } from '../routes/adminFlashcardRoutes';
import { FirebaseAdminRepository } from '../repositories/AdminRepository';
import { GetAllAdminsUseCase } from '../use-cases/GetAllAdminsUseCase';
import { CreateAdminUseCase } from '../use-cases/CreateAdminUseCase';
import { AdminUser, AdminAction, AdminAuditLog } from '../types/AdminTypes';
import { validateAdminUser, validateAdminAction, validateAdminAuditLog } from '../validators/adminValidators';
import { v4 as uuidv4 } from 'uuid';
import { Router } from 'express';

export interface AdminModuleOptions {
  firestoreDb?: firestore.Firestore;
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
    // Obter instância do Firestore
    const db = options?.firestoreDb || firestore();

    // Criar repositório
    const adminRepository = new FirebaseAdminRepository(db);

    // Criar casos de uso
    const getAllAdminsUseCase = new GetAllAdminsUseCase(adminRepository);
    const createAdminUseCase = new CreateAdminUseCase(adminRepository);

    // Criar serviços
    const adminService = FirebaseAdminService.getInstance();
    const dashboardService = AdminDashboardService.getInstance();
    const auditService = FirebaseAuditLogService.getInstance();

    // Criar controlador
    const adminController = new AdminController(adminService, dashboardService, auditService);
    
    // Criar controlador de flashcards
    const adminFlashcardController = new AdminFlashcardController(db);

    // Criar rotas
    const adminRoutes = createAdminRoutes(adminController);
    const flashcardRoutes = createAdminFlashcardRoutes(adminFlashcardController);
    
    // Combinar rotas
    const routes = Router();
    routes.use('/', adminRoutes);
    routes.use('/flashcards', flashcardRoutes);

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

  static createUser(adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>): AdminUser {
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
