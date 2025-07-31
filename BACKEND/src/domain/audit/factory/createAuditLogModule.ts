import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { IAuditLogService } from '../interfaces/IAuditLogService';
import { FirebaseAuditLogService } from '../FirebaseAuditLogService';
import { AuditLogController } from '../controllers/AuditLogController';
import { createAuditLogRoutes } from '../routes/auditLogRoutes';
import {
  FirebaseAuditLogRepository,
  IAuditLogRepository,
} from '../repositories/AuditLogRepository';
import { LogActionUseCase, GetAuditLogsUseCase } from '../use-cases';

export interface AuditLogModuleOptions {
  firestoreDb?: firestore.Firestore;
}

/**
 * Cria o módulo de logs de auditoria
 * @param options Opções de configuração
 * @returns Objeto com componentes do módulo
 */
export function createAuditLogModule(options?: AuditLogModuleOptions): {
  auditLogRoutes: Router;
  auditLogService: IAuditLogService;
  auditLogController: AuditLogController;
  auditLogRepository: IAuditLogRepository;
  useCases: {
    logActionUseCase: LogActionUseCase;
    getAuditLogsUseCase: GetAuditLogsUseCase;
  };
} {
  // Obter instância do Firestore
  const db = options?.firestoreDb || firestore();

  // Criar repositório
  const auditLogRepository = new FirebaseAuditLogRepository(db);

  // Criar casos de uso
  const logActionUseCase = new LogActionUseCase(auditLogRepository);
  const getAuditLogsUseCase = new GetAuditLogsUseCase(auditLogRepository);

  // Obter instância singleton do serviço
  const auditLogService = FirebaseAuditLogService.getInstance();

  // Criar controlador
  const auditLogController = new AuditLogController(auditLogService);

  // Criar rotas
  const auditLogRoutes = createAuditLogRoutes(auditLogController);

  return {
    auditLogRoutes,
    auditLogService,
    auditLogController,
    auditLogRepository,
    useCases: {
      logActionUseCase,
      getAuditLogsUseCase,
    },
  };
}
