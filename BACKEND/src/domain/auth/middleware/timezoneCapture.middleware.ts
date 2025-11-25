import { Request, Response, NextFunction } from 'express';
import { TimezoneService } from '../../user/services/TimezoneService';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const timezoneService = new TimezoneService(supabase);

/**
 * Middleware para capturar e salvar o timezone do usuário
 * O frontend deve enviar o header 'X-User-Timezone'
 */
export async function timezoneCaptureMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const userTimezone = req.headers['x-user-timezone'] as string;
    const userId = (req as any).user?.id;

    // Se tem timezone no header e usuário autenticado, salvar
    if (userTimezone && userId) {
      // Validar timezone (formato IANA)
      try {
        Intl.DateTimeFormat(undefined, { timeZone: userTimezone });
        await timezoneService.saveUserTimezone(userId, userTimezone);
        logger.debug(`Timezone capturado para usuário ${userId}: ${userTimezone}`);
      } catch (error) {
        logger.warn(`Timezone inválido recebido: ${userTimezone}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de timezone:', error);
    next(); // Não bloquear a requisição por erro de timezone
  }
}
