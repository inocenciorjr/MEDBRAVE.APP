import { z } from 'zod';

// Schema para validação de registro de dispositivo
export const registerDeviceSchema = z.object({
  deviceType: z.enum(['ios', 'android', 'web', 'desktop'], {
    errorMap: () => ({ message: 'Tipo de dispositivo inválido' }),
  }),
  deviceModel: z.string().optional(),
  deviceName: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  pushToken: z.string().optional(),
  fcmToken: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema para validação de atualização de dispositivo
export const updateDeviceSchema = registerDeviceSchema.partial();

// Schema para validação de atualização de token
export const updateDeviceTokenSchema = z
  .object({
    fcmToken: z.string().optional(),
    pushToken: z.string().optional(),
  })
  .refine((data) => data.fcmToken || data.pushToken, {
    message: 'Pelo menos um token (FCM ou Push) deve ser fornecido',
    path: ['token'],
  });

/**
 * Valida dados para registro de dispositivo
 */
export function validateRegisterDevice(data: any): {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
} {
  try {
    registerDeviceSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Dados de dispositivo inválidos',
        validationErrors,
      };
    }

    return {
      success: false,
      error: 'Erro ao validar dados de dispositivo',
    };
  }
}

/**
 * Valida dados para atualização de dispositivo
 */
export function validateUpdateDevice(data: any): {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
} {
  try {
    updateDeviceSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Dados de atualização inválidos',
        validationErrors,
      };
    }

    return {
      success: false,
      error: 'Erro ao validar dados de atualização',
    };
  }
}

/**
 * Valida dados para atualização de token
 */
export function validateUpdateDeviceToken(data: any): {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
} {
  try {
    updateDeviceTokenSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Dados de token inválidos',
        validationErrors,
      };
    }

    return {
      success: false,
      error: 'Erro ao validar dados de token',
    };
  }
}
