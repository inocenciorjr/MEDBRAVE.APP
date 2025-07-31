import { firestore } from '../../../config/firebaseAdmin';
import {
  UserPlan,
  CreateUserPlanPayload,
  UpdateUserPlanPayload,
  UserPlanStatus,
  PaymentMethod,
  UserPlanListOptions,
  UserPlanListResult,
} from '../types';
import { IUserPlanService } from '../interfaces/IUserPlanService';
import { IPlanService } from '../interfaces/IPlanService';
import { IPaymentService } from '../interfaces/IPaymentService';
import logger from '../../../utils/logger';
import { AppError } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para planos de usuários
 */
const USER_PLANS_COLLECTION = 'userPlans';

/**
 * Implementação do serviço de planos de usuários utilizando Firebase
 */
export class FirebaseUserPlanService implements IUserPlanService {
  private userPlansCollection;
  private planService: IPlanService | null = null;
  private paymentService: IPaymentService | null = null;

  /**
   * Construtor da classe FirebaseUserPlanService
   * @param planService Serviço de planos (opcional)
   * @param paymentService Serviço de pagamentos (opcional)
   */
  constructor(planService?: IPlanService, paymentService?: IPaymentService) {
    this.userPlansCollection = firestore.collection(USER_PLANS_COLLECTION);

    if (planService) {
      this.planService = planService;
    }

    if (paymentService) {
      this.paymentService = paymentService;
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
          throw new AppError(500, `Plano (ID: ${userPlanData.planId}) não encontrado`);
        }
      }

      // Criar referência do documento
      const userPlanRef = this.userPlansCollection.doc();
      const now = Timestamp.now();

      // Converter datas para timestamps
      const startTimestamp =
        userPlanData.startDate instanceof Date
          ? Timestamp.fromDate(userPlanData.startDate)
          : userPlanData.startDate;

      let endTimestamp = null;
      if (userPlanData.endDate) {
        endTimestamp =
          userPlanData.endDate instanceof Date
            ? Timestamp.fromDate(userPlanData.endDate)
            : userPlanData.endDate;
      }

      let trialEndsTimestamp = null;
      if (userPlanData.trialEndsAt) {
        trialEndsTimestamp =
          userPlanData.trialEndsAt instanceof Date
            ? Timestamp.fromDate(userPlanData.trialEndsAt)
            : userPlanData.trialEndsAt;
      }

      // Criar o objeto do plano de usuário
      const newUserPlan: UserPlan = {
        id: userPlanRef.id,
        userId: userPlanData.userId,
        planId: userPlanData.planId,
        status: userPlanData.status || UserPlanStatus.PENDING_PAYMENT,
        startDate: startTimestamp,
        endDate: endTimestamp || Timestamp.now(),
        nextBillingDate: Timestamp.now(),
        paymentMethod: userPlanData.paymentMethod || PaymentMethod.FREE,
        autoRenew: userPlanData.autoRenew !== undefined ? userPlanData.autoRenew : false,
        cancelledAt: Timestamp.now(),
        cancellationReason: null,
        trialEndsAt: trialEndsTimestamp || Timestamp.now(),
        lastPaymentId: userPlanData.lastPaymentId || null,
        metadata: userPlanData.metadata || null,
        createdAt: now,
        updatedAt: now,
      };

      await userPlanRef.set(newUserPlan);
      logger.info(
        `Plano de usuário (ID: ${newUserPlan.id}) para o usuário ${userPlanData.userId} e plano ${userPlanData.planId} criado com sucesso.`,
      );
      return newUserPlan;
    } catch (error) {
      logger.error(`Erro ao criar plano de usuário: ${error}`);
      throw error;
    }
  }

  /**
   * Obtém um plano de usuário pelo seu ID
   * @param userPlanId ID do plano de usuário
   * @returns Plano de usuário encontrado ou null
   */
  async getUserPlanById(userPlanId: string): Promise<UserPlan | null> {
    try {
      const userPlanDoc = await this.userPlansCollection.doc(userPlanId).get();

      if (!userPlanDoc.exists) {
        throw new AppError(404, `Plano de usuário (ID: ${userPlanId}) não encontrado`);
      }

      return userPlanDoc.data() as UserPlan;
    } catch (error) {
      logger.error(`Erro ao buscar plano de usuário por ID ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtém planos de usuário por ID de usuário
   * @param userId ID do usuário
   * @returns Lista de planos do usuário
   */
  async getUserPlansByUserId(userId: string): Promise<UserPlan[]> {
    try {
      const snapshot = await this.userPlansCollection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as UserPlan);
    } catch (error) {
      logger.error(`Erro ao buscar planos do usuário ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtém planos ativos de um usuário
   * @param userId ID do usuário
   * @returns Lista de planos ativos do usuário
   */
  async getUserActivePlans(userId: string): Promise<UserPlan[]> {
    try {
      const snapshot = await this.userPlansCollection
        .where('userId', '==', userId)
        .where('status', '==', UserPlanStatus.ACTIVE)
        .get();

      return snapshot.docs.map(doc => doc.data() as UserPlan);
    } catch (error) {
      logger.error(`Erro ao buscar planos ativos do usuário ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtém o plano ativo de um usuário para um plano específico
   * @param userId ID do usuário
   * @param planId ID do plano
   * @returns Plano de usuário ativo encontrado ou null
   */
  async getActiveUserPlanByUserIdAndPlanId(
    userId: string,
    planId: string,
  ): Promise<UserPlan | null> {
    try {
      const snapshot = await this.userPlansCollection
        .where('userId', '==', userId)
        .where('planId', '==', planId)
        .where('status', '==', UserPlanStatus.ACTIVE)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as UserPlan;
    } catch (error) {
      logger.error(
        `Erro ao buscar plano ativo do usuário ${userId} para o plano ${planId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Atualiza um plano de usuário existente
   * @param userPlanId ID do plano de usuário
   * @param updates Dados a serem atualizados
   * @returns Plano de usuário atualizado ou null
   */
  async updateUserPlan(
    userPlanId: string,
    updates: UpdateUserPlanPayload,
  ): Promise<UserPlan | null> {
    try {
      const userPlanRef = this.userPlansCollection.doc(userPlanId);
      const userPlanDoc = await userPlanRef.get();

      if (!userPlanDoc.exists) {
        return null;
      }

      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Converter datas para timestamps
      if (updates.startDate instanceof Date) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }

      if (updates.endDate instanceof Date) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      } else if (updates.endDate === null) {
        updateData.endDate = null;
      }

      if (updates.nextBillingDate instanceof Date) {
        updateData.nextBillingDate = Timestamp.fromDate(updates.nextBillingDate);
      } else if (updates.nextBillingDate === null) {
        updateData.nextBillingDate = null;
      }

      if (updates.cancelledAt instanceof Date) {
        updateData.cancelledAt = Timestamp.fromDate(updates.cancelledAt);
      } else if (updates.cancelledAt === null) {
        updateData.cancelledAt = null;
      }

      if (updates.trialEndsAt instanceof Date) {
        updateData.trialEndsAt = Timestamp.fromDate(updates.trialEndsAt);
      } else if (updates.trialEndsAt === null) {
        updateData.trialEndsAt = null;
      }

      await userPlanRef.update(updateData);

      const updatedUserPlanDoc = await userPlanRef.get();
      return updatedUserPlanDoc.data() as UserPlan;
    } catch (error) {
      logger.error(`Erro ao atualizar plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Atualiza o status de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param status Novo status
   * @param reason Motivo da alteração (opcional)
   * @returns Plano de usuário atualizado ou null
   */
  async updateUserPlanStatus(
    userPlanId: string,
    status: UserPlanStatus,
    reason?: string,
  ): Promise<UserPlan> {
    try {
      const userPlan = await this.getUserPlanById(userPlanId);
      if (!userPlan) throw new AppError(404, `Plano de usuário (ID: ${userPlanId}) não encontrado`);
      const updateData: UpdateUserPlanPayload = { status };
      if (status === UserPlanStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = reason || 'Cancelado pelo usuário ou sistema';
        updateData.autoRenew = false;
      } else if (status === UserPlanStatus.ACTIVE) {
        updateData.cancelledAt = null;
        updateData.cancellationReason = null;
      }
      const updated = await this.updateUserPlan(userPlanId, updateData);
      if (!updated) throw new AppError(500, 'Falha ao atualizar status do plano de usuário');
      return updated;
    } catch (error) {
      logger.error(`Erro ao atualizar status do plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Atualiza os metadados de um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param metadataUpdates Atualizações de metadados
   * @returns Plano de usuário atualizado ou null
   */
  async updateUserPlanMetadata(
    userPlanId: string,
    metadataUpdates: Record<string, any>,
  ): Promise<UserPlan> {
    try {
      const userPlan = await this.getUserPlanById(userPlanId);
      if (!userPlan) throw new AppError(404, `Plano de usuário (ID: ${userPlanId}) não encontrado`);
      const currentMetadata = userPlan.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        ...metadataUpdates,
      };
      const updated = await this.updateUserPlan(userPlanId, { metadata: updatedMetadata });
      if (!updated) throw new AppError(500, 'Falha ao atualizar metadados do plano de usuário');
      return updated;
    } catch (error) {
      logger.error(`Erro ao atualizar metadados do plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Renova um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param durationDays Duração em dias
   * @param paymentId ID do novo pagamento (opcional)
   * @param paymentMethod Método de pagamento (opcional)
   * @returns Plano de usuário renovado ou null
   */
  async renewUserPlan(
    userPlanId: string,
    durationDays: number,
    paymentId?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<UserPlan> {
    try {
      const userPlan = await this.getUserPlanById(userPlanId);
      if (!userPlan) throw new AppError(404, `Plano de usuário (ID: ${userPlanId}) não encontrado`);
      let currentEndDate: Date;
      if (userPlan.endDate && typeof (userPlan.endDate as any).toDate === 'function') {
        currentEndDate = (userPlan.endDate as any).toDate();
      } else if (userPlan.endDate instanceof Date) {
        currentEndDate = userPlan.endDate;
      } else {
        currentEndDate = new Date();
      }
      const renewalStartDate = currentEndDate < new Date() ? new Date() : currentEndDate;
      const newEndDate = new Date(renewalStartDate.getTime());
      newEndDate.setDate(newEndDate.getDate() + durationDays);
      const updates: UpdateUserPlanPayload = {
        endDate: newEndDate,
        status: UserPlanStatus.ACTIVE,
        lastPaymentId: paymentId || userPlan.lastPaymentId,
        paymentMethod: paymentMethod || userPlan.paymentMethod,
        autoRenew: userPlan.autoRenew,
        cancellationReason: null,
        cancelledAt: null,
      };
      const updated = await this.updateUserPlan(userPlanId, updates);
      if (!updated) throw new AppError(500, 'Falha ao renovar plano de usuário');
      return updated;
    } catch (error) {
      logger.error(`Erro ao renovar plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Cancela um plano de usuário
   * @param userPlanId ID do plano de usuário
   * @param reason Motivo do cancelamento (opcional)
   * @returns Plano de usuário cancelado ou null
   */
  async cancelUserPlan(userPlanId: string, reason?: string): Promise<UserPlan> {
    try {
      const userPlan = await this.getUserPlanById(userPlanId);
      if (userPlan && userPlan.status === UserPlanStatus.CANCELLED) {
        logger.warn(`Plano de usuário (ID: ${userPlanId}) já está cancelado.`);
        return userPlan;
      }

      const updated = await this.updateUserPlanStatus(userPlanId, UserPlanStatus.CANCELLED, reason);
      if (!updated) throw new AppError(500, 'Falha ao cancelar plano de usuário');
      return updated;
    } catch (error) {
      logger.error(`Erro ao cancelar plano de usuário ${userPlanId}: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica e expira planos de usuário vencidos
   * @returns Número de planos atualizados
   */
  async checkAndExpireUserPlans(): Promise<{ processedCount: number; expiredCount: number }> {
    try {
      const now = Timestamp.now();
      const snapshot = await this.userPlansCollection
        .where('status', '==', UserPlanStatus.ACTIVE)
        .where('endDate', '<', now)
        .get();

      if (snapshot.empty) {
        return { processedCount: 0, expiredCount: 0 };
      }

      const batch = firestore.batch();
      let processedCount = 0;
      let expiredCount = 0;

      snapshot.forEach((doc: any) => {
        const userPlan = doc.data() as UserPlan;
        processedCount++;
        // Não expirar planos com renovação automática
        if (!userPlan.autoRenew) {
          batch.update(doc.ref, {
            status: UserPlanStatus.EXPIRED,
            updatedAt: now,
          });
          expiredCount++;
        }
      });

      if (expiredCount > 0) {
        await batch.commit();
        logger.info(`${expiredCount} planos de usuário marcados como expirados`);
      }

      return { processedCount, expiredCount };
    } catch (error) {
      logger.error(`Erro ao verificar e expirar planos de usuário: ${error}`);
      throw error;
    }
  }

  /**
   * Trata a alteração do plano após um reembolso
   * @param paymentId ID do pagamento reembolsado
   */
  async handlePlanChangeAfterRefund(paymentId: string): Promise<void> {
    try {
      if (!this.paymentService) {
        logger.warn(
          'Serviço de pagamentos não disponível, não é possível tratar mudança de plano após reembolso',
        );
        return;
      }

      // Obter o pagamento reembolsado
      const payment = await this.paymentService.getPaymentById(paymentId);
      if (!payment || !payment.userPlanId) {
        logger.warn(
          `Pagamento ${paymentId} não encontrado ou não está associado a um plano de usuário.`,
        );
        return;
      }

      // Obter o plano de usuário associado
      const userPlan = await this.getUserPlanById(payment.userPlanId);
      if (!userPlan) {
        logger.warn(
          `Plano de usuário (ID: ${payment.userPlanId}) associado ao pagamento ${paymentId} não encontrado.`,
        );
        return;
      }

      // Cancelar ou mudar o status do plano com base na política da plataforma
      // Aqui implementamos uma lógica de cancelamento simples
      await this.updateUserPlanStatus(
        userPlan.id,
        UserPlanStatus.CANCELLED,
        `Cancelado automaticamente após reembolso do pagamento ${paymentId}`,
      );

      logger.info(
        `Plano de usuário ${userPlan.id} cancelado após reembolso do pagamento ${paymentId}`,
      );
    } catch (error) {
      logger.error(`Erro ao tratar mudança de plano após reembolso ${paymentId}: ${error}`);
      throw error;
    }
  }

  /**
   * Lista planos de usuário com base em filtros
   */
  async listUserPlans(options: UserPlanListOptions): Promise<UserPlanListResult> {
    try {
      let query = this.userPlansCollection as any;
      if (options.userId) query = query.where('userId', '==', options.userId);
      if (options.planId) query = query.where('planId', '==', options.planId);
      if (options.status) query = query.where('status', '==', options.status);
      if (options.active) query = query.where('status', '==', UserPlanStatus.ACTIVE);
      if (options.startDate) query = query.where('startDate', '>=', Timestamp.fromDate(options.startDate));
      if (options.endDate) query = query.where('endDate', '<=', Timestamp.fromDate(options.endDate));
      if (options.sortBy) query = query.orderBy(options.sortBy, options.sortOrder || 'desc');
      if (options.limit) query = query.limit(options.limit);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc: any) => doc.data() as UserPlan);
      return {
        items,
        total: items.length,
        limit: options.limit || items.length,
        offset: options.offset || 0,
      };
    } catch (error) {
      logger.error(`Erro ao listar planos de usuário: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica se um usuário possui um plano ativo
   */
  async userHasActivePlan(userId: string): Promise<boolean> {
    try {
      const snapshot = await this.userPlansCollection
        .where('userId', '==', userId)
        .where('status', '==', UserPlanStatus.ACTIVE)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      logger.error(`Erro ao verificar plano ativo do usuário ${userId}: ${error}`);
      throw error;
    }
  }
}
