import { INotificationRepository } from '../interfaces/INotificationRepository';
import {
  ListNotificationsOptions,
  PaginatedNotificationsResult,
} from '../types';

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

    const limit = options?.limit ?? 10;
    const page = options?.page ?? 1;
    const offset = options?.offset ?? (page - 1) * limit;
    const notifications = await this.notificationRepository.findByUserId(
      userId,
      limit,
      offset,
    );
    return {
      notifications,
      total: notifications.length,
      page,
      limit,
      total_pages: 1,
    };
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
      is_read: false,
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
