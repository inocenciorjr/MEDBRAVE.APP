import { SupabaseClient } from '@supabase/supabase-js';
import {
  Plan,
  CreatePlanPayload,
  PlanListOptions,
  PlanListResult,
  PlanInterval,
  PlanLimits,
} from '../../../domain/payment/types';
import { IPlanService } from '../../../domain/payment/interfaces/IPlanService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError, AppError } from '../../../utils/errors';
import { PAYMENT_CONSTANTS } from '../../../domain/payment/constants';
import { planCacheService } from '../../../domain/payment/services/PlanCacheService';

const DEFAULT_PLAN_LIMITS: PlanLimits = {
  maxQuestionsPerDay: null,
  maxQuestionListsPerDay: null,
  maxSimulatedExamsPerMonth: null,
  maxFSRSCards: null,
  maxReviewsPerDay: null,
  maxFlashcardsCreated: null,
  maxFlashcardDecks: null,
  maxPulseAIQueriesPerDay: null,
  maxQuestionExplanationsPerDay: null,
  maxContentGenerationPerMonth: null,
  maxSupportTicketsPerMonth: null,
  canExportData: false,
  canCreateCustomLists: false,
  canAccessAdvancedStatistics: false,
  canUseErrorNotebook: false,
  canAccessMentorship: false,
  canUseOfflineMode: false,
  canCustomizeInterface: false,
  supportLevel: 'basic',
};

/**
 * Implementação do serviço de planos utilizando Supabase
 */
export class SupabasePlanService implements IPlanService {
  /**
   * Construtor da classe SupabasePlanService
   */
  constructor(private supabase: SupabaseClient) {}

  /**
   * Cria um novo plano
   * @param planData Dados do plano
   * @param planId ID do plano (opcional)
   * @returns Plano criado
   */
  async createPlan(
    planData: CreatePlanPayload,
    planId?: string,
  ): Promise<Plan> {
    try {
      this.validatePlanData(planData);

      const now = new Date();

      const newPlan = {
        id: planId,
        name: planData.name.trim(),
        description: planData.description?.trim() || '',
        price: planData.price,
        currency: planData.currency || 'BRL',
        duration_days: planData.durationDays,
        interval: planData.interval || PlanInterval.MONTHLY,
        features: planData.features || [],
        metadata: planData.metadata || {},
        is_active: planData.isActive !== undefined ? planData.isActive : true,
        is_public: planData.isPublic !== undefined ? planData.isPublic : true,
        limits: this.validateAndMergeLimits(planData.limits),
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('plans')
        .insert(newPlan)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw createError(
            ErrorCodes.DUPLICATE_ENTRY,
            'Já existe um plano com este nome',
          );
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao criar plano: ${error.message}`,
        );
      }

      const createdPlan = this.mapToEntity(data);
      planCacheService.invalidatePublicPlans();
      logger.info(
        `Plano ${createdPlan.name} (ID: ${createdPlan.id}) criado com sucesso.`,
      );
      return createdPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao criar plano',
      );
    }
  }

  private validatePlanData(planData: CreatePlanPayload): void {
    if (!planData.name || planData.name.trim().length === 0) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'Nome do plano é obrigatório',
      );
    }

    if (
      planData.name.length < PAYMENT_CONSTANTS.MIN_PLAN_NAME_LENGTH ||
      planData.name.length > PAYMENT_CONSTANTS.MAX_PLAN_NAME_LENGTH
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Nome do plano deve ter entre ${PAYMENT_CONSTANTS.MIN_PLAN_NAME_LENGTH} e ${PAYMENT_CONSTANTS.MAX_PLAN_NAME_LENGTH} caracteres`,
      );
    }

    if (
      typeof planData.price !== 'number' ||
      planData.price < PAYMENT_CONSTANTS.MIN_PLAN_PRICE ||
      planData.price > PAYMENT_CONSTANTS.MAX_PLAN_PRICE
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Preço do plano deve estar entre ${PAYMENT_CONSTANTS.MIN_PLAN_PRICE} e ${PAYMENT_CONSTANTS.MAX_PLAN_PRICE}`,
      );
    }

    if (
      !planData.durationDays ||
      planData.durationDays < PAYMENT_CONSTANTS.MIN_PLAN_DURATION_DAYS ||
      planData.durationDays > PAYMENT_CONSTANTS.MAX_PLAN_DURATION_DAYS
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Duração do plano deve estar entre ${PAYMENT_CONSTANTS.MIN_PLAN_DURATION_DAYS} e ${PAYMENT_CONSTANTS.MAX_PLAN_DURATION_DAYS} dias`,
      );
    }

    if (
      planData.currency &&
      !PAYMENT_CONSTANTS.ALLOWED_CURRENCIES.includes(planData.currency as any)
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Moeda inválida. Valores permitidos: ${PAYMENT_CONSTANTS.ALLOWED_CURRENCIES.join(', ')}`,
      );
    }

    if (
      planData.interval &&
      !Object.values(PlanInterval).includes(planData.interval)
    ) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        `Intervalo inválido. Valores permitidos: ${Object.values(PlanInterval).join(', ')}`,
      );
    }
  }

  private validateAndMergeLimits(limits?: Partial<PlanLimits>): PlanLimits {
    const mergedLimits = { ...DEFAULT_PLAN_LIMITS, ...limits };

    if (mergedLimits.supportLevel && !['basic', 'priority', 'premium'].includes(mergedLimits.supportLevel)) {
      throw createError(
        ErrorCodes.VALIDATION_ERROR,
        'Nível de suporte inválido. Valores permitidos: basic, priority, premium',
      );
    }

    const numericLimits = [
      'maxQuestionsPerDay',
      'maxQuestionListsPerDay',
      'maxSimulatedExamsPerMonth',
      'maxFSRSCards',
      'maxReviewsPerDay',
      'maxFlashcardsCreated',
      'maxFlashcardDecks',
      'maxPulseAIQueriesPerDay',
      'maxQuestionExplanationsPerDay',
      'maxContentGenerationPerMonth',
      'maxSupportTicketsPerMonth',
    ] as const;

    for (const key of numericLimits) {
      const value = mergedLimits[key];
      if (value !== null && (typeof value !== 'number' || value < 0)) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          `${key} deve ser null ou um número não negativo`,
        );
      }
    }

    return mergedLimits;
  }

  /**
   * Busca um plano pelo ID
   * @param planId ID do plano
   * @returns Plano encontrado ou null
   */
  async getPlanById(planId: string): Promise<Plan | null> {
    try {
      const cached = planCacheService.getPlanById(planId);
      if (cached !== undefined) {
        return cached;
      }

      const { data, error } = await this.supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          planCacheService.setPlanById(planId, null);
          return null;
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar plano: ${error.message}`,
        );
      }

      const plan = this.mapToEntity(data);
      planCacheService.setPlanById(planId, plan);

      return plan;
    } catch (error) {
      logger.error(`Erro ao buscar plano ${planId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar plano',
      );
    }
  }

  /**
   * Busca todos os planos ativos e públicos
   * @returns Lista de planos ativos e públicos
   */
  async getActivePublicPlans(): Promise<Plan[]> {
    try {
      const cached = planCacheService.getPublicPlans();
      if (cached) {
        return cached;
      }

      const { data, error } = await this.supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('display_order', { ascending: true })
        .order('price', { ascending: true });

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao buscar planos públicos: ${error.message}`,
        );
      }

      const plans = data.map((item) => this.mapToEntity(item));
      planCacheService.setPublicPlans(plans);

      return plans;
    } catch (error) {
      logger.error(`Erro ao buscar planos ativos e públicos: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao buscar planos públicos',
      );
    }
  }



  /**
   * Lista planos com opções de filtro e paginação
   * @param options Opções de listagem
   * @returns Resultado paginado de planos
   */
  async listPlans(options: PlanListOptions = {}): Promise<PlanListResult> {
    try {
      let query = this.supabase.from('plans').select('*', { count: 'exact' });

      if (options.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      if (options.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao listar planos: ${error.message}`,
        );
      }

      const plans = data.map((item) => this.mapToEntity(item));
      const total = count || 0;

      return {
        items: plans,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error(`Erro ao listar planos: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao listar planos',
      );
    }
  }

  /**
   * Atualiza um plano
   * @param planId ID do plano
   * @param updates Dados a serem atualizados
   * @returns Plano atualizado ou null se não encontrado
   */
  async updatePlan(
    planId: string,
    updates: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Plan | null> {
    try {
      if (updates.name !== undefined) {
        if (!updates.name || updates.name.trim().length === 0) {
          throw createError(
            ErrorCodes.VALIDATION_ERROR,
            'Nome do plano não pode ser vazio',
          );
        }
        if (updates.name.length < 3 || updates.name.length > 100) {
          throw createError(
            ErrorCodes.VALIDATION_ERROR,
            'Nome do plano deve ter entre 3 e 100 caracteres',
          );
        }
      }

      if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price < 0)) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Preço do plano deve ser um número não negativo',
        );
      }

      if (updates.durationDays !== undefined && updates.durationDays <= 0) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Duração do plano deve ser maior que zero',
        );
      }

      if (updates.limits !== undefined) {
        updates.limits = this.validateAndMergeLimits(updates.limits);
      }

      const updateData = {
        ...this.mapToDatabase(updates),
        updated_at: new Date(),
      };

      delete updateData.id;
      delete updateData.created_at;

      const { data, error } = await this.supabase
        .from('plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        if (error.code === '23505') {
          throw createError(
            ErrorCodes.DUPLICATE_ENTRY,
            'Já existe um plano com este nome',
          );
        }
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao atualizar plano: ${error.message}`,
        );
      }

      const updatedPlan = this.mapToEntity(data);
      planCacheService.invalidatePlan(planId);
      logger.info(`Plano ${planId} atualizado com sucesso.`);
      return updatedPlan;
    } catch (error) {
      logger.error(`Erro ao atualizar plano ${planId}: ${error}`);
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
   * Deleta um plano
   * @param planId ID do plano
   * @returns true se deletado com sucesso, false se não encontrado
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      const { count: userPlansCount } = await this.supabase
        .from('user_plans')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId);

      if (userPlansCount && userPlansCount > 0) {
        throw createError(
          ErrorCodes.CONFLICT,
          'Não é possível deletar um plano que possui usuários associados',
        );
      }

      const { error } = await this.supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) {
        throw createError(
          ErrorCodes.DATABASE_ERROR,
          `Falha ao deletar plano: ${error.message}`,
        );
      }

      planCacheService.invalidatePlan(planId);
      logger.info(`Plano ${planId} deletado com sucesso.`);
      return true;
    } catch (error) {
      logger.error(`Erro ao deletar plano ${planId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao deletar plano',
      );
    }
  }

  private mapToEntity(data: any): Plan {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      durationDays: data.duration_days,
      isActive: data.is_active,
      features: data.features,
      interval: data.interval,
      isPublic: data.is_public,
      metadata: data.metadata,
      limits: data.limits,
      badge: data.badge,
      highlight: data.highlight,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDatabase(entity: Partial<Plan>): any {
    const data: any = {};

    if (entity.name !== undefined) {
      data.name = entity.name;
    }
    if (entity.description !== undefined) {
      data.description = entity.description;
    }
    if (entity.price !== undefined) {
      data.price = entity.price;
    }
    if (entity.currency !== undefined) {
      data.currency = entity.currency;
    }
    if (entity.durationDays !== undefined) {
      data.duration_days = entity.durationDays;
    }
    if (entity.isActive !== undefined) {
      data.is_active = entity.isActive;
    }
    if (entity.features !== undefined) {
      data.features = entity.features;
    }
    if (entity.interval !== undefined) {
      data.interval = entity.interval;
    }
    if (entity.isPublic !== undefined) {
      data.is_public = entity.isPublic;
    }
    if (entity.metadata !== undefined) {
      data.metadata = entity.metadata;
    }
    if (entity.limits !== undefined) {
      data.limits = entity.limits;
    }
    if (entity.badge !== undefined) {
      data.badge = entity.badge;
    }
    if (entity.highlight !== undefined) {
      data.highlight = entity.highlight;
    }

    return data;
  }
}
