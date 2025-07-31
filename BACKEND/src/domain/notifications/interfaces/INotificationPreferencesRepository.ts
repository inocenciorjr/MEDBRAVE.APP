import { NotificationPreferences } from '../types';

/**
 * Interface para o repositório de preferências de notificações
 */
export interface INotificationPreferencesRepository {
  /**
   * Cria ou atualiza as preferências de um usuário
   */
  savePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences>;

  /**
   * Obtém as preferências de um usuário
   */
  getPreferencesByUserId(userId: string): Promise<NotificationPreferences | null>;

  /**
   * Exclui as preferências de um usuário
   */
  deletePreferences(userId: string): Promise<void>;

  /**
   * Verifica se o usuário possui preferências salvas
   */
  hasPreferences(userId: string): Promise<boolean>;
}
