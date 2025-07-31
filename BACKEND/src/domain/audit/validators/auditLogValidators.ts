import { z } from 'zod';
import { AdminAction, AdminAuditLog } from '../../admin/types/AdminTypes';

/**
 * Schema para validação de ações administrativas
 */
export const AdminActionSchema = z.object({
  type: z.string().min(1, 'Tipo de ação é obrigatório'),
  description: z.string().min(1, 'Descrição da ação é obrigatória'),
  performedBy: z.string().uuid('ID do usuário inválido'),
  performedAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema para validação de logs de auditoria
 */
export const AdminAuditLogSchema = z.object({
  id: z.string().uuid('ID do log inválido'),
  action: AdminActionSchema,
  createdAt: z.date(),
});

/**
 * Schema para validação de requisições de criação de logs
 */
export const CreateAuditLogSchema = AdminActionSchema.omit({ performedAt: true });

/**
 * Schema para validação de parâmetros de consulta de logs
 */
export const AuditLogQuerySchema = z.object({
  actionType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  descriptionContains: z.string().optional(),
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  sortBy: z.enum(['createdAt', 'action.type', 'action.performedBy']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

/**
 * Valida uma ação administrativa
 * @param action Ação a ser validada
 * @returns Ação validada ou erro
 */
export function validateAdminAction(action: unknown): AdminAction {
  return AdminActionSchema.parse(action) as AdminAction;
}

/**
 * Valida um log de auditoria
 * @param log Log a ser validado
 * @returns Log validado ou erro
 */
export function validateAdminAuditLog(log: unknown): AdminAuditLog {
  return AdminAuditLogSchema.parse(log) as AdminAuditLog;
}

/**
 * Valida os parâmetros de consulta de logs de auditoria
 * @param params Parâmetros a serem validados
 * @returns Parâmetros validados ou erro
 */
export function validateAuditLogQueryParams(params: unknown): z.infer<typeof AuditLogQuerySchema> {
  return AuditLogQuerySchema.parse(params);
}
