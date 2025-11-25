import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../utils/logger';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Serviço para gerenciar timezone dos usuários
 * Armazena e recupera o timezone de cada usuário
 */
export class TimezoneService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Salva o timezone do usuário
   */
  async saveUserTimezone(userId: string, timezone: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ timezone })
        .eq('id', userId);

      if (error) {
        logger.error(`Erro ao salvar timezone do usuário ${userId}:`, error);
      }
    } catch (error) {
      logger.error('Erro ao salvar timezone:', error);
    }
  }

  /**
   * Busca o timezone do usuário
   * @returns timezone do usuário ou 'America/Sao_Paulo' como fallback
   */
  async getUserTimezone(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('timezone')
        .eq('id', userId)
        .single();

      if (error || !data?.timezone) {
        logger.warn(`Timezone não encontrado para usuário ${userId}, usando fallback America/Sao_Paulo`);
        return 'America/Sao_Paulo';
      }

      return data.timezone;
    } catch (error) {
      logger.error('Erro ao buscar timezone:', error);
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Converte uma data UTC para o timezone do usuário (início do dia)
   * Retorna uma data UTC que representa 00:00 no timezone especificado
   * 
   * Exemplo: Para timezone 'America/Sao_Paulo' (UTC-3):
   * - Input: qualquer data
   * - Output: YYYY-MM-DD 03:00:00 UTC (que é 00:00 em São Paulo)
   */
  getStartOfDayInTimezone(date: Date, timezone: string): Date {
    // Converter a data UTC para o timezone do usuário
    const zonedDate = toZonedTime(date, timezone);
    
    // Definir para meia-noite no timezone do usuário
    zonedDate.setHours(0, 0, 0, 0);
    
    // Converter de volta para UTC
    // Isso retorna a hora UTC que representa meia-noite no timezone do usuário
    return fromZonedTime(zonedDate, timezone);
  }

  /**
   * Converte uma data UTC para o fim do dia no timezone do usuário
   * Retorna uma data UTC que representa 23:59:59.999 no timezone especificado
   */
  getEndOfDayInTimezone(date: Date, timezone: string): Date {
    // Converter a data UTC para o timezone do usuário
    const zonedDate = toZonedTime(date, timezone);
    
    // Definir para o fim do dia no timezone do usuário
    zonedDate.setHours(23, 59, 59, 999);
    
    // Converter de volta para UTC
    return fromZonedTime(zonedDate, timezone);
  }

  /**
   * Adiciona dias a uma data considerando o timezone do usuário
   * Retorna uma data UTC que representa meia-noite no timezone do usuário
   * 
   * Exemplo: addDaysInTimezone(now, 1, 'America/Sao_Paulo')
   * - Converte 'now' para São Paulo
   * - Adiciona 1 dia
   * - Define para 00:00 em São Paulo
   * - Retorna em UTC (03:00 UTC = 00:00 SP)
   */
  addDaysInTimezone(date: Date, days: number, timezone: string): Date {
    // Converter a data UTC para o timezone do usuário
    const zonedDate = toZonedTime(date, timezone);
    
    // Adicionar os dias
    zonedDate.setDate(zonedDate.getDate() + days);
    
    // Definir para meia-noite no timezone do usuário
    zonedDate.setHours(0, 0, 0, 0);
    
    // Converter de volta para UTC
    // Isso retorna a hora UTC que representa meia-noite no timezone do usuário
    return fromZonedTime(zonedDate, timezone);
  }
}
