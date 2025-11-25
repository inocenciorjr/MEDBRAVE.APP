import { SupabaseClient } from '@supabase/supabase-js';
import {
  Plan,
  CreatePlanPayload,
  PlanListOptions,
  PlanListResult,
  PlanInterval,
} from '../../../domain/payment/types';
import { IPlanService } from '../../../domain/payment/interfaces/IPlanService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';

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
      // Validação básica de dados
      if (!planData.name) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Nome do plano é obrigatório',
        );
      }

      if (typeof planData.price !== 'number' || planData.price < 0) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Preço do plano deve ser um número não negativo',
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

      const now = new Date();

      const newPlan = {
        id: planId,
        name: planData.name,
        description: planData.description || '',
        price: planData.price,
        currency: planData.currency || 'BRL',
        duration_days: planData.durationDays,
        interval: planData.interval || PlanInterval.MONTHLY,
        features: planData.features || [],
        metadata: planData.metadata || null,
        is_active: planData.isActive !== undefined ? planData.isActive : true,
        is_public: planData.isPublic !== undefined ? planData.isPublic : true,
        limits: planData.limits || {
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
          supportLevel: 'basic' as const,
        },
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from('plans')
        .insert(newPlan)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create plan: ${error.message}`);
      }

      const createdPlan = this.mapToEntity(data);
      logger.info(
        `Plano ${createdPlan.name} (ID: ${createdPlan.id}) criado com sucesso.`,
      );
      return createdPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Erro interno ao criar plano',
      );
    }
  }

  /**
   * Busca um plano pelo ID
   * @param planId ID do plano
   * @returns Plano encontrado ou null
   */
  async getPlanById(planId: string): Promise<Plan | null> {
    try {
      const { data, error } = await this.supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get plan: ${error.message}`);
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error(`Erro ao buscar plano ${planId}: ${error}`);
      throw error;
    }
  }

  /**
   * Busca todos os planos ativos e públicos
   * @returns Lista de planos ativos e públicos
   */
  async getActivePublicPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await this.supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to get active public plans: ${error.message}`);
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar planos ativos e públicos: ${error}`);
      throw error;
    }
  }

  /**
   * Busca todos os planos (admin)
   * @returns Lista de todos os planos
   */
  async getAllPlansAdmin(): Promise<Plan[]> {
    try {
      const { data, error } = await this.supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get all plans: ${error.message}`);
      }

      return data.map((item) => this.mapToEntity(item));
    } catch (error) {
      logger.error(`Erro ao buscar todos os planos: ${error}`);
      throw error;
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

      // Aplicar filtros
      if (options.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      if (options.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
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
        throw new Error(`Failed to list plans: ${error.message}`);
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
      throw error;
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
      const updateData = {
        ...this.mapToDatabase(updates),
        updated_at: new Date(),
      };

      // Remove campos que não devem ser atualizados
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
        throw new Error(`Failed to update plan: ${error.message}`);
      }

      const updatedPlan = this.mapToEntity(data);
      logger.info(`Plano ${planId} atualizado com sucesso.`);
      return updatedPlan;
    } catch (error) {
      logger.error(`Erro ao atualizar plano ${planId}: ${error}`);
      throw error;
    }
  }

  /**
   * Deleta um plano
   * @param planId ID do plano
   * @returns true se deletado com sucesso, false se não encontrado
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) {
        throw new Error(`Failed to delete plan: ${error.message}`);
      }

      logger.info(`Plano ${planId} deletado com sucesso.`);
      return true;
    } catch (error) {
      logger.error(`Erro ao deletar plano ${planId}: ${error}`);
      throw error;
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
    {
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
}
