import { z } from 'zod';
import { NotificationPriority, NotificationType } from '../types';

// Schema para validação de criação de notificação
export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Tipo de notificação inválido' }),
  }),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  priority: z
    .nativeEnum(NotificationPriority, {
      errorMap: () => ({ message: 'Prioridade inválida' }),
    })
    .default(NotificationPriority.NORMAL),
  actionUrl: z.string().url('URL de ação inválida').optional().nullable(),
  imageUrl: z.string().url('URL de imagem inválida').optional().nullable(),
  relatedId: z.string().optional().nullable(),
  relatedType: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  expiresAt: z.string().datetime('Data de expiração inválida').optional().nullable(),
});

// Schema para validação de atualização de notificação
export const updateNotificationSchema = createNotificationSchema.partial().omit({ userId: true });

// Schema para validação de envio em massa
export const bulkSendNotificationSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'É necessário fornecer pelo menos um usuário'),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Tipo de notificação inválido' }),
  }),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  priority: z
    .nativeEnum(NotificationPriority, {
      errorMap: () => ({ message: 'Prioridade inválida' }),
    })
    .default(NotificationPriority.NORMAL),
  actionUrl: z.string().url('URL de ação inválida').optional().nullable(),
  imageUrl: z.string().url('URL de imagem inválida').optional().nullable(),
  relatedId: z.string().optional().nullable(),
  relatedType: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  expiresAt: z.string().datetime('Data de expiração inválida').optional().nullable(),
});

/**
 * Valida dados para criação de notificação
 */
export function validateCreateNotification(data: any): {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
} {
  try {
    createNotificationSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Dados de notificação inválidos',
        validationErrors,
      };
    }

    return {
      success: false,
      error: 'Erro ao validar dados de notificação',
    };
  }
}

/**
 * Valida dados para envio em massa
 */
export function validateBulkSendNotification(data: any): {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
} {
  try {
    bulkSendNotificationSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Dados de notificação em massa inválidos',
        validationErrors,
      };
    }

    return {
      success: false,
      error: 'Erro ao validar dados de notificação em massa',
    };
  }
}
