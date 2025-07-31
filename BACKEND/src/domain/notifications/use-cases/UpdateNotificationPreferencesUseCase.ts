import { inject, injectable } from 'tsyringe';
import { INotificationPreferencesRepository } from '../interfaces/INotificationPreferencesRepository';
import { NotificationPreferences } from '../types';

/**
 * Caso de uso para atualizar preferências de notificações
 */
@injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    @inject('NotificationPreferencesRepository')
    private notificationPreferencesRepository: INotificationPreferencesRepository,
  ) {}

  /**
   * Atualiza as preferências de notificação do usuário
   * @param preferences Preferências de notificação
   */
  async execute(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    if (!preferences.userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Verificar se existem preferências para este usuário
    const existingPreferences = await this.notificationPreferencesRepository.getPreferencesByUserId(
      preferences.userId,
    );

    // Se existir, manter o ID original e data de criação
    if (existingPreferences) {
      preferences.id = existingPreferences.id;
      preferences.createdAt = existingPreferences.createdAt;
    }

    // Atualizar data de modificação
    preferences.updatedAt = new Date();

    // Salvar e retornar as preferências atualizadas
    return this.notificationPreferencesRepository.savePreferences(preferences);
  }
}
