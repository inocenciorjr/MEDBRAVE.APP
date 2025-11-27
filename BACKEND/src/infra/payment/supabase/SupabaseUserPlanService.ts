import { SupabaseClient } from '@supabase/supabase-js';
import {
  UserPlan,
  CreateUserPlanPayload,
  UpdateUserPlanPayload,
  UserPlanStatus,
  PaymentMethod,
  UserPlanListOptions,
  UserPlanListResult,
} from '../../../domain/payment/types';
import { IUserPlanService } from '../../../domain/payment/interfaces/IUserPlanService';
import { IPlanService } from '../../../domain/payment/interfaces/IPlanService';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes, createError } from '../../../utils/errors';
import { PAYMENT_CONSTANTS } from '../../../domain/payment/constants';

/**
 * Implementação do serviço de planos de usuários utilizando Supabase
 */
export class SupabaseUserPlanService implements IUserPlanService {
  private planService: IPlanService | null = null;


  /**
   * Construtor da classe SupabaseUserPlanService
   * @param supabase Cliente Supabase
   * @param planService Serviço de planos (opcional)
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(
    private supabase: SupabaseClient,
    planService?: IPlanService,
  ) {
    if (planService) {
      this.planService = planService;
    }


  }

  /**
   * Cria um novo plano de usuário
   * @param userPlanData Dados do plano de usuário
   * @returns Plano de usuário criado
   */
  async createUserPlan(userPlanData: CreateUserPlanPayload): Promise<UserPlan> {
    try {
      this.validateUserPlanData(userPlanData);

      if (this.planService) {
        const plan = await this.planService.getPlanById(userPlanData.planId);
        if (!plan) {
          throw createError(
            ErrorCodes.NOT_FOUND,
            `Plano (ID: ${userPlanData.planId}) não encontrado`,
          );
        }
        if (!plan.isActive) {
          throw createError(
            ErrorCodes.VALIDATION_ERROR,
            'Não é possível criar plano de usuário para um plano inativo',
          );
        }
      }

      const now = new Date();
      const startDate =
        userPlanData.startDate instanceof Date
          ? userPlanData.startDate
          : new Date(userPlanData.startDate);

      let endDate: Date;
      if (userPlanData.endDate) {
        endDate =
          userPlanData.endDate instanceof Date
            ? userPlanData.endDate
            : new Date(userPlanData.endDate);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
      }

      if (endDate <= startDate) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Data de término deve ser posterior à data de início',
        );
      }

      let trialEndsAt = null;
      if (userPlanData.trialEndsAt) {
        trialEndsAt =
          userPlanData.trialEndsAt instanceof Date
            ? userPlanData.trialEndsAt
            : new Date(userPlanData.trialEndsAt);
      }

      const newUserPlan = {
        user_id: userPlanData.userId,
        plan_id: userPlanData.planId,
        status: userPlanData.status || UserPlanStatus.ACTIVE,
        start_date: startDate,
        end_date: endDate,
        trial_ends_at: trialEndsAt,
        next_billing_date: null,
        cancelled_at: null,
        last_payment_id: userPlanData.lastPaymentId || null,
        payment_method: userPlanData.paymentMethod || null,
        auto_renew: userPlanData.autoRenew || false,
        metadata: userPlanData.metadata || {},
        cancellation_reason: null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('user_plans')
        .insert(newUserPlan)
        .select()
        .single();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao criar plano de usuário: ${error.message}`,
        );
      }

      const createdUserPlan = this.mapToEntity(data);
      logger.info(
        `Plano de usuário criado com sucesso: ${createdUserPlan.id} para o usuário ${userPlanData.userId}`,
      );
      return createdUserPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano de usuário: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao criar plano de usuário',
      );
    }
  }

  private validateUserPlanData(userPlanData: CreateUserPlanPayload): void {
    if (!userPlanData.userId || userPlanData.userId.trim().length === 0) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'ID do usuário é obrigatório',
      );
    }

    if (!userPlanData.planId || userPlanData.planId.trim().length === 0) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'ID do plano é obrigatório',
      );
    }

    if (!userPlanData.startDate) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'Data de início é obrigatória',
      );
    }
  }

  /**
   * Busca um plano de usuário pelo ID
   * @param userPlanId ID do plano de usuário
   * @returns Plano de usuário encontrado ou null
   */
  async getUserPlanById(userPlanId: string): Promise<UserPlan | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select('*')
        .eq('id', userPlanId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar plano de usuário: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Erro ao buscar plano de usuário ${userPlanId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar plano de usuário',
      );
    }
  }

  /**
   * Busca todos os planos de um usuário
   * @param userId ID do usuário
   * @returns Lista de planos do usuário
   */
  async getUserPlansByUserId(userId: string): Promise<UserPlan[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar planos do usuário: ${error.message}`,
        );
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar planos do usuário ${userId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar planos do usuário',
      );
    }
  }

  /**
   * Busca planos ativos de um usuário
   * @param userId ID do usuário
   * @returns Lista de planos ativos do usuário
   */
  async getUserActivePlans(userId: string): Promise<UserPlan[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', UserPlanStatus.ACTIVE)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar planos ativos: ${error.message}`,
        );
      }

      // Buscar o nome do plano para cada user_plan e mapear para camelCase
      const userPlansWithNames = await Promise.all(
        data.map(async (item: any) => {
          try {
            const { data: planData } = await this.supabase
              .from('plans')
              .select('name')
              .eq('id', item.plan_id)
              .single();

            return {
              id: item.id,
              userId: item.user_id,
              planId: item.plan_id,
              planName: planData?.name || item.plan_id,
              status: item.status,
              startDate: item.start_date,
              endDate: item.end_date,
              lastPaymentId: item.last_payment_id,
              paymentMethod: item.payment_method,
              autoRenew: item.auto_renew,
              metadata: item.metadata || {},
              cancellationReason: item.cancellation_reason,
              cancelledAt: item.cancelled_at,
              nextBillingDate: item.next_billing_date,
              trialEndsAt: item.trial_ends_at,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              limits: item.limits || {},
              features: item.features || [],
            };
          } catch (err) {
            logger.warn(`Erro ao buscar nome do plano ${item.plan_id}: ${err}`);
            return {
              id: item.id,
              userId: item.user_id,
              planId: item.plan_id,
              planName: item.plan_id,
              status: item.status,
              startDate: item.start_date,
              endDate: item.end_date,
              lastPaymentId: item.last_payment_id,
              paymentMethod: item.payment_method,
              autoRenew: item.auto_renew,
              metadata: item.metadata || {},
              cancellationReason: item.cancellation_reason,
              cancelledAt: item.cancelled_at,
              nextBillingDate: item.next_billing_date,
              trialEndsAt: item.trial_ends_at,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              limits: item.limits || {},
              features: item.features || [],
            };
          }
        })
      );

      return userPlansWithNames;
    } catch (error) {
      logger.error(
        `Erro ao buscar planos ativos do usuário ${userId}: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar planos ativos',
      );
    }
  }

  /**
   * Busca um plano ativo específico de um usuário
   * @param userId ID do usuário
   * @param planId ID do plano
   * @returns Plano ativo encontrado ou null
   */
  async getActiveUserPlanByUserIdAndPlanId(
    userId: string,
    planId: string,
  ): Promise<UserPlan | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .eq('status', UserPlanStatus.ACTIVE)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar plano ativo: ${error.message}`,
        );
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar plano ativo do usuário ${userId} para o plano ${planId}: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar plano ativo',
      );
    }
  }

  /**
   * Atualiza um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param updates Dados a serem atualizados
   * @returns Plano de usuário atualizado ou null se não encontrado
   */
  async updateUserPlan(
    userPlanId: string,
    updates: UpdateUserPlanPayload,
  ): Promise<UserPlan | null> {
    try {
      if (updates.startDate && updates.endDate) {
        const startDate = updates.startDate instanceof Date ? updates.startDate : new Date(updates.startDate);
        const endDate = updates.endDate instanceof Date ? updates.endDate : new Date(updates.endDate);

        if (endDate <= startDate) {
          throw createError(
            ErrorCodes.VALIDATION_ERROR,
            'Data de término deve ser posterior à data de início',
          );
        }
      }

      const updateData = {
        ...this.mapUpdatePayloadToDatabase(updates),
        updated_at: new Date(),
      };

      delete updateData.id;
      delete updateData.created_at;

      const { data, error } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('id', userPlanId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao atualizar plano: ${error.message}`,
        );
      }

      const updatedUserPlan = this.mapToEntity(data);
      logger.info(`Plano de usuário ${userPlanId} atualizado com sucesso.`);
      return updatedUserPlan;
    } catch (error) {
      logger.error(
        `Erro ao atualizar plano de usuário ${userPlanId}: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao atualizar plano',
      );
    }
  }

  /**
   * Atualiza o status de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param status Novo status
   * @param reason Motivo da alteração (opcional)
   * @returns Plano de usuário atualizado
   */
  async updateUserPlanStatus(
    userPlanId: string,
    status: UserPlanStatus,
    reason?: string,
  ): Promise<UserPlan> {
    try {
      const currentPlan = await this.getUserPlanById(userPlanId);
      if (!currentPlan) {
        throw createError(
          ErrorCodes.NOT_FOUND,
          'Plano de usuário não encontrado',
        );
      }

      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      if (status === UserPlanStatus.CANCELLED) {
        updateData.cancelled_at = new Date();
        if (reason) {
          updateData.cancellation_reason = reason;
        }
      }

      const { data, error } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('id', userPlanId)
        .select()
        .single();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao atualizar status do plano: ${error.message}`,
        );
      }

      const updatedUserPlan = this.mapToEntity(data);
      logger.info(
        `Status do plano de usuário ${userPlanId} atualizado de ${currentPlan.status} para ${status}.`,
      );
      return updatedUserPlan;
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do plano de usuário ${userPlanId}: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao atualizar status do plano',
      );
    }
  }

  /**
   * Atualiza os metadados de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param metadataUpdates Atualizações dos metadados
   * @returns Plano de usuário atualizado
   */
  async updateUserPlanMetadata(
    userPlanId: string,
    metadataUpdates: Record<string, any>,
  ): Promise<UserPlan> {
    try {
      const currentUserPlan = await this.getUserPlanById(userPlanId);
      if (!currentUserPlan) {
        throw createError(
          ErrorCodes.NOT_FOUND,
          'Plano de usuário não encontrado',
        );
      }

      const updatedMetadata = {
        ...currentUserPlan.metadata,
        ...metadataUpdates,
      };

      const { data, error } = await this.supabase
        .from('user_plans')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date(),
        })
        .eq('id', userPlanId)
        .select()
        .single();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao atualizar metadados: ${error.message}`,
        );
      }

      const updatedUserPlan = this.mapToEntity(data);
      logger.info(
        `Metadados do plano de usuário ${userPlanId} atualizados com sucesso.`,
      );
      return updatedUserPlan;
    } catch (error) {
      logger.error(
        `Erro ao atualizar metadados do plano de usuário ${userPlanId}: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao atualizar metadados',
      );
    }
  }

  /**
   * Renova um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param durationDays Duração em dias
   * @param paymentId ID do pagamento (opcional)
   * @param paymentMethod Método de pagamento (opcional)
   * @returns Plano de usuário renovado
   */
  async renewUserPlan(
    userPlanId: string,
    durationDays: number,
    paymentId?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<UserPlan> {
    try {
      if (durationDays <= 0) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Duração da renovação deve ser maior que zero',
        );
      }

      const currentUserPlan = await this.getUserPlanById(userPlanId);
      if (!currentUserPlan) {
        throw createError(
          ErrorCodes.NOT_FOUND,
          'Plano de usuário não encontrado',
        );
      }

      const now = new Date();
      const baseDate = currentUserPlan.endDate > now ? currentUserPlan.endDate : now;
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const updateData: any = {
        end_date: newEndDate,
        status: UserPlanStatus.ACTIVE,
        updated_at: now,
      };

      if (paymentId) {
        updateData.last_payment_id = paymentId;
      }

      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      const { data, error } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('id', userPlanId)
        .select()
        .single();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao renovar plano: ${error.message}`,
        );
      }

      const renewedUserPlan = this.mapToEntity(data);
      logger.info(
        `Plano de usuário ${userPlanId} renovado com sucesso até ${newEndDate.toISOString()}.`,
      );
      return renewedUserPlan;
    } catch (error) {
      logger.error(`Erro ao renovar plano de usuário ${userPlanId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao renovar plano',
      );
    }
  }

  /**
   * Cancela um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param reason Motivo do cancelamento (opcional)
   * @returns Plano de usuário cancelado
   */
  async cancelUserPlan(userPlanId: string, reason?: string): Promise<UserPlan> {
    try {
      return await this.updateUserPlanStatus(
        userPlanId,
        UserPlanStatus.CANCELLED,
        reason,
      );
    } catch (error) {
      logger.error(`Erro ao cancelar plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica e expira planos de usuários vencidos
   * @returns Contadores de processamento
   */
  async checkAndExpireUserPlans(): Promise<{
    processedCount: number;
    expiredCount: number;
  }> {
    try {
      const now = new Date();

      const { data, error } = await this.supabase
        .from('user_plans')
        .update({
          status: UserPlanStatus.EXPIRED,
          updated_at: now,
        })
        .lt('end_date', now.toISOString())
        .eq('status', UserPlanStatus.ACTIVE)
        .select();

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao expirar planos: ${error.message}`,
        );
      }

      const expiredCount = data.length;

      if (expiredCount > 0) {
        logger.info(
          `${expiredCount} planos de usuário expirados foram atualizados.`,
        );

        for (const plan of data) {
          logger.info(
            `Plano ${plan.id} do usuário ${plan.user_id} expirado em ${plan.end_date}`,
          );
        }
      }

      return {
        processedCount: expiredCount,
        expiredCount,
      };
    } catch (error) {
      logger.error(`Erro ao verificar e expirar planos de usuários: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao verificar planos expirados',
      );
    }
  }

  /**
   * Manipula mudança de plano após reembolso
   * @param paymentId ID do pagamento
   */
  async handlePlanChangeAfterRefund(paymentId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select('*')
        .eq('last_payment_id', paymentId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar planos por pagamento: ${error.message}`,
        );
      }

      for (const userPlanData of data) {
        await this.updateUserPlanStatus(
          userPlanData.id,
          UserPlanStatus.CANCELLED,
          'Reembolso processado',
        );
      }

      logger.info(
        `${data.length} planos de usuário relacionados ao pagamento ${paymentId} foram cancelados.`,
      );
    } catch (error) {
      logger.error(
        `Erro ao manipular mudança de plano após reembolso: ${error}`,
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao processar reembolso',
      );
    }
  }

  /**
   * Lista planos de usuários com opções de filtro e paginação
   * @param options Opções de listagem
   * @returns Resultado paginado de planos de usuários
   */
  async listUserPlans(
    options: UserPlanListOptions,
  ): Promise<UserPlanListResult> {
    try {
      let query = this.supabase
        .from('user_plans')
        .select('*', { count: 'exact' });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.planId) {
        query = query.eq('plan_id', options.planId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      const limit = options.limit || PAYMENT_CONSTANTS.DEFAULT_PAGE_SIZE;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao listar planos de usuários: ${error.message}`,
        );
      }

      const userPlans = data.map((item) => this.mapToEntity(item));
      const total = count || 0;

      return {
        items: userPlans,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error(`Erro ao listar planos de usuários: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao listar planos de usuários',
      );
    }
  }

  /**
   * Verifica se um usuário tem plano ativo
   * @param userId ID do usuário
   * @returns true se tem plano ativo, false caso contrário
   */
  async userHasActivePlan(userId: string): Promise<boolean> {
    try {
      const activePlans = await this.getUserActivePlans(userId);
      return activePlans.length > 0;
    } catch (error) {
      logger.error(
        `Erro ao verificar se usuário ${userId} tem plano ativo: ${error}`,
      );
      throw error;
    }
  }

  private mapToEntity(data: any): UserPlan {
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status,
      autoRenew: data.auto_renew ?? false,
      cancellationReason: data.cancellation_reason || null,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : new Date(data.start_date),
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
      nextBillingDate: data.next_billing_date
        ? new Date(data.next_billing_date)
        : null,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
      lastPaymentId: data.payment_id,
      paymentMethod: data.payment_method,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }



  private mapUpdatePayloadToDatabase(updates: UpdateUserPlanPayload): any {
    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.lastPaymentId !== undefined) data.payment_id = updates.lastPaymentId;
    if (updates.paymentMethod !== undefined) data.payment_method = updates.paymentMethod;
    if (updates.autoRenew !== undefined) data.auto_renew = updates.autoRenew;
    if (updates.metadata !== undefined) data.metadata = updates.metadata;
    if (updates.cancellationReason !== undefined) data.cancellation_reason = updates.cancellationReason;
    if (updates.cancelledAt !== undefined) data.cancelled_at = updates.cancelledAt;
    if (updates.startDate !== undefined) data.start_date = updates.startDate || null;
    if (updates.endDate !== undefined) data.end_date = updates.endDate || null;
    if (updates.nextBillingDate !== undefined) data.next_billing_date = updates.nextBillingDate || null;
    if (updates.trialEndsAt !== undefined) data.trial_ends_at = updates.trialEndsAt || null;
    if (updates.lastRenewalAt !== undefined) data.last_renewal_at = updates.lastRenewalAt || null;
    return data;
  }
}
