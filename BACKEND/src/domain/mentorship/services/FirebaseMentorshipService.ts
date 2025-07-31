import { Firestore, Timestamp, FieldValue, Query, DocumentData } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipPayload,
  ListMentorshipsOptions,
  MeetingFrequency,
  Mentorship,
  MentorshipStatus,
  PaginatedMentorshipsResult,
  UpdateMentorshipPayload,
} from '../types';
import { IMentorshipService } from '../interfaces';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorships';

/**
 * Implementação do serviço de mentorias usando Firebase
 */
export class FirebaseMentorshipService implements IMentorshipService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Cria uma nova mentoria
   * @param mentorshipData Dados da mentoria
   */
  async createMentorship(mentorshipData: CreateMentorshipPayload): Promise<Mentorship> {
    try {
      const { mentorId, menteeId, title } = mentorshipData;

      if (!mentorId || !menteeId || !title) {
        throw new AppError('ID do mentor, ID do mentorado e título são obrigatórios', 400);
      }

      if (mentorId === menteeId) {
        throw new AppError('Mentor e mentorado não podem ser o mesmo usuário', 400);
      }

      // Verificar se a frequência personalizada tem os dias definidos
      if (
        mentorshipData.meetingFrequency === MeetingFrequency.CUSTOM &&
        (!mentorshipData.customFrequencyDays || mentorshipData.customFrequencyDays <= 0)
      ) {
        throw new AppError(
          'Dias de frequência personalizada devem ser definidos quando a frequência é personalizada',
          400,
        );
      }

      // Verificar se os usuários existem
      const mentorDoc = await this.db.collection('users').doc(mentorId).get();
      if (!mentorDoc.exists) {
        throw new AppError(`Mentor com ID ${mentorId} não encontrado`, 404);
      }

      const menteeDoc = await this.db.collection('users').doc(menteeId).get();
      if (!menteeDoc.exists) {
        throw new AppError(`Mentorado com ID ${menteeId} não encontrado`, 404);
      }

      // Verificar se já existe uma mentoria ativa entre os usuários
      const existsActive = await this.existsActiveMentorshipBetweenUsers(mentorId, menteeId);
      if (existsActive) {
        throw new AppError('Já existe uma mentoria ativa ou pendente entre estes usuários', 409);
      }

      const id = uuidv4();
      const now = Timestamp.now();

      const newMentorship: Mentorship = {
        id,
        mentorId,
        menteeId,
        title,
        description: mentorshipData.description || undefined,
        status: MentorshipStatus.PENDING,
        startDate: now,
        endDate: null,
        meetingFrequency: mentorshipData.meetingFrequency || MeetingFrequency.WEEKLY,
        customFrequencyDays:
          mentorshipData.meetingFrequency === MeetingFrequency.CUSTOM
            ? mentorshipData.customFrequencyDays
            : undefined,
        nextMeetingDate: null,
        lastMeetingDate: null,
        meetingCount: 0,
        totalMeetings: mentorshipData.totalMeetings || 0,
        completedMeetings: 0,
        objectives: mentorshipData.objectives || [],
        notes: mentorshipData.notes || undefined,
        rating: null,
        feedback: null,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newMentorship);

      mentorshipLogger.info(`Mentoria criada com sucesso: ${id}`, {
        mentorId,
        menteeId,
        status: MentorshipStatus.PENDING,
      });

      return newMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar mentoria', 500);
    }
  }

  /**
   * Obtém uma mentoria pelo ID
   * @param id ID da mentoria
   */
  async getMentorshipById(id: string): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const mentorship = docSnap.data() as Mentorship;
      return mentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar mentoria', 500);
    }
  }

  /**
   * Atualiza uma mentoria existente
   * @param id ID da mentoria
   * @param updateData Dados para atualização
   */
  async updateMentorship(
    id: string,
    updateData: UpdateMentorshipPayload,
  ): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const now = Timestamp.now();
      const updates = {
        ...updateData,
        updatedAt: now,
      };

      await docRef.update(updates);

      mentorshipLogger.info(`Mentoria atualizada com sucesso: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar mentoria', 500);
    }
  }

  /**
   * Exclui uma mentoria
   * @param id ID da mentoria
   */
  async deleteMentorship(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return false;
      }

      await docRef.delete();

      mentorshipLogger.info(`Mentoria excluída com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir mentoria', 500);
    }
  }

  /**
   * Lista mentorias com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  async listMentorships(options: ListMentorshipsOptions = {}): Promise<PaginatedMentorshipsResult> {
    try {
      const { mentorId, menteeId, status, limit = 10, page = 1, startAfter } = options;

      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior ou igual a 1', 400);
      }

      let query: Query<DocumentData> = this.db.collection(COLLECTION_NAME);

      // Aplicar filtros
      if (mentorId) {
        query = query.where('mentorId', '==', mentorId);
      }

      if (menteeId) {
        query = query.where('menteeId', '==', menteeId);
      }

      if (status) {
        if (Array.isArray(status)) {
          if (status.length === 1) {
            query = query.where('status', '==', status[0]);
          } else {
            query = query.where('status', 'in', status);
          }
        } else {
          query = query.where('status', '==', status);
        }
      }

      // Ordenar por data de criação (decrescente)
      query = query.orderBy('createdAt', 'desc');

      // Calcular total para paginação
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      if (total === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const totalPages = Math.ceil(total / limit);

      // Aplicar paginação
      if (startAfter) {
        const startAfterDoc = await this.db.collection(COLLECTION_NAME).doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      } else if (page > 1) {
        // Para páginas além da primeira sem startAfter, usamos offset
        // (menos eficiente, mas necessário para paginação simples)
        const offset = (page - 1) * limit;
        query = query.offset(offset);
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      const mentorships = snapshot.docs.map(doc => doc.data() as Mentorship);

      // Determinar o próximo cursor para paginação contínua
      let nextPageStartAfter: string | undefined;
      if (mentorships.length === limit && page < totalPages) {
        nextPageStartAfter = mentorships[mentorships.length - 1].id;
      }

      return {
        items: mentorships,
        total,
        page,
        limit,
        totalPages,
        nextPageStartAfter,
      };
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar mentorias', 500);
    }
  }

  /**
   * Lista mentorias onde o usuário é mentor
   * @param mentorId ID do usuário mentor
   * @param status Status opcional para filtro
   */
  async getMentorshipsByMentor(
    mentorId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]> {
    try {
      if (!mentorId) {
        throw new AppError('ID do mentor é obrigatório', 400);
      }

      let query: Query<DocumentData> = this.db
        .collection(COLLECTION_NAME)
        .where('mentorId', '==', mentorId);

      if (status) {
        if (Array.isArray(status)) {
          if (status.length === 1) {
            query = query.where('status', '==', status[0]);
          } else {
            query = query.where('status', 'in', status);
          }
        } else {
          query = query.where('status', '==', status);
        }
      }

      // Não podemos usar orderBy sem um índice composto com os where's acima
      // Então vamos ordenar manualmente
      const snapshot = await query.get();
      const mentorships = snapshot.docs.map(doc => doc.data() as Mentorship);

      // Ordenar por data de criação decrescente
      return mentorships.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias por mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar mentorias por mentor', 500);
    }
  }

  /**
   * Lista mentorias onde o usuário é mentorado
   * @param menteeId ID do usuário mentorado
   * @param status Status opcional para filtro
   */
  async getMentorshipsByMentee(
    menteeId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]> {
    try {
      if (!menteeId) {
        throw new AppError('ID do mentorado é obrigatório', 400);
      }

      let query: Query<DocumentData> = this.db
        .collection(COLLECTION_NAME)
        .where('menteeId', '==', menteeId);

      if (status) {
        if (Array.isArray(status)) {
          if (status.length === 1) {
            query = query.where('status', '==', status[0]);
          } else {
            query = query.where('status', 'in', status);
          }
        } else {
          query = query.where('status', '==', status);
        }
      }

      // Não podemos usar orderBy sem um índice composto com os where's acima
      // Então vamos ordenar manualmente
      const snapshot = await query.get();
      const mentorships = snapshot.docs.map(doc => doc.data() as Mentorship);

      // Ordenar por data de criação decrescente
      return mentorships.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
      mentorshipLogger.error('Erro ao listar mentorias por mentorado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar mentorias por mentorado', 500);
    }
  }

  /**
   * Aceita uma mentoria pendente
   * @param id ID da mentoria
   */
  async acceptMentorship(id: string): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const mentorship = docSnap.data() as Mentorship;
      const now = Timestamp.now();
      const updates = {
        status: MentorshipStatus.ACTIVE,
        startDate: now,
        nextMeetingDate: this.calculateNextMeetingDate(
          now,
          mentorship.meetingFrequency || MeetingFrequency.WEEKLY,
          mentorship.customFrequencyDays,
        ),
        updatedAt: now,
      };

      await docRef.update(updates);

      mentorshipLogger.info(`Mentoria aceita com sucesso: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao aceitar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao aceitar mentoria', 500);
    }
  }

  /**
   * Cancela uma mentoria ativa ou pendente
   * @param id ID da mentoria
   * @param reason Motivo do cancelamento
   */
  async cancelMentorship(id: string, reason?: string): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const now = Timestamp.now();
      const updates: any = {
        status: MentorshipStatus.CANCELLED,
        endDate: now,
        updatedAt: now,
      };
      if (reason) {
        const mentorship = docSnap.data() as Mentorship;
        updates.notes = mentorship.notes
          ? `${mentorship.notes}\n\nMentoria cancelada: ${reason}`
          : `Mentoria cancelada: ${reason}`;
      }

      await docRef.update(updates);

      mentorshipLogger.info(`Mentoria cancelada com sucesso: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao cancelar mentoria', 500);
    }
  }

  /**
   * Completa uma mentoria
   * @param id ID da mentoria
   * @param rating Avaliação opcional
   * @param feedback Feedback opcional
   */
  async completeMentorship(
    id: string,
    rating?: number | null,
    feedback?: string | null,
  ): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Validar rating se fornecido
      if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
        throw new AppError('Avaliação deve estar entre 1 e 5', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const now = Timestamp.now();
      const updates: any = {
        status: MentorshipStatus.COMPLETED,
        endDate: now,
        updatedAt: now,
      };

      if (rating !== undefined) {
        updates.rating = rating;
      }

      if (feedback !== undefined) {
        updates.feedback = feedback;
      }

      await docRef.update(updates);

      mentorshipLogger.info(`Mentoria completada com sucesso: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao completar mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao completar mentoria', 500);
    }
  }

  /**
   * Registra a conclusão de uma reunião
   * @param id ID da mentoria
   */
  async recordMeetingCompletion(id: string): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const mentorship = docSnap.data() as Mentorship;
      const now = Timestamp.now();
      const updates: any = {
        completedMeetings: FieldValue.increment(1),
        lastMeetingDate: now,
        nextMeetingDate: this.calculateNextMeetingDate(
          now,
          mentorship.meetingFrequency || MeetingFrequency.WEEKLY,
          mentorship.customFrequencyDays,
        ),
        updatedAt: now,
      };

      // Se há um total de reuniões definido e alcançamos esse total,
      // a mentoria é completada automaticamente
      if (
        mentorship.totalMeetings &&
        mentorship.totalMeetings > 0 &&
        ((mentorship.completedMeetings ?? 0) + 1 >= (mentorship.totalMeetings ?? 0))
      ) {
        updates.status = MentorshipStatus.COMPLETED;
        updates.endDate = now;
      }

      await docRef.update(updates);

      mentorshipLogger.info(`Reunião registrada com sucesso para mentoria: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao registrar reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao registrar reunião', 500);
    }
  }

  /**
   * Atualiza os objetivos de uma mentoria
   * @param id ID da mentoria
   * @param objectives Lista de objetivos
   */
  async updateObjectives(id: string, objectives: string[]): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (!Array.isArray(objectives)) {
        throw new AppError('Objetivos devem ser uma lista', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const now = Timestamp.now();
      await docRef.update({
        objectives,
        updatedAt: now,
      });

      mentorshipLogger.info(`Objetivos atualizados com sucesso para mentoria: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar objetivos:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar objetivos', 500);
    }
  }

  /**
   * Atualiza a frequência de reuniões de uma mentoria
   * @param id ID da mentoria
   * @param frequency Nova frequência
   * @param customDays Dias personalizados (quando frequency = CUSTOM)
   */
  async updateMeetingFrequency(
    id: string,
    frequency: string,
    customDays?: number | null,
  ): Promise<Mentorship | null> {
    try {
      if (!id) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (!Object.values(MeetingFrequency).includes(frequency as MeetingFrequency)) {
        throw new AppError('Frequência inválida', 400);
      }

      if (frequency === MeetingFrequency.CUSTOM && (!customDays || customDays <= 0)) {
        throw new AppError(
          'Dias de frequência personalizada devem ser definidos quando a frequência é personalizada',
          400,
        );
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Mentoria com ID ${id} não encontrada`);
        return null;
      }

      const now = Timestamp.now();
      const updates: any = {
        meetingFrequency: frequency,
        updatedAt: now,
      };

      // Atualizar dias personalizados apenas se a frequência for CUSTOM
      if (frequency === MeetingFrequency.CUSTOM) {
        updates.customFrequencyDays = customDays;
      } else {
        // Remover dias personalizados se a frequência não for CUSTOM
        updates.customFrequencyDays = null;
      }

      // Recalcular a próxima data de reunião com base na nova frequência
      const nextMeetingDate = this.calculateNextMeetingDate(
        now,
        frequency as MeetingFrequency,
        frequency === MeetingFrequency.CUSTOM ? customDays : null,
      );

      updates.nextMeetingDate = nextMeetingDate;

      await docRef.update(updates);

      mentorshipLogger.info(`Frequência de reuniões atualizada com sucesso para mentoria: ${id}`);

      // Retornar a mentoria atualizada
      const updatedDocSnap = await docRef.get();
      const updatedMentorship = updatedDocSnap.data() as Mentorship;
      return updatedMentorship;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar frequência de reuniões:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar frequência de reuniões', 500);
    }
  }

  /**
   * Calcula a próxima data de reunião com base na frequência
   * @param baseDate Data base para cálculo
   * @param frequency Frequência das reuniões
   * @param customDays Dias personalizados (quando frequency = CUSTOM)
   */
  private calculateNextMeetingDate(
    baseDate: Timestamp,
    frequency: MeetingFrequency,
    customDays?: number | null,
  ): Timestamp {
    const baseDateMs = baseDate.toMillis();
    const oneDay = 24 * 60 * 60 * 1000; // 1 dia em milissegundos

    let nextDateMs: number;

    switch (frequency) {
      case MeetingFrequency.WEEKLY:
        // Próxima reunião em 7 dias
        nextDateMs = baseDateMs + 7 * oneDay;
        break;

      case MeetingFrequency.BIWEEKLY:
        // Próxima reunião em 14 dias
        nextDateMs = baseDateMs + 14 * oneDay;
        break;

      case MeetingFrequency.MONTHLY:
        // Próxima reunião em aproximadamente 30 dias
        nextDateMs = baseDateMs + 30 * oneDay;
        break;

      case MeetingFrequency.CUSTOM:
        // Próxima reunião em X dias personalizados
        if (!customDays || customDays <= 0) {
          // Fallback para semanal se os dias personalizados não forem válidos
          nextDateMs = baseDateMs + 7 * oneDay;
        } else {
          nextDateMs = baseDateMs + customDays * oneDay;
        }
        break;

      default:
        // Fallback para semanal
        nextDateMs = baseDateMs + 7 * oneDay;
    }

    return Timestamp.fromMillis(nextDateMs);
  }

  /**
   * Calcula o progresso de uma mentoria
   * @param mentorship Objeto da mentoria
   */
  getProgress(mentorship: Mentorship): number | null {
    if (!mentorship) {
      return null;
    }

    // Se a mentoria tem um total de reuniões definido
    if (mentorship.totalMeetings && mentorship.totalMeetings > 0) {
      const completedMeetings = mentorship.completedMeetings || 0;
      const progress = (completedMeetings / mentorship.totalMeetings) * 100;
      return Math.min(Math.round(progress), 100); // Não exceder 100%
    }

    // Se a mentoria está completada mas sem total de reuniões definido
    if (mentorship.status === MentorshipStatus.COMPLETED) {
      return 100;
    }

    // Se a mentoria está cancelada
    if (mentorship.status === MentorshipStatus.CANCELLED) {
      return null; // Ou talvez um valor diferente como -1
    }

    // Para mentorias pendentes ou ativas sem total de reuniões
    return null;
  }

  /**
   * Obtém um resumo da mentoria
   * @param mentorship Objeto da mentoria
   */
  getMentorshipSummary(mentorship: Mentorship): any {
    if (!mentorship) {
      return null;
    }

    const progress = this.getProgress(mentorship);
    const totalMeetings = mentorship.totalMeetings || 0;
    const completedMeetings = mentorship.completedMeetings || 0;
    const remainingMeetings = Math.max(0, totalMeetings - completedMeetings);

    // Calcular duração em dias
    const startDate = mentorship.startDate.toMillis();
    const endDate = mentorship.endDate ? mentorship.endDate.toMillis() : Date.now();
    const durationDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));

    return {
      id: mentorship.id,
      title: mentorship.title,
      status: mentorship.status,
      progress,
      durationDays,
      completedMeetings,
      totalMeetings,
      remainingMeetings,
      nextMeetingDate: mentorship.nextMeetingDate ? mentorship.nextMeetingDate.toDate() : null,
      lastMeetingDate: mentorship.lastMeetingDate ? mentorship.lastMeetingDate.toDate() : null,
      objectives: mentorship.objectives || [],
      rating: mentorship.rating,
      startDate: mentorship.startDate.toDate(),
      endDate: mentorship.endDate ? mentorship.endDate.toDate() : null,
    };
  }

  /**
   * Verifica se existem mentorias ativas entre mentor e mentorado
   * @param mentorId ID do mentor
   * @param menteeId ID do mentorado
   */
  async existsActiveMentorshipBetweenUsers(mentorId: string, menteeId: string): Promise<boolean> {
    try {
      if (!mentorId || !menteeId) {
        throw new AppError('IDs do mentor e mentorado são obrigatórios', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorId', '==', mentorId)
        .where('menteeId', '==', menteeId)
        .where('status', 'in', [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE])
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      mentorshipLogger.error('Erro ao verificar mentorias ativas entre usuários:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao verificar mentorias ativas entre usuários', 500);
    }
  }
}
