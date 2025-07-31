import { Firestore, Timestamp, Query, DocumentData } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipMeetingPayload,
  ListMentorshipMeetingsOptions,
  MeetingStatus,
  MeetingType,
  MentorshipMeeting,
  PaginatedMentorshipMeetingsResult,
  UpdateMentorshipMeetingPayload,
} from '../types';
import { IMentorshipMeetingService } from '../interfaces/IMentorshipMeetingService';
import { IMentorshipService } from '../interfaces/IMentorshipService';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorship_meetings';

/**
 * Implementação do serviço de reuniões de mentoria usando Firebase
 */
export class FirebaseMentorshipMeetingService implements IMentorshipMeetingService {
  private db: Firestore;
  private mentorshipService: IMentorshipService;

  constructor(db: Firestore, mentorshipService: IMentorshipService) {
    this.db = db;
    this.mentorshipService = mentorshipService;
  }

  /**
   * Cria uma nova reunião de mentoria
   * @param meetingData Dados da reunião
   */
  async createMeeting(meetingData: CreateMentorshipMeetingPayload): Promise<MentorshipMeeting> {
    try {
      const { mentorshipId, scheduledDate, duration, meetingType, agenda } = meetingData;

      if (!mentorshipId || !scheduledDate || !duration || !meetingType || !agenda) {
        throw new AppError(
          'ID da mentoria, data agendada, duração, tipo de reunião e agenda são obrigatórios',
          400,
        );
      }

      // Verificar se a mentoria existe e está ativa
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      if (mentorship.status !== 'active') {
        throw new AppError('Só é possível criar reuniões para mentorias ativas', 400);
      }

      // Converter scheduledDate para Timestamp se for Date
      const scheduledTimestamp =
        scheduledDate instanceof Date ? Timestamp.fromDate(scheduledDate) : scheduledDate;

      // Verificar se a data agendada é futura
      const now = Timestamp.now();
      if (scheduledTimestamp.toMillis() < now.toMillis()) {
        throw new AppError('A data da reunião deve ser futura', 400);
      }

      const id = uuidv4();

      const newMeeting: MentorshipMeeting = {
        id,
        mentorshipId,
        scheduledDate: scheduledTimestamp,
        actualDate: null,
        duration,
        actualDuration: null,
        status: MeetingStatus.SCHEDULED,
        meetingType,
        meetingLink: meetingData.meetingLink || null,
        meetingLocation: meetingData.meetingLocation || null,
        agenda,
        notes: null,
        mentorFeedback: null,
        studentFeedback: null,
        rescheduledFromId: meetingData.rescheduledFromId || null,
        rescheduledToId: null,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newMeeting);

      // Se esta reunião foi reagendada de outra, atualizar a reunião original
      if (meetingData.rescheduledFromId) {
        await this.db.collection(COLLECTION_NAME).doc(meetingData.rescheduledFromId).update({
          status: MeetingStatus.RESCHEDULED,
          rescheduledToId: id,
          updatedAt: now,
        });
      }

      mentorshipLogger.info(`Reunião de mentoria criada com sucesso: ${id}`, {
        mentorshipId,
        status: MeetingStatus.SCHEDULED,
      });

      return newMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar reunião de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar reunião de mentoria', 500);
    }
  }

  /**
   * Obtém uma reunião pelo ID
   * @param id ID da reunião
   */
  async getMeetingById(id: string): Promise<MentorshipMeeting | null> {
    try {
      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar reunião de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar reunião de mentoria', 500);
    }
  }

  /**
   * Atualiza uma reunião existente
   * @param id ID da reunião
   * @param updateData Dados para atualização
   */
  async updateMeeting(
    id: string,
    updateData: UpdateMentorshipMeetingPayload,
  ): Promise<MentorshipMeeting | null> {
    try {
      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      // Verificações de estado
      if (
        meeting.status === MeetingStatus.CANCELLED ||
        meeting.status === MeetingStatus.COMPLETED
      ) {
        throw new AppError('Reuniões canceladas ou completadas não podem ser atualizadas', 400);
      }

      // Converter scheduledDate para Timestamp se for Date
      const updates: any = { ...updateData };

      if (updateData.scheduledDate instanceof Date) {
        updates.scheduledDate = Timestamp.fromDate(updateData.scheduledDate);
      }

      const now = Timestamp.now();
      updates.updatedAt = now;

      await docRef.update(updates);

      mentorshipLogger.info(`Reunião atualizada com sucesso: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar reunião de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar reunião de mentoria', 500);
    }
  }

  /**
   * Exclui uma reunião
   * @param id ID da reunião
   */
  async deleteMeeting(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return false;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      // Não permitir exclusão de reuniões completadas
      if (meeting.status === MeetingStatus.COMPLETED) {
        throw new AppError('Reuniões completadas não podem ser excluídas', 400);
      }

      await docRef.delete();

      // Se esta reunião foi reagendada de outra, limpar a referência
      if (meeting.rescheduledFromId) {
        const originalRef = this.db.collection(COLLECTION_NAME).doc(meeting.rescheduledFromId);
        const originalSnap = await originalRef.get();

        if (originalSnap.exists) {
          await originalRef.update({
            rescheduledToId: null,
            status: MeetingStatus.CANCELLED,
            updatedAt: Timestamp.now(),
          });
        }
      }

      // Se outra reunião foi reagendada a partir desta, limpar a referência
      if (meeting.rescheduledToId) {
        const rescheduledRef = this.db.collection(COLLECTION_NAME).doc(meeting.rescheduledToId);
        const rescheduledSnap = await rescheduledRef.get();

        if (rescheduledSnap.exists) {
          await rescheduledRef.update({
            rescheduledFromId: null,
            updatedAt: Timestamp.now(),
          });
        }
      }

      mentorshipLogger.info(`Reunião excluída com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir reunião de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir reunião de mentoria', 500);
    }
  }

  /**
   * Lista reuniões com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  async listMeetings(
    options: ListMentorshipMeetingsOptions,
  ): Promise<PaginatedMentorshipMeetingsResult> {
    try {
      const { mentorshipId, status, limit = 10, page = 1, startAfter, upcoming = false } = options;

      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior ou igual a 1', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      let query: Query<DocumentData> = this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId);

      // Aplicar filtros de status
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

      // Para reuniões futuras, filtrar por data agendada > agora
      if (upcoming) {
        const now = Timestamp.now();
        query = query.where('scheduledDate', '>', now);
      }

      // Ordenar por data agendada
      query = query.orderBy('scheduledDate', upcoming ? 'asc' : 'desc');

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
        const offset = (page - 1) * limit;
        query = query.offset(offset);
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      const meetings = snapshot.docs.map(doc => doc.data() as MentorshipMeeting);

      // Determinar o próximo cursor para paginação contínua
      let nextPageStartAfter: string | undefined;
      if (meetings.length === limit && page < totalPages) {
        nextPageStartAfter = meetings[meetings.length - 1].id;
      }

      return {
        items: meetings,
        total,
        page,
        limit,
        totalPages,
        nextPageStartAfter,
      };
    } catch (error) {
      mentorshipLogger.error('Erro ao listar reuniões de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar reuniões de mentoria', 500);
    }
  }

  /**
   * Lista reuniões de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getMeetingsByMentorship(mentorshipId: string): Promise<MentorshipMeeting[]> {
    try {
      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .orderBy('scheduledDate', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipMeeting);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar reuniões por mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar reuniões por mentoria', 500);
    }
  }

  /**
   * Lista reuniões futuras de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getUpcomingMeetings(mentorshipId: string): Promise<MentorshipMeeting[]> {
    try {
      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const now = Timestamp.now();

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .where('scheduledDate', '>', now)
        .where('status', '==', MeetingStatus.SCHEDULED)
        .orderBy('scheduledDate', 'asc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipMeeting);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar reuniões futuras:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar reuniões futuras', 500);
    }
  }

  /**
   * Marca uma reunião como concluída
   * @param id ID da reunião
   * @param actualDate Data real da reunião
   * @param actualDuration Duração real em minutos
   * @param notes Notas opcionais
   * @param mentorFeedback Feedback do mentor opcional
   * @param studentFeedback Feedback do aluno opcional
   */
  async completeMeeting(
    id: string,
    actualDate: Date,
    actualDuration: number,
    notes?: string | null,
    mentorFeedback?: string | null,
    studentFeedback?: string | null,
  ): Promise<MentorshipMeeting | null> {
    try {
      if (!id || !actualDate || !actualDuration) {
        throw new AppError('ID da reunião, data real e duração real são obrigatórios', 400);
      }

      if (actualDuration <= 0) {
        throw new AppError('A duração real deve ser maior que zero', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      if (meeting.status !== MeetingStatus.SCHEDULED) {
        throw new AppError('Apenas reuniões agendadas podem ser marcadas como concluídas', 400);
      }

      const now = Timestamp.now();
      const actualTimestamp = Timestamp.fromDate(actualDate);

      const updates: any = {
        status: MeetingStatus.COMPLETED,
        actualDate: actualTimestamp,
        actualDuration,
        updatedAt: now,
      };

      if (notes !== undefined) {
        updates.notes = notes;
      }

      if (mentorFeedback !== undefined) {
        updates.mentorFeedback = mentorFeedback;
      }

      if (studentFeedback !== undefined) {
        updates.studentFeedback = studentFeedback;
      }

      await docRef.update(updates);

      // Registrar a conclusão da reunião na mentoria
      await this.mentorshipService.recordMeetingCompletion(meeting.mentorshipId);

      mentorshipLogger.info(`Reunião marcada como concluída com sucesso: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao concluir reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao concluir reunião', 500);
    }
  }

  /**
   * Cancela uma reunião
   * @param id ID da reunião
   * @param reason Motivo do cancelamento
   */
  async cancelMeeting(id: string, reason?: string | null): Promise<MentorshipMeeting | null> {
    try {
      if (!id) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      if (
        meeting.status === MeetingStatus.CANCELLED ||
        meeting.status === MeetingStatus.COMPLETED
      ) {
        throw new AppError('Reuniões já canceladas ou concluídas não podem ser canceladas', 400);
      }

      const now = Timestamp.now();
      const updates: any = {
        status: MeetingStatus.CANCELLED,
        updatedAt: now,
      };

      if (reason) {
        updates.notes = meeting.notes
          ? `${meeting.notes}\n\nCancelada: ${reason}`
          : `Cancelada: ${reason}`;
      }

      await docRef.update(updates);

      mentorshipLogger.info(`Reunião cancelada com sucesso: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao cancelar reunião', 500);
    }
  }

  /**
   * Reagenda uma reunião existente para uma nova data
   * @param id ID da reunião
   * @param newDate Nova data da reunião
   * @param newDuration Nova duração (opcional)
   * @param newMeetingType Novo tipo de reunião (opcional)
   * @param newMeetingLink Novo link de reunião (opcional)
   * @param newMeetingLocation Novo local de reunião (opcional)
   * @param newAgenda Nova agenda (opcional)
   * @param reason Motivo do reagendamento (opcional)
   */
  async rescheduleMeeting(
    id: string,
    newDate: Date,
    newDuration?: number | null,
    newMeetingType?: MeetingType | null,
    newMeetingLink?: string | null,
    newMeetingLocation?: string | null,
    newAgenda?: string | null,
    reason?: string | null,
  ): Promise<MentorshipMeeting | null> {
    try {
      if (!id || !newDate) {
        throw new AppError('ID da reunião e nova data são obrigatórios', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      if (
        meeting.status === MeetingStatus.CANCELLED ||
        meeting.status === MeetingStatus.COMPLETED
      ) {
        throw new AppError('Reuniões já canceladas ou concluídas não podem ser reagendadas', 400);
      }

      // Verificar se a nova data é futura
      const now = Timestamp.now();
      const newTimestamp = Timestamp.fromDate(newDate);

      if (newTimestamp.toMillis() < now.toMillis()) {
        throw new AppError('A nova data da reunião deve ser futura', 400);
      }

      // Criar payload para a nova reunião
      const newMeetingData: CreateMentorshipMeetingPayload = {
        mentorshipId: meeting.mentorshipId,
        scheduledDate: newDate,
        duration: newDuration ?? meeting.duration,
        meetingType: newMeetingType ?? meeting.meetingType,
        meetingLink: newMeetingLink ?? meeting.meetingLink ?? undefined,
        meetingLocation: newMeetingLocation ?? meeting.meetingLocation ?? undefined,
        agenda: newAgenda ?? meeting.agenda,
        rescheduledFromId: id,
      };

      // Criar a nova reunião
      const newMeeting = await this.createMeeting(newMeetingData);

      // Atualizar a reunião original com o motivo, se fornecido
      if (reason) {
        const notes = meeting.notes
          ? `${meeting.notes}\n\nReagendada: ${reason}`
          : `Reagendada: ${reason}`;

        await docRef.update({
          notes,
          updatedAt: now,
        });
      }

      mentorshipLogger.info(`Reunião reagendada com sucesso: ${id} -> ${newMeeting.id}`);

      return newMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao reagendar reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao reagendar reunião', 500);
    }
  }

  /**
   * Adiciona notas a uma reunião
   * @param id ID da reunião
   * @param notesToAdd Notas a serem adicionadas
   */
  async addNotes(id: string, notesToAdd: string): Promise<MentorshipMeeting | null> {
    try {
      if (!id || !notesToAdd) {
        throw new AppError('ID da reunião e notas são obrigatórios', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      // Atualizar ou criar as notas
      const updatedNotes = meeting.notes ? `${meeting.notes}\n\n${notesToAdd}` : notesToAdd;

      const now = Timestamp.now();
      await docRef.update({
        notes: updatedNotes,
        updatedAt: now,
      });

      mentorshipLogger.info(`Notas adicionadas com sucesso à reunião: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao adicionar notas à reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao adicionar notas à reunião', 500);
    }
  }

  /**
   * Adiciona feedback do mentor a uma reunião
   * @param id ID da reunião
   * @param feedback Feedback a ser adicionado
   */
  async addMentorFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null> {
    try {
      if (!id || !feedback) {
        throw new AppError('ID da reunião e feedback são obrigatórios', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      if (meeting.status !== MeetingStatus.COMPLETED) {
        throw new AppError('Só é possível adicionar feedback a reuniões concluídas', 400);
      }

      const now = Timestamp.now();
      await docRef.update({
        mentorFeedback: feedback,
        updatedAt: now,
      });

      mentorshipLogger.info(`Feedback do mentor adicionado com sucesso à reunião: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao adicionar feedback do mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao adicionar feedback do mentor', 500);
    }
  }

  /**
   * Adiciona feedback do aluno a uma reunião
   * @param id ID da reunião
   * @param feedback Feedback a ser adicionado
   */
  async addStudentFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null> {
    try {
      if (!id || !feedback) {
        throw new AppError('ID da reunião e feedback são obrigatórios', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Reunião com ID ${id} não encontrada`);
        return null;
      }

      const meeting = docSnap.data() as MentorshipMeeting;

      if (meeting.status !== MeetingStatus.COMPLETED) {
        throw new AppError('Só é possível adicionar feedback a reuniões concluídas', 400);
      }

      const now = Timestamp.now();
      await docRef.update({
        studentFeedback: feedback,
        updatedAt: now,
      });

      mentorshipLogger.info(`Feedback do aluno adicionado com sucesso à reunião: ${id}`);

      // Retornar a reunião atualizada
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipMeeting;
    } catch (error) {
      mentorshipLogger.error('Erro ao adicionar feedback do aluno:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao adicionar feedback do aluno', 500);
    }
  }

  /**
   * Verifica se uma reunião é futura
   * @param meeting Objeto da reunião
   */
  isUpcoming(meeting: MentorshipMeeting): boolean {
    if (!meeting || meeting.status !== MeetingStatus.SCHEDULED) {
      return false;
    }

    const now = Timestamp.now();
    return meeting.scheduledDate.toMillis() > now.toMillis();
  }

  /**
   * Obtém um resumo da reunião
   * @param meeting Objeto da reunião
   */
  getMeetingSummary(meeting: MentorshipMeeting): any {
    if (!meeting) {
      return null;
    }

    // Calcular tempo até a reunião ou desde a reunião, em horas
    const now = Timestamp.now().toMillis();
    const scheduledTime = meeting.scheduledDate.toMillis();
    const timeDiffHours = Math.abs(scheduledTime - now) / (1000 * 60 * 60);
    const isUpcoming = scheduledTime > now;

    return {
      id: meeting.id,
      mentorshipId: meeting.mentorshipId,
      status: meeting.status,
      isUpcoming: this.isUpcoming(meeting),
      meetingType: meeting.meetingType,
      scheduled: {
        date: meeting.scheduledDate.toDate(),
        duration: meeting.duration,
      },
      actual: meeting.actualDate
        ? {
          date: meeting.actualDate.toDate(),
          duration: meeting.actualDuration,
        }
        : null,
      timeUntilOrSince: {
        hours: Math.round(timeDiffHours * 10) / 10,
        isPast: !isUpcoming,
      },
      agenda: meeting.agenda,
      hasFeedback: !!(meeting.mentorFeedback || meeting.studentFeedback),
      wasRescheduled: meeting.status === MeetingStatus.RESCHEDULED,
    };
  }
}
