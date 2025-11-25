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
import { AppError } from '../../../utils/errors';

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
      // Validação básica de dados
      if (!userPlanData.userId) {
        throw new AppError(500, 'ID do usuário é obrigatório');
      }

      if (!userPlanData.planId) {
        throw new AppError(500, 'ID do plano é obrigatório');
      }

      if (!userPlanData.startDate) {
        throw new AppError(500, 'Data de início é obrigatória');
      }

      // Verificar se o plano existe
      if (this.planService) {
        const plan = await this.planService.getPlanById(userPlanData.planId);
        if (!plan) {
          throw new AppError(
            500,
            `Plano (ID: ${userPlanData.planId}) não encontrado`,
          );
        }
      }

      const now = new Date();

      // Converter datas
      const startDate =
        userPlanData.startDate instanceof Date
          ? userPlanData.startDate
          : new Date(userPlanData.startDate);

      let endDate = null;
      if (userPlanData.endDate) {
        endDate =
          userPlanData.endDate instanceof Date
            ? userPlanData.endDate
            : new Date(userPlanData.endDate);
      }

      let trialEndsAt = null;
      if (userPlanData.trialEndsAt) {
        trialEndsAt =
          userPlanData.trialEndsAt instanceof Date
            ? userPlanData.trialEndsAt
            : new Date(userPlanData.trialEndsAt);
      }

      const nextBillingDate = null;

      const newUserPlan = {
        user_id: userPlanData.userId,
        plan_id: userPlanData.planId,
        status: userPlanData.status || UserPlanStatus.ACTIVE,
        start_date: startDate,
        end_date: endDate,
        trial_ends_at: trialEndsAt,
        next_billing_date: nextBillingDate,
        cancelled_at: null,
        payment_id: null,
        payment_method: userPlanData.paymentMethod || null,
        metadata: userPlanData.metadata || {},
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('user_plans')
        .insert(newUserPlan)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user plan: ${error.message}`);
      }

      const createdUserPlan = this.mapToEntity(data);
      logger.info(
        `Plano de usuário criado com sucesso: ${createdUserPlan.id} para o usuário ${userPlanData.userId}`,
      );
      return createdUserPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano de usuário: ${error}`);
      throw error;
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
        throw new Error(`Failed to get user plan: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Erro ao buscar plano de usuário ${userPlanId}: ${error}`);
      throw error;
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
        throw new Error(`Failed to get user plans: ${error.message}`);
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar planos do usuário ${userId}: ${error}`);
      throw error;
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
        throw new Error(`Failed to get user active plans: ${error.message}`);
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(
        `Erro ao buscar planos ativos do usuário ${userId}: ${error}`,
      );
      throw error;
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
        throw new Error(`Failed to get active user plan: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(
        `Erro ao buscar plano ativo do usuário ${userId} para o plano ${planId}: ${error}`,
      );
      throw error;
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
      const updateData = {
        ...this.mapUpdatePayloadToDatabase(updates),
        updated_at: new Date(),
      };

      // Remove campos que não devem ser atualizados
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
        throw new Error(`Failed to update user plan: ${error.message}`);
      }

      const updatedUserPlan = this.mapToEntity(data);
      logger.info(`Plano de usuário ${userPlanId} atualizado com sucesso.`);
      return updatedUserPlan;
    } catch (error) {
      logger.error(
        `Erro ao atualizar plano de usuário ${userPlanId}: ${error}`,
      );
      throw error;
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
      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      if (status === UserPlanStatus.CANCELLED) {
        updateData.cancelled_at = new Date();
      }

      if (reason) {
        updateData.metadata = { cancellation_reason: reason };
      }

      const { data, error } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('id', userPlanId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update user plan status: ${error.message}`);
      }

      const updatedUserPlan = this.mapToEntity(data);
      logger.info(
        `Status do plano de usuário ${userPlanId} atualizado para ${status}.`,
      );
      return updatedUserPlan;
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do plano de usuário ${userPlanId}: ${error}`,
      );
      throw error;
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
      // Buscar metadados atuais
      const currentUserPlan = await this.getUserPlanById(userPlanId);
      if (!currentUserPlan) {
        throw new AppError(404, 'Plano de usuário não encontrado');
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
        throw new Error(
          `Failed to update user plan metadata: ${error.message}`,
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
      throw error;
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
      const currentUserPlan = await this.getUserPlanById(userPlanId);
      if (!currentUserPlan) {
        throw new AppError(404, 'Plano de usuário não encontrado');
      }

      const now = new Date();
      const newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const updateData: any = {
        end_date: newEndDate,
        status: UserPlanStatus.ACTIVE,
        updated_at: now,
      };

      if (paymentId) {
        updateData.payment_id = paymentId;
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
        throw new Error(`Failed to renew user plan: ${error.message}`);
      }

      const renewedUserPlan = this.mapToEntity(data);
      logger.info(`Plano de usuário ${userPlanId} renovado com sucesso.`);
      return renewedUserPlan;
    } catch (error) {
      logger.error(`Erro ao renovar plano de usuário ${userPlanId}: ${error}`);
      throw error;
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
        throw new Error(`Failed to expire user plans: ${error.message}`);
      }

      const expiredCount = data.length;
      logger.info(
        `${expiredCount} planos de usuário expirados foram atualizados.`,
      );

      return {
        processedCount: expiredCount,
        expiredCount,
      };
    } catch (error) {
      logger.error(`Erro ao verificar e expirar planos de usuários: ${error}`);
      throw error;
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
        .eq('payment_id', paymentId);

      if (error) {
        throw new Error(
          `Failed to get user plans by payment ID: ${error.message}`,
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
        `Planos de usuário relacionados ao pagamento ${paymentId} foram cancelados.`,
      );
    } catch (error) {
      logger.error(
        `Erro ao manipular mudança de plano após reembolso: ${error}`,
      );
      throw error;
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

      // Aplicar filtros
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.planId) {
        query = query.eq('plan_id', options.planId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      // Paginação
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Ordenação
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list user plans: ${error.message}`);
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
      throw error;
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
