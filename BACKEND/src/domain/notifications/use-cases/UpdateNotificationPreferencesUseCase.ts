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
  async execute(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    if (!(preferences as any).user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Verificar se existem preferências para este usuário
    const existingPreferences =
      await this.notificationPreferencesRepository.getPreferencesByUserId(
        (preferences as any).user_id,
      );

    // Se existir, manter o ID original e data de criação
    if (existingPreferences) {
      (preferences as any).id = (existingPreferences as any).id;
      (preferences as any).created_at = (existingPreferences as any).created_at;
    }

    // Atualizar data de modificação
    (preferences as any).updated_at = new Date();

    // Salvar e retornar as preferências atualizadas
    return this.notificationPreferencesRepository.savePreferences(preferences);
  }
}
