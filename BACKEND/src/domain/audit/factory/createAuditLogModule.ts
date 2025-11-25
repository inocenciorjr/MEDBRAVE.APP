import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { IAuditLogService } from '../interfaces/IAuditLogService';
import { SupabaseAuditLogService } from '../../../infra/audit/supabase/SupabaseAuditLogService';
import { AuditLogController } from '../controllers/AuditLogController';
import { createAuditLogRoutes } from '../routes/auditLogRoutes';
import {
  SupabaseAuditLogRepository,
  IAuditLogRepository,
} from '../repositories/AuditLogRepository';
import { LogActionUseCase, GetAuditLogsUseCase } from '../use-cases';

export interface AuditLogModuleOptions {
  supabaseClient?: SupabaseClient;
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
  // Obter instância do Supabase
  const supabase = options?.supabaseClient;
  if (!supabase) {
    throw new Error('SupabaseClient é obrigatório para createAuditLogModule');
  }

  // Criar repositório
  const auditLogRepository = new SupabaseAuditLogRepository(supabase);

  // Criar casos de uso
  const logActionUseCase = new LogActionUseCase(auditLogRepository);
  const getAuditLogsUseCase = new GetAuditLogsUseCase(auditLogRepository);

  // Obter instância singleton do serviço
  const auditLogService = SupabaseAuditLogService.getInstance();

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
