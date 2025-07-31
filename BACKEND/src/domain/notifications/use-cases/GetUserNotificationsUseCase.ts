import { INotificationRepository } from '../repositories/NotificationRepository';
import { ListNotificationsOptions, PaginatedNotificationsResult } from '../types';

/**
 * Caso de uso para obter notificações de um usuário
 */
export class GetUserNotificationsUseCase {
  private notificationRepository: INotificationRepository;

  constructor(notificationRepository: INotificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  /**
   * Executa o caso de uso
   * @param userId ID do usuário
   * @param options Opções de filtragem e paginação
   * @returns Resultado paginado de notificações
   */
  async execute(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult> {
    if (!userId) {
      throw new Error('O ID do usuário é obrigatório');
    }

    return await this.notificationRepository.getByUserId(userId, options);
  }

  /**
   * Obtém apenas notificações não lidas
   * @param userId ID do usuário
   * @param options Opções de filtragem e paginação
   * @returns Resultado paginado de notificações não lidas
   */
  async getUnread(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult> {
    const optionsWithUnread: ListNotificationsOptions = {
      ...options,
      isRead: false,
    };

    return await this.execute(userId, optionsWithUnread);
  }

  /**
   * Obtém contagem de notificações não lidas
   * @param userId ID do usuário
   * @returns Número de notificações não lidas
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.getUnread(userId, { limit: 1, page: 1 });
    return result.total;
  }
}
