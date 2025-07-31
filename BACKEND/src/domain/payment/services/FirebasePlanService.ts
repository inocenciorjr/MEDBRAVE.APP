import { firestore } from '../../../config/firebaseAdmin';
import { Plan, CreatePlanPayload, PlanListOptions, PlanListResult, PlanInterval } from '../types';
import { IPlanService } from '../interfaces/IPlanService';
import logger from '../../../utils/logger';
import { ErrorCodes, createError } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para planos
 */
const PLANS_COLLECTION = 'plans';

/**
 * Implementação do serviço de planos utilizando Firebase
 */
export class FirebasePlanService implements IPlanService {
  private plansCollection;

  /**
   * Construtor da classe FirebasePlanService
   */
  constructor() {
    this.plansCollection = firestore.collection(PLANS_COLLECTION);
  }

  /**
   * Cria um novo plano
   * @param planData Dados do plano
   * @param planId ID do plano (opcional)
   * @returns Plano criado
   */
  async createPlan(planData: CreatePlanPayload, planId?: string): Promise<Plan> {
    try {
      // Validação básica de dados
      if (!planData.name) {
        throw createError(ErrorCodes.VALIDATION_ERROR, 'Nome do plano é obrigatório');
      }

      if (typeof planData.price !== 'number' || planData.price < 0) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Preço do plano deve ser um número não negativo',
        );
      }

      if (planData.interval && !Object.values(PlanInterval).includes(planData.interval)) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          `Intervalo inválido. Valores permitidos: ${Object.values(PlanInterval).join(', ')}`,
        );
      }

      // Criar o documento do plano
      const planRef = planId ? this.plansCollection.doc(planId) : this.plansCollection.doc();
      const now = Timestamp.now();

      const newPlan: Plan = {
        id: planRef.id,
        name: planData.name,
        description: planData.description || '',
        price: planData.price,
        currency: planData.currency || 'BRL',
        durationDays: planData.durationDays,
        interval: planData.interval || PlanInterval.MONTHLY,
        features: planData.features || [],
        metadata: planData.metadata || null,
        isActive: planData.isActive !== undefined ? planData.isActive : true,
        isPublic: planData.isPublic !== undefined ? planData.isPublic : true,
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
          supportLevel: 'basic' as const
        },
        createdAt: now,
        updatedAt: now,
      };

      await planRef.set(newPlan);
      logger.info(`Plano ${newPlan.name} (ID: ${newPlan.id}) criado com sucesso.`);
      return newPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao criar plano: ${error}`);
    }
  }

  /**
   * Obtém um plano pelo seu ID
   * @param planId ID do plano
   * @returns Plano encontrado ou null
   */
  async getPlanById(planId: string): Promise<Plan | null> {
    try {
      const planDoc = await this.plansCollection.doc(planId).get();

      if (!planDoc.exists) {
        return null;
      }

      return planDoc.data() as Plan;
    } catch (error) {
      logger.error(`Erro ao buscar plano por ID ${planId}: ${error}`);
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao buscar plano: ${error}`);
    }
  }

  /**
   * Obtém todos os planos ativos e públicos
   * @returns Lista de planos ativos e públicos
   */
  async getActivePublicPlans(): Promise<Plan[]> {
    try {
      // Usando uma abordagem alternativa para evitar a necessidade de índice composto
      // Primeiro filtramos por isActive e depois filtramos o resultado em memória
      const snapshot = await this.plansCollection.where('isActive', '==', true).get();

      if (snapshot.empty) {
        return [];
      }

      // Filtragem em memória para isPublic
      const activePlans = snapshot.docs.map(doc => doc.data() as Plan);
      const activePublicPlans = activePlans.filter(plan => plan.isPublic === true);

      // Ordenação em memória por nome
      activePublicPlans.sort((a, b) => a.name.localeCompare(b.name));

      return activePublicPlans;
    } catch (error) {
      logger.error(`Erro ao buscar planos ativos e públicos: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar planos ativos e públicos: ${error}`,
      );
    }
  }

  /**
   * Busca todos os planos (para administração)
   */
  async getAllPlansAdmin(): Promise<Plan[]> {
    try {
      const snapshot = await this.plansCollection.orderBy('name', 'asc').get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map(doc => doc.data() as Plan);
    } catch (error) {
      logger.error(`Erro ao buscar todos os planos para administração: ${error}`);
      throw createError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        `Erro ao buscar todos os planos para administração: ${error}`,
      );
    }
  }

  /**
   * Lista planos com filtros e paginação
   * @param options Opções de filtragem e paginação
   */
  async listPlans(options: PlanListOptions = {}): Promise<PlanListResult> {
    try {
      const { isActive, isPublic, limit = 10, offset = 0, sortOrder = 'asc' } = options;

      let query: FirebaseFirestore.Query = this.plansCollection;

      // Aplicar filtros
      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }

      // Ordenação padrão por nome
      query = query.orderBy('name', sortOrder);

      // Executar consulta
      const snapshot = await query.get();

      if (snapshot.empty) {
        return {
          items: [],
          total: 0,
          limit,
          offset,
        };
      }

      // Filtrar manualmente para isPublic se necessário
      let allPlans = snapshot.docs.map(doc => doc.data() as Plan);

      if (isPublic !== undefined) {
        allPlans = allPlans.filter(plan => plan.isPublic === isPublic);
      }

      const total = allPlans.length;
      const items = allPlans.slice(offset, offset + limit);

      return {
        items,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error(`Erro ao listar planos: ${error}`);
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao listar planos: ${error}`);
    }
  }

  /**
   * Atualiza um plano existente
   * @param planId ID do plano
   * @param updates Dados a serem atualizados
   * @returns Plano atualizado ou null
   */
  async updatePlan(
    planId: string,
    updates: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Plan | null> {
    try {
      const planRef = this.plansCollection.doc(planId);
      const planDoc = await planRef.get();

      if (!planDoc.exists) {
        return null;
      }

      // Validações específicas para atualização
      if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price < 0)) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          'Preço do plano deve ser um número não negativo',
        );
      }

      if (updates.interval && !Object.values(PlanInterval).includes(updates.interval)) {
        throw createError(
          ErrorCodes.VALIDATION_ERROR,
          `Intervalo inválido. Valores permitidos: ${Object.values(PlanInterval).join(', ')}`,
        );
      }

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await planRef.update(updateData);

      const updatedPlanDoc = await planRef.get();
      return updatedPlanDoc.data() as Plan;
    } catch (error) {
      logger.error(`Erro ao atualizar plano ${planId}: ${error}`);
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, `Erro ao atualizar plano: ${error}`);
    }
  }

  /**
   * Exclui um plano
   * @param planId ID do plano
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      const planRef = this.plansCollection.doc(planId);
      const planDoc = await planRef.get();

      if (!planDoc.exists) {
        logger.warn(`Plano (ID: ${planId}) não encontrado para exclusão.`);
        return true;
      }

      await planRef.delete();
      logger.info(`Plano (ID: ${planId}) excluído com sucesso.`);
      return true;
    } catch (error) {
      logger.error(`Erro ao excluir plano ${planId}: ${error}`);
      return false;
    }
  }
}
