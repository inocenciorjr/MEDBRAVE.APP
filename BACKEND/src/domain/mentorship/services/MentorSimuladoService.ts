import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateQuestionId } from '../../../utils/idGenerator';

// ============================================================================
// TYPES
// ============================================================================

export interface MentorSimuladoQuestion {
  questionId: string;
  type: 'bank' | 'custom';
  order: number;
}

export interface CreateMentorSimuladoPayload {
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'selected';
  selectedMentorshipIds?: string[];  // IDs das mentorias selecionadas
  selectedUserIds?: string[];        // IDs dos usuários específicos selecionados
  questions: MentorSimuladoQuestion[];
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  scheduledAt?: string;              // Data/hora de liberação
}

export interface MentorSimulado {
  id: string;
  mentor_id: string;
  name: string;
  description: string | null;
  questions: MentorSimuladoQuestion[];
  question_count: number;
  visibility: 'public' | 'private' | 'selected';
  allowed_user_ids: string[];
  selected_mentorship_ids: string[];
  status: 'draft' | 'active' | 'closed';
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  show_results: boolean;
  scheduled_at: string | null;
  is_public: boolean;
  respondents_count: number;
  average_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface MentorshipWithMentee {
  id: string;
  menteeId: string;
  title: string;
  status: string;
  mentee?: {
    id: string;
    display_name: string;
    email: string;
    photo_url: string | null;
  };
}

export interface MentorProgram {
  id: string;
  title: string;
  status: string;
  participantsCount: number;
  mentees: Array<{
    mentorshipId: string;
    userId: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
  }>;
}

export interface MentorProgramsResponse {
  programs: MentorProgram[];
  unassignedMentees: Array<{
    mentorshipId: string;
    userId: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
  }>;
  allMentees: Array<{
    mentorshipId: string;
    userId: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
    programId: string | null;
    programTitle: string | null;
  }>;
}

export interface MentorExamAssignment {
  id: string;
  mentor_exam_id: string;
  user_id: string;
  mentorship_id: string | null;
  status: 'pending' | 'available' | 'started' | 'completed' | 'expired';
  assigned_at: string;
  available_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  correct_count: number;
  incorrect_count: number;
  time_spent_seconds: number;
  answers: any[];
  is_public_subscription: boolean;
}

export interface CreateMentorQuestionPayload {
  content: string;
  alternatives: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer: string;
  explanation?: string;
  subFilterIds?: string[];
  difficulty?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class MentorSimuladoService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // ============================================================================
  // QUESTÕES AUTORAIS
  // ============================================================================

  /**
   * Cria uma questão autoral do mentor
   */
  async createMentorQuestion(
    mentorId: string,
    payload: CreateMentorQuestionPayload
  ): Promise<any> {
    // Gerar ID usando o mesmo padrão do sistema
    const questionId = generateQuestionId(payload.content);

    // Formatar alternativas no mesmo padrão das questões do banco
    // Usar UUID para IDs e 'order' ao invés de 'isCorrect'
    const formattedOptions = payload.alternatives.map((alt, index) => ({
      id: crypto.randomUUID(),
      text: alt.text,
      order: index
    }));

    // Encontrar a alternativa correta e pegar o TEXTO dela
    const correctAltIndex = payload.alternatives.findIndex(
      alt => alt.isCorrect || alt.id === payload.correctAnswer
    );
    const correctAnswerText = correctAltIndex >= 0 
      ? formattedOptions[correctAltIndex].text 
      : formattedOptions[0].text;

    const questionData = {
      id: questionId,
      content: payload.content.trim(),
      options: formattedOptions,
      correct_answer: correctAnswerText,
      explanation: payload.explanation?.trim() || null,
      professor_comment: payload.explanation?.trim() || null,
      filter_ids: [],
      sub_filter_ids: payload.subFilterIds || [],
      tags: ['mentor_created', `mentor_${mentorId}`],
      difficulty: payload.difficulty || 3,
      question_type: 'multiple_choice',
      status: 'published',
      is_public: false,
      user_id: mentorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('questions')
      .insert(questionData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar questão do mentor:', error);
      throw new Error(`Erro ao criar questão: ${error.message}`);
    }

    return data;
  }

  /**
   * Lista questões criadas pelo mentor
   */
  async getMentorQuestions(
    mentorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ questions: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from('questions')
      .select('*', { count: 'exact' })
      .eq('user_id', mentorId)
      .contains('tags', ['mentor_created'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar questões do mentor:', error);
      throw new Error(`Erro ao buscar questões: ${error.message}`);
    }

    return {
      questions: data || [],
      total: count || 0
    };
  }

  // ============================================================================
  // MENTORIAS E MENTORADOS
  // ============================================================================

  /**
   * Busca todas as mentorias ativas do mentor com dados dos mentorados
   * @deprecated Use getMentorProgramsWithMentees para a nova estrutura
   */
  async getMentorMentorships(mentorId: string): Promise<MentorshipWithMentee[]> {
    const { data: mentorships, error } = await this.supabase
      .from('mentorships')
      .select('id, "menteeId", title, status')
      .eq('"mentorId"', mentorId)
      .in('status', ['active', 'pending', 'ACTIVE', 'PENDING'])
      .order('title', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mentorias:', error);
      throw new Error(`Erro ao buscar mentorias: ${error.message}`);
    }

    if (!mentorships || mentorships.length === 0) {
      return [];
    }

    // Buscar dados dos mentorados
    const menteeIds = mentorships.map(m => m.menteeId).filter(Boolean);

    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, display_name, email, photo_url')
      .in('id', menteeIds);

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
    }

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    return mentorships.map(m => ({
      id: m.id,
      menteeId: m.menteeId,
      title: m.title || 'Mentoria',
      status: m.status,
      mentee: usersMap.get(m.menteeId) || undefined
    }));
  }

  /**
   * Busca programas do mentor com mentorados agrupados
   */
  async getMentorProgramsWithMentees(mentorId: string): Promise<MentorProgramsResponse> {
    // 1. Buscar programas do mentor
    const { data: programs, error: programsError } = await this.supabase
      .from('mentor_programs')
      .select('id, title, status, participants_count')
      .eq('mentor_id', mentorId)
      .in('status', ['active', 'pending', 'ACTIVE', 'PENDING', 'approved'])
      .order('title', { ascending: true });

    if (programsError) {
      console.error('Erro ao buscar programas:', programsError);
      throw new Error(`Erro ao buscar programas: ${programsError.message}`);
    }

    // 2. Buscar todas as mentorias do mentor
    const { data: mentorships, error: mentorshipsError } = await this.supabase
      .from('mentorships')
      .select('id, "menteeId", program_id, status')
      .eq('"mentorId"', mentorId)
      .in('status', ['active', 'pending', 'ACTIVE', 'PENDING']);

    if (mentorshipsError) {
      console.error('Erro ao buscar mentorias:', mentorshipsError);
      throw new Error(`Erro ao buscar mentorias: ${mentorshipsError.message}`);
    }

    if (!mentorships || mentorships.length === 0) {
      return { programs: [], unassignedMentees: [], allMentees: [] };
    }

    // 3. Buscar dados dos mentorados
    const menteeIds = [...new Set(mentorships.map(m => m.menteeId).filter(Boolean))];

    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, display_name, email, photo_url')
      .in('id', menteeIds);

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
    }

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    const programsMap = new Map(programs?.map(p => [p.id, p]) || []);

    // 4. Agrupar mentorados por programa
    const programMenteesMap = new Map<string, any[]>();
    const unassignedMentees: any[] = [];
    const allMentees: any[] = [];

    for (const m of mentorships) {
      const user = usersMap.get(m.menteeId);
      if (!user) continue;

      const menteeData = {
        mentorshipId: m.id,
        userId: m.menteeId,
        displayName: user.display_name || 'Sem nome',
        email: user.email || '',
        photoUrl: user.photo_url,
        programId: m.program_id,
        programTitle: m.program_id ? programsMap.get(m.program_id)?.title || null : null
      };

      allMentees.push(menteeData);

      if (m.program_id) {
        if (!programMenteesMap.has(m.program_id)) {
          programMenteesMap.set(m.program_id, []);
        }
        programMenteesMap.get(m.program_id)!.push({
          mentorshipId: m.id,
          userId: m.menteeId,
          displayName: user.display_name || 'Sem nome',
          email: user.email || '',
          photoUrl: user.photo_url
        });
      } else {
        unassignedMentees.push({
          mentorshipId: m.id,
          userId: m.menteeId,
          displayName: user.display_name || 'Sem nome',
          email: user.email || '',
          photoUrl: user.photo_url
        });
      }
    }

    // 5. Montar resposta com programas e seus mentorados
    const programsWithMentees: MentorProgram[] = (programs || [])
      .filter(p => programMenteesMap.has(p.id) && programMenteesMap.get(p.id)!.length > 0)
      .map(p => ({
        id: p.id,
        title: p.title || 'Programa sem nome',
        status: p.status,
        participantsCount: programMenteesMap.get(p.id)?.length || 0,
        mentees: programMenteesMap.get(p.id) || []
      }));

    return {
      programs: programsWithMentees,
      unassignedMentees,
      allMentees
    };
  }

  /**
   * Busca mentorados de mentorias específicas
   */
  async getMenteesByMentorshipIds(mentorshipIds: string[]): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('mentorships')
      .select('"menteeId"')
      .in('id', mentorshipIds);

    if (error) {
      console.error('Erro ao buscar mentorados:', error);
      throw new Error(`Erro ao buscar mentorados: ${error.message}`);
    }

    return data?.map(m => m.menteeId).filter(Boolean) || [];
  }

  /**
   * Busca todos os mentorados do mentor (de todas as mentorias ativas)
   */
  async getAllMentorMentees(mentorId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('mentorships')
      .select('"menteeId"')
      .eq('"mentorId"', mentorId)
      .in('status', ['active', 'pending', 'ACTIVE', 'PENDING']);

    if (error) {
      console.error('Erro ao buscar mentorados:', error);
      throw new Error(`Erro ao buscar mentorados: ${error.message}`);
    }

    return data?.map(m => m.menteeId).filter(Boolean) || [];
  }

  // ============================================================================
  // SIMULADOS
  // ============================================================================

  /**
   * Cria um simulado personalizado do mentor e distribui para os alunos
   */
  async createSimulado(
    mentorId: string,
    payload: CreateMentorSimuladoPayload
  ): Promise<MentorSimulado> {
    const simuladoId = this.generateSimuladoId();
    const isPublic = payload.visibility === 'public';
    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : null;

    // Determinar usuários que receberão o simulado
    let targetUserIds: string[] = [];
    let selectedMentorshipIds: string[] = [];

    if (isPublic) {
      // Público: todos os mentorados de todas as mentorias
      targetUserIds = await this.getAllMentorMentees(mentorId);
      const mentorships = await this.getMentorMentorships(mentorId);
      selectedMentorshipIds = mentorships.map(m => m.id);
    } else if (payload.visibility === 'selected') {
      // Selecionados: mentorias específicas + usuários específicos
      selectedMentorshipIds = payload.selectedMentorshipIds || [];

      if (selectedMentorshipIds.length > 0) {
        const mentorshipMentees = await this.getMenteesByMentorshipIds(selectedMentorshipIds);
        targetUserIds = [...new Set([...mentorshipMentees, ...(payload.selectedUserIds || [])])];
      } else {
        targetUserIds = payload.selectedUserIds || [];
      }
    }
    // Privado: nenhum usuário recebe automaticamente

    const simuladoData = {
      id: simuladoId,
      mentor_id: mentorId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      questions: payload.questions,
      question_count: payload.questions.length,
      visibility: payload.visibility,
      allowed_user_ids: targetUserIds,
      selected_mentorship_ids: selectedMentorshipIds,
      status: 'active',
      time_limit_minutes: payload.timeLimitMinutes || null,
      shuffle_questions: payload.shuffleQuestions ?? true,
      show_results: payload.showResults ?? true,
      scheduled_at: scheduledAt,
      is_public: isPublic,
      respondents_count: 0,
      average_score: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('mentor_simulated_exams')
      .insert(simuladoData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar simulado:', error);
      throw new Error(`Erro ao criar simulado: ${error.message}`);
    }

    // Criar atribuições e simulados individuais para cada usuário
    if (targetUserIds.length > 0) {
      await this.createAssignments(simuladoId, targetUserIds, selectedMentorshipIds, scheduledAt, data);

      // Atualizar respondents_count após criar os assignments
      await this.supabase
        .from('mentor_simulated_exams')
        .update({ respondents_count: targetUserIds.length })
        .eq('id', simuladoId);

      data.respondents_count = targetUserIds.length;
    }

    return data;
  }

  /**
   * Cria atribuições individuais para os usuários E simulados na página de listas
   */
  async createAssignments(
    examId: string,
    userIds: string[],
    mentorshipIds: string[],
    scheduledAt: string | null,
    mentorExamData?: MentorSimulado
  ): Promise<void> {
    // Buscar dados do simulado do mentor se não fornecido
    let examData = mentorExamData;
    if (!examData) {
      examData = await this.getSimuladoById(examId) as MentorSimulado;
    }

    if (!examData) {
      console.error('Simulado do mentor não encontrado:', examId);
      return;
    }

    // Buscar mapeamento de usuário -> mentoria
    const { data: mentorships } = await this.supabase
      .from('mentorships')
      .select('id, "menteeId"')
      .in('id', mentorshipIds.length > 0 ? mentorshipIds : ['__none__']);

    const userMentorshipMap = new Map<string, string>();
    mentorships?.forEach(m => {
      if (m.menteeId) userMentorshipMap.set(m.menteeId, m.id);
    });

    // Buscar nome do mentor
    const { data: mentorData } = await this.supabase
      .from('users')
      .select('display_name')
      .eq('id', examData.mentor_id)
      .single();

    const mentorName = mentorData?.display_name || 'Mentor';

    // Extrair IDs das questões
    const questionIds = examData.questions.map(q => q.questionId);

    // Criar simulados individuais para cada usuário na tabela simulated_exams
    for (const userId of userIds) {
      const userSimuladoId = this.generateUserSimuladoId();

      const userSimuladoData = {
        id: userSimuladoId,
        title: examData.name,
        description: examData.description || null,
        question_ids: questionIds,
        questions: questionIds, // Compatibilidade com campo legado
        total_questions: questionIds.length,
        question_count: questionIds.length,
        time_limit_minutes: examData.time_limit_minutes,
        randomize: examData.shuffle_questions,
        status: 'published',
        is_public: false,
        user_id: userId,
        created_by: examData.mentor_id,
        creator_name: mentorName,
        tags: ['mentor_assigned', `mentor_${examData.mentor_id}`],
        mentor_exam_id: examId,
        assigned_by_mentor: true,
        available_at: scheduledAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: simError } = await this.supabase
        .from('simulated_exams')
        .insert(userSimuladoData);

      if (simError) {
        console.error(`Erro ao criar simulado para usuário ${userId}:`, simError);
      }

      // Criar atribuição na tabela mentor_exam_assignments
      const assignmentData = {
        mentor_exam_id: examId,
        user_id: userId,
        mentorship_id: userMentorshipMap.get(userId) || null,
        status: scheduledAt && new Date(scheduledAt) > new Date() ? 'pending' : 'available',
        available_at: scheduledAt || new Date().toISOString(),
        is_public_subscription: false
      };

      const { error: assignError } = await this.supabase
        .from('mentor_exam_assignments')
        .insert(assignmentData);

      if (assignError) {
        console.error(`Erro ao criar atribuição para usuário ${userId}:`, assignError);
      }
    }
  }

  /**
   * Inscreve um usuário em um simulado público
   */
  async subscribeToPublicExam(examId: string, userId: string): Promise<MentorExamAssignment> {
    // Verificar se o simulado é público
    const exam = await this.getSimuladoById(examId);
    if (!exam || !exam.is_public) {
      throw new Error('Simulado não encontrado ou não é público');
    }

    // Verificar se já está inscrito
    const { data: existing } = await this.supabase
      .from('mentor_exam_assignments')
      .select('id')
      .eq('mentor_exam_id', examId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('Você já está inscrito neste simulado');
    }

    // Buscar nome do mentor
    const { data: mentorData } = await this.supabase
      .from('users')
      .select('display_name')
      .eq('id', exam.mentor_id)
      .single();

    const mentorName = mentorData?.display_name || 'Mentor';
    const scheduledAt = exam.scheduled_at;

    // Criar simulado na página de listas do usuário
    const userSimuladoId = this.generateUserSimuladoId();
    const questionIds = exam.questions.map((q: any) => q.questionId);

    const userSimuladoData = {
      id: userSimuladoId,
      title: exam.name,
      description: exam.description || null,
      question_ids: questionIds,
      questions: questionIds,
      total_questions: questionIds.length,
      question_count: questionIds.length,
      time_limit_minutes: exam.time_limit_minutes,
      randomize: exam.shuffle_questions,
      status: 'published',
      is_public: false,
      user_id: userId,
      created_by: exam.mentor_id,
      creator_name: mentorName,
      tags: ['mentor_assigned', 'public_subscription', `mentor_${exam.mentor_id}`],
      mentor_exam_id: examId,
      assigned_by_mentor: true,
      available_at: scheduledAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: simError } = await this.supabase
      .from('simulated_exams')
      .insert(userSimuladoData);

    if (simError) {
      console.error('Erro ao criar simulado para usuário:', simError);
    }

    // Criar atribuição
    const assignment = {
      mentor_exam_id: examId,
      user_id: userId,
      mentorship_id: null,
      status: scheduledAt && new Date(scheduledAt) > new Date() ? 'pending' : 'available',
      available_at: scheduledAt || new Date().toISOString(),
      is_public_subscription: true
    };

    const { data, error } = await this.supabase
      .from('mentor_exam_assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) {
      console.error('Erro ao inscrever:', error);
      throw new Error(`Erro ao inscrever: ${error.message}`);
    }

    // Atualizar contador
    await this.supabase
      .from('mentor_simulated_exams')
      .update({
        respondents_count: (exam.respondents_count || 0) + 1,
        allowed_user_ids: [...(exam.allowed_user_ids || []), userId]
      })
      .eq('id', examId);

    return data;
  }

  /**
   * Busca atribuições de um usuário
   */
  async getUserAssignments(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('mentor_exam_assignments')
      .select(`
        *,
        mentor_exam:mentor_simulated_exams(
          id, name, description, question_count, time_limit_minutes, 
          shuffle_questions, show_results, scheduled_at, mentor_id
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar atribuições:', error);
      throw new Error(`Erro ao buscar atribuições: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Lista simulados do mentor
   */
  async getSimulados(
    mentorId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ simulados: MentorSimulado[]; total: number }> {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('mentor_simulated_exams')
      .select('*', { count: 'exact' })
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar simulados:', error);
      throw new Error(`Erro ao buscar simulados: ${error.message}`);
    }

    return {
      simulados: data || [],
      total: count || 0
    };
  }

  /**
   * Obtém um simulado pelo ID
   */
  async getSimuladoById(id: string): Promise<MentorSimulado | null> {
    const { data, error } = await this.supabase
      .from('mentor_simulated_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Erro ao buscar simulado:', error);
      throw new Error(`Erro ao buscar simulado: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza um simulado
   */
  async updateSimulado(
    id: string,
    mentorId: string,
    updates: Partial<CreateMentorSimuladoPayload>
  ): Promise<MentorSimulado | null> {
    // Verificar se o simulado pertence ao mentor
    const existing = await this.getSimuladoById(id);
    if (!existing || existing.mentor_id !== mentorId) {
      return null;
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name) updateData.name = updates.name.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.visibility) updateData.visibility = updates.visibility;
    if (updates.selectedMentorshipIds) updateData.selected_mentorship_ids = updates.selectedMentorshipIds;
    if (updates.selectedUserIds) updateData.allowed_user_ids = updates.selectedUserIds;
    if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt;
    if (updates.questions) {
      updateData.questions = updates.questions;
      updateData.question_count = updates.questions.length;
    }
    if (updates.timeLimitMinutes !== undefined) updateData.time_limit_minutes = updates.timeLimitMinutes;
    if (updates.shuffleQuestions !== undefined) updateData.shuffle_questions = updates.shuffleQuestions;
    if (updates.showResults !== undefined) updateData.show_results = updates.showResults;

    const { data, error } = await this.supabase
      .from('mentor_simulated_exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar simulado:', error);
      throw new Error(`Erro ao atualizar simulado: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta um simulado
   */
  async deleteSimulado(id: string, mentorId: string): Promise<boolean> {
    const existing = await this.getSimuladoById(id);
    if (!existing || existing.mentor_id !== mentorId) {
      return false;
    }

    const { error } = await this.supabase
      .from('mentor_simulated_exams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar simulado:', error);
      throw new Error(`Erro ao deletar simulado: ${error.message}`);
    }

    return true;
  }

  /**
   * Altera o status do simulado
   */
  async changeStatus(
    id: string,
    mentorId: string,
    status: 'draft' | 'active' | 'closed'
  ): Promise<MentorSimulado | null> {
    const existing = await this.getSimuladoById(id);
    if (!existing || existing.mentor_id !== mentorId) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('mentor_simulated_exams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alterar status:', error);
      throw new Error(`Erro ao alterar status: ${error.message}`);
    }

    return data;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private generateSimuladoId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `mentor-sim-${Date.now()}-${suffix}`;
  }

  private generateUserSimuladoId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 12; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `sim-${Date.now()}-${suffix}`;
  }

  // ============================================================================
  // ANALYTICS E PROGRESSO
  // ============================================================================

  /**
   * Busca atribuições de um simulado com dados dos usuários
   */
  async getSimuladoAssignments(examId: string, mentorId: string): Promise<any[]> {
    // Verificar se o simulado pertence ao mentor
    const exam = await this.getSimuladoById(examId);
    if (!exam || exam.mentor_id !== mentorId) {
      throw new Error('Simulado não encontrado ou sem permissão');
    }

    const { data: assignments, error } = await this.supabase
      .from('mentor_exam_assignments')
      .select('*')
      .eq('mentor_exam_id', examId)
      .order('score', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar atribuições:', error);
      throw new Error(`Erro ao buscar atribuições: ${error.message}`);
    }

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Buscar dados dos usuários
    const userIds = assignments.map(a => a.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, email, photo_url')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Buscar dados das mentorias
    const mentorshipIds = assignments.map(a => a.mentorship_id).filter(Boolean);
    const { data: mentorships } = await this.supabase
      .from('mentorships')
      .select('id, title, program_id')
      .in('id', mentorshipIds.length > 0 ? mentorshipIds : ['__none__']);

    // Buscar programas
    const programIds = mentorships?.map(m => m.program_id).filter(Boolean) || [];
    const { data: programs } = await this.supabase
      .from('mentor_programs')
      .select('id, title')
      .in('id', programIds.length > 0 ? programIds : ['__none__']);

    const programsMap = new Map(programs?.map(p => [p.id, p]) || []);
    const mentorshipsMap = new Map(mentorships?.map(m => [m.id, {
      ...m,
      program_title: m.program_id ? programsMap.get(m.program_id)?.title : null
    }]) || []);

    return assignments.map(a => ({
      ...a,
      user: usersMap.get(a.user_id),
      mentorship: a.mentorship_id ? mentorshipsMap.get(a.mentorship_id) : null
    }));
  }

  /**
   * Sincroniza atribuições após edição do simulado
   */
  async syncSimuladoAssignments(
    examId: string,
    mentorId: string,
    newUserIds?: string[],
    newMentorshipIds?: string[]
  ): Promise<void> {
    // Verificar se o simulado pertence ao mentor e pode ser editado
    const exam = await this.getSimuladoById(examId);
    if (!exam || exam.mentor_id !== mentorId) {
      throw new Error('Simulado não encontrado ou sem permissão');
    }

    // Verificar se pode editar (antes do horário de início)
    if (exam.scheduled_at && new Date(exam.scheduled_at) <= new Date()) {
      throw new Error('Não é possível editar após o horário de início');
    }

    // Buscar atribuições existentes
    const { data: existingAssignments } = await this.supabase
      .from('mentor_exam_assignments')
      .select('id, user_id')
      .eq('mentor_exam_id', examId);

    const existingUserIds = new Set(existingAssignments?.map(a => a.user_id) || []);
    const targetUserIds = new Set(newUserIds || exam.allowed_user_ids || []);

    // Usuários a adicionar
    const usersToAdd = [...targetUserIds].filter(id => !existingUserIds.has(id));

    // Usuários a remover
    const usersToRemove = [...existingUserIds].filter(id => !targetUserIds.has(id));

    // Remover atribuições e simulados dos usuários removidos
    if (usersToRemove.length > 0) {
      // Remover atribuições
      await this.supabase
        .from('mentor_exam_assignments')
        .delete()
        .eq('mentor_exam_id', examId)
        .in('user_id', usersToRemove);

      // Remover simulados individuais
      await this.supabase
        .from('simulated_exams')
        .delete()
        .eq('mentor_exam_id', examId)
        .in('user_id', usersToRemove);
    }

    // Adicionar novos usuários
    if (usersToAdd.length > 0) {
      await this.createAssignments(
        examId,
        usersToAdd,
        newMentorshipIds || exam.selected_mentorship_ids || [],
        exam.scheduled_at,
        exam
      );
    }

    // Atualizar simulados existentes com as novas questões
    const questionIds = exam.questions.map((q: any) => q.questionId);

    await this.supabase
      .from('simulated_exams')
      .update({
        title: exam.name,
        description: exam.description,
        question_ids: questionIds,
        questions: questionIds,
        total_questions: questionIds.length,
        question_count: questionIds.length,
        time_limit_minutes: exam.time_limit_minutes,
        randomize: exam.shuffle_questions,
        available_at: exam.scheduled_at,
        updated_at: new Date().toISOString()
      })
      .eq('mentor_exam_id', examId);

    // Contar total de assignments após sincronização
    const { count: totalAssignments } = await this.supabase
      .from('mentor_exam_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_exam_id', examId);

    // Atualizar o simulado do mentor com o novo respondents_count
    await this.supabase
      .from('mentor_simulated_exams')
      .update({
        allowed_user_ids: [...targetUserIds],
        selected_mentorship_ids: newMentorshipIds || exam.selected_mentorship_ids,
        respondents_count: totalAssignments || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', examId);
  }

  /**
   * Obtém analytics detalhados do simulado
   */
  async getSimuladoAnalytics(examId: string, mentorId: string): Promise<any> {
    // Verificar se o simulado pertence ao mentor
    const exam = await this.getSimuladoById(examId);
    if (!exam || exam.mentor_id !== mentorId) {
      throw new Error('Simulado não encontrado ou sem permissão');
    }

    // Buscar atribuições completadas
    const { data: assignments } = await this.supabase
      .from('mentor_exam_assignments')
      .select('*')
      .eq('mentor_exam_id', examId)
      .eq('status', 'completed');

    if (!assignments || assignments.length === 0) {
      return {
        summary: {
          completedCount: 0,
          averageScore: 0,
          averageTimeSeconds: 0,
          highestScore: 0,
          lowestScore: 0
        },
        ranking: [],
        questionStats: [],
        specialtyStats: []
      };
    }

    // Buscar dados dos usuários
    const userIds = assignments.map(a => a.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, email, photo_url')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Buscar mentorias para identificar mentorados
    const { data: mentorships } = await this.supabase
      .from('mentorships')
      .select('id, "menteeId", program_id')
      .eq('"mentorId"', mentorId);

    const menteeIds = new Set(mentorships?.map(m => m.menteeId) || []);

    // Buscar programas
    const programIds = [...new Set(mentorships?.map(m => m.program_id).filter(Boolean) || [])];
    const { data: programs } = await this.supabase
      .from('mentor_programs')
      .select('id, title')
      .in('id', programIds.length > 0 ? programIds : ['__none__']);

    const programsMap = new Map(programs?.map(p => [p.id, p.title]) || []);
    const menteeProgramMap = new Map<string, string>();
    mentorships?.forEach(m => {
      if (m.menteeId && m.program_id) {
        menteeProgramMap.set(m.menteeId, programsMap.get(m.program_id) || '');
      }
    });

    // Calcular resumo - recalcular score como porcentagem baseado em correct_count/total
    const scores = assignments.map(a => {
      const total = (a.correct_count || 0) + (a.incorrect_count || 0);
      return total > 0 ? ((a.correct_count || 0) / total) * 100 : 0;
    });
    const times = assignments.map(a => a.time_spent_seconds || 0);

    const summary = {
      completedCount: assignments.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      averageTimeSeconds: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0
    };

    // Ranking - recalcular score como porcentagem
    const ranking = assignments
      .map(a => {
        const total = (a.correct_count || 0) + (a.incorrect_count || 0);
        const scorePercent = total > 0 ? ((a.correct_count || 0) / total) * 100 : 0;
        const user = usersMap.get(a.user_id);
        return {
          userId: a.user_id,
          userName: user?.display_name || 'Usuário',
          userEmail: user?.email || '',
          userPhoto: user?.photo_url || null,
          score: scorePercent,
          correctCount: a.correct_count || 0,
          incorrectCount: a.incorrect_count || 0,
          timeSpentSeconds: a.time_spent_seconds || 0,
          completedAt: a.completed_at,
          isMentee: menteeIds.has(a.user_id),
          programTitle: menteeProgramMap.get(a.user_id) || null
        };
      })
      .sort((a, b) => b.score - a.score);

    // Estatísticas por questão
    const questionStats = await this.calculateQuestionStats(examId, exam.questions);

    // Estatísticas por especialidade
    const specialtyStats = await this.calculateSpecialtyStats(examId, exam.questions);

    // Estatísticas por subespecialidade
    const subspecialtyStats = await this.calculateSubspecialtyStats(examId, exam.questions);

    return {
      summary,
      ranking,
      questionStats,
      specialtyStats,
      subspecialtyStats
    };
  }

  /**
   * Calcula estatísticas por questão
   */
  private async calculateQuestionStats(examId: string, questions: any[]): Promise<any[]> {
    const questionIds = questions.map(q => q.questionId);

    // Buscar questões do banco (incluindo filtros)
    const { data: questionsData } = await this.supabase
      .from('questions')
      .select('id, content, options, correct_answer, filter_ids, sub_filter_ids')
      .in('id', questionIds);

    const questionsMap = new Map(questionsData?.map(q => [q.id, q]) || []);

    // Buscar IDs dos simulados individuais que pertencem a este mentor_exam
    const { data: userSimulados } = await this.supabase
      .from('simulated_exams')
      .select('id')
      .eq('mentor_exam_id', examId);

    const userSimuladoIds = userSimulados?.map(s => s.id) || [];

    // Buscar respostas de todos os simulados individuais
    const { data: responses } = await this.supabase
      .from('question_responses')
      .select('question_id, selected_alternative_id, is_correct_on_first_attempt')
      .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

    // Agrupar respostas por questão
    const responsesByQuestion = new Map<string, any[]>();
    responses?.forEach(r => {
      if (!responsesByQuestion.has(r.question_id)) {
        responsesByQuestion.set(r.question_id, []);
      }
      responsesByQuestion.get(r.question_id)!.push(r);
    });

    return questions.map((q, index) => {
      const questionData = questionsMap.get(q.questionId);
      const questionResponses = responsesByQuestion.get(q.questionId) || [];

      const totalResponses = questionResponses.length;
      const correctCount = questionResponses.filter(r => r.is_correct_on_first_attempt).length;
      const incorrectCount = totalResponses - correctCount;

      // Contar respostas por alternativa
      const alternativeCounts = new Map<string, number>();
      questionResponses.forEach(r => {
        const altId = r.selected_alternative_id || 'unknown';
        alternativeCounts.set(altId, (alternativeCounts.get(altId) || 0) + 1);
      });

      // Ordenar alternativas pelo order e converter para letras (A, B, C, D, E)
      const sortedOptions = [...(questionData?.options || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      const alternativeStats = sortedOptions.map((opt: any, idx: number) => {
        // Verificar se é a alternativa correta (múltiplos campos possíveis)
        // correct_answer pode ser o ID ou o TEXTO da alternativa
        const isCorrectAlt =
          opt.isCorrect === true ||
          opt.is_correct === true ||
          opt.id === questionData?.correct_answer ||
          opt.text === questionData?.correct_answer;

        return {
          id: letters[idx] || `${idx + 1}`, // Usar letra baseada na posição ordenada
          text: opt.text,
          count: alternativeCounts.get(opt.id) || 0,
          percentage: totalResponses > 0 ? ((alternativeCounts.get(opt.id) || 0) / totalResponses) * 100 : 0,
          isCorrect: isCorrectAlt
        };
      });

      return {
        questionId: q.questionId,
        questionNumber: index + 1,
        questionContent: questionData?.content || 'Questão não encontrada',
        correctAnswer: questionData?.correct_answer,
        totalResponses,
        correctCount,
        incorrectCount,
        accuracy: totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0,
        alternativeStats,
        filterIds: questionData?.filter_ids || [],
        subFilterIds: questionData?.sub_filter_ids || []
      };
    });
  }

  /**
   * Obtém performance detalhada de um usuário no simulado
   */
  async getUserPerformanceInSimulado(examId: string, userId: string, mentorId: string): Promise<any> {
    // Verificar se o simulado pertence ao mentor
    const exam = await this.getSimuladoById(examId);
    if (!exam || exam.mentor_id !== mentorId) {
      throw new Error('Simulado não encontrado ou sem permissão');
    }

    // Buscar atribuição do usuário
    const { data: assignment } = await this.supabase
      .from('mentor_exam_assignments')
      .select('*')
      .eq('mentor_exam_id', examId)
      .eq('user_id', userId)
      .single();

    if (!assignment) {
      throw new Error('Usuário não encontrado neste simulado');
    }

    // Buscar dados do usuário
    const { data: userData } = await this.supabase
      .from('users')
      .select('id, display_name, email, photo_url')
      .eq('id', userId)
      .single();

    // Buscar o simulado individual do usuário
    const { data: userSimulado } = await this.supabase
      .from('simulated_exams')
      .select('id')
      .eq('mentor_exam_id', examId)
      .eq('user_id', userId)
      .single();

    const userSimuladoId = userSimulado?.id;

    // Buscar respostas do usuário usando o ID do simulado individual
    const { data: responses } = await this.supabase
      .from('question_responses')
      .select('*')
      .eq('simulated_exam_id', userSimuladoId || '__none__')
      .eq('user_id', userId)
      .order('answered_at', { ascending: true });

    // Buscar questões
    const questionIds = exam.questions.map((q: any) => q.questionId);
    const { data: questionsData } = await this.supabase
      .from('questions')
      .select('id, content, options, correct_answer, filter_ids, sub_filter_ids')
      .in('id', questionIds);

    const questionsMap = new Map(questionsData?.map(q => [q.id, q]) || []);

    // Buscar filtros
    const allFilterIds = new Set<string>();
    questionsData?.forEach(q => {
      (q.filter_ids || []).forEach((id: string) => allFilterIds.add(id));
    });

    const { data: filters } = await this.supabase
      .from('filters')
      .select('id, name, category')
      .in('id', [...allFilterIds].length > 0 ? [...allFilterIds] : ['__none__'])
      .eq('category', 'MEDICAL_SPECIALTY');

    const filtersMap = new Map(filters?.map(f => [f.id, f.name]) || []);

    // Mapear respostas
    const responsesMap = new Map(responses?.map(r => [r.question_id, r]) || []);

    // Letras para alternativas
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Construir lista de respostas detalhadas
    const answers = exam.questions.map((q: any, index: number) => {
      const question = questionsMap.get(q.questionId);
      const response = responsesMap.get(q.questionId);

      // Ordenar opções por order para garantir a ordem correta das letras
      const sortedOptions = [...(question?.options || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      // Encontrar índice da alternativa selecionada
      const selectedIndex = sortedOptions.findIndex((opt: any) => opt.id === response?.selected_alternative_id);

      // Encontrar índice da alternativa correta (verificar múltiplos campos possíveis)
      const correctIndex = sortedOptions.findIndex((opt: any) => {
        // Verificar campo isCorrect (boolean)
        if (opt.isCorrect === true) return true;
        // Verificar campo is_correct (snake_case)
        if (opt.is_correct === true) return true;
        // Verificar se o ID da opção é igual ao correct_answer da questão
        if (question?.correct_answer && opt.id === question.correct_answer) return true;
        // Verificar se o TEXTO da opção é igual ao correct_answer (para questões onde correct_answer é o texto)
        if (question?.correct_answer && opt.text === question.correct_answer) return true;
        return false;
      });

      const selectedAlt = selectedIndex >= 0 ? sortedOptions[selectedIndex] : null;
      const correctAlt = correctIndex >= 0 ? sortedOptions[correctIndex] : null;

      // Pegar todas as especialidades médicas da questão (filtrar apenas MEDICAL_SPECIALTY)
      const questionFilterIds = (question?.filter_ids || []).filter((id: string) => filtersMap.has(id));
      const filterNames = questionFilterIds.map((id: string) => filtersMap.get(id)).filter(Boolean);
      const filterName = filterNames[0] || null; // Manter compatibilidade

      // Construir lista de alternativas com letras
      const alternatives = sortedOptions.map((opt: any, idx: number) => ({
        letter: letters[idx],
        text: opt.text,
        isCorrect: idx === correctIndex,
        isSelected: idx === selectedIndex
      }));

      return {
        questionId: q.questionId,
        questionNumber: index + 1,
        questionContent: question?.content || 'Questão não encontrada',
        selectedAlternativeId: selectedIndex >= 0 ? letters[selectedIndex] : '-',
        selectedAlternativeText: selectedAlt?.text || 'Não respondida',
        correctAlternativeId: correctIndex >= 0 ? letters[correctIndex] : '-',
        correctAlternativeText: correctAlt?.text || '-',
        isCorrect: response?.is_correct_on_first_attempt || false,
        timeSpentSeconds: response?.response_time_seconds || 0,
        filterName,
        filterIds: questionFilterIds, // Todos os filter_ids da questão
        subFilterIds: question?.sub_filter_ids || [],
        alternatives
      };
    });

    // Calcular performance por especialidade (considerando TODAS as especialidades de cada questão)
    const specialtyPerformance = new Map<string, { total: number; correct: number }>();

    answers.forEach((answer: any) => {
      // Iterar por todos os filterIds da questão
      const filterIds = answer.filterIds || [];
      filterIds.forEach((filterId: string) => {
        const filterName = filtersMap.get(filterId);
        if (filterName) {
          if (!specialtyPerformance.has(filterName)) {
            specialtyPerformance.set(filterName, { total: 0, correct: 0 });
          }
          const stats = specialtyPerformance.get(filterName)!;
          stats.total++;
          if (answer.isCorrect) stats.correct++;
        }
      });
    });

    const specialtyStats = [...specialtyPerformance.entries()].map(([filterName, stats]) => ({
      filterName,
      totalQuestions: stats.total,
      correctCount: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    }));

    // Calcular performance por subespecialidade
    // Coletar todos os sub_filter_ids das questões (excluindo Ano e Universidade)
    const allSubFilterIds = new Set<string>();
    questionsData?.forEach(q => {
      (q.sub_filter_ids || []).forEach((id: string) => {
        if (!id.startsWith('Ano ') && !id.startsWith('Universidade_')) {
          allSubFilterIds.add(id);
        }
      });
    });

    // Buscar nomes dos subfiltros
    const { data: subFilters } = await this.supabase
      .from('sub_filters')
      .select('id, name, filter_id, level')
      .in('id', [...allSubFilterIds].length > 0 ? [...allSubFilterIds] : ['__none__']);

    const subFiltersMap = new Map(subFilters?.map(sf => [sf.id, sf]) || []);

    // Calcular performance por subespecialidade
    const subspecialtyPerformance = new Map<string, { total: number; correct: number; filterId: string; level: string }>();

    answers.forEach((answer: any) => {
      const question = questionsMap.get(answer.questionId);
      const subFilterIds = (question?.sub_filter_ids || []).filter((id: string) =>
        !id.startsWith('Ano ') && !id.startsWith('Universidade_')
      );

      subFilterIds.forEach((subFilterId: string) => {
        const subFilter = subFiltersMap.get(subFilterId);
        if (subFilter) {
          if (!subspecialtyPerformance.has(subFilterId)) {
            subspecialtyPerformance.set(subFilterId, {
              total: 0,
              correct: 0,
              filterId: subFilter.filter_id,
              level: subFilter.level
            });
          }
          const stats = subspecialtyPerformance.get(subFilterId)!;
          stats.total++;
          if (answer.isCorrect) stats.correct++;
        }
      });
    });

    const subspecialtyStats = [...subspecialtyPerformance.entries()].map(([subFilterId, stats]) => {
      const subFilter = subFiltersMap.get(subFilterId);
      return {
        subFilterId,
        subFilterName: subFilter?.name || subFilterId,
        filterId: stats.filterId,
        level: stats.level,
        totalQuestions: stats.total,
        correctCount: stats.correct,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    }).sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR'));

    // Recalcular score como porcentagem baseado em correct_count/total
    const totalQuestions = (assignment.correct_count || 0) + (assignment.incorrect_count || 0);
    const scorePercent = totalQuestions > 0
      ? ((assignment.correct_count || 0) / totalQuestions) * 100
      : 0;

    return {
      user: {
        id: userData?.id || userId,
        displayName: userData?.display_name || 'Usuário',
        email: userData?.email || '',
        photoUrl: userData?.photo_url || null
      },
      assignment: {
        score: scorePercent,
        correctCount: assignment.correct_count || 0,
        incorrectCount: assignment.incorrect_count || 0,
        timeSpentSeconds: assignment.time_spent_seconds || 0,
        startedAt: assignment.started_at,
        completedAt: assignment.completed_at
      },
      answers,
      specialtyPerformance: specialtyStats,
      subspecialtyPerformance: subspecialtyStats
    };
  }

  /**
   * Calcula estatísticas por especialidade
   */
  private async calculateSpecialtyStats(examId: string, questions: any[]): Promise<any[]> {
    const questionIds = questions.map(q => q.questionId);

    // Buscar questões com filtros
    const { data: questionsData } = await this.supabase
      .from('questions')
      .select('id, filter_ids, sub_filter_ids')
      .in('id', questionIds);

    // Coletar todos os filter_ids
    const allFilterIds = new Set<string>();
    questionsData?.forEach(q => {
      (q.filter_ids || []).forEach((id: string) => allFilterIds.add(id));
    });

    if (allFilterIds.size === 0) {
      return [];
    }

    // Buscar nomes dos filtros - APENAS especialidades médicas (category = 'MEDICAL_SPECIALTY')
    const { data: filters } = await this.supabase
      .from('filters')
      .select('id, name, category')
      .in('id', [...allFilterIds])
      .eq('category', 'MEDICAL_SPECIALTY');

    const filtersMap = new Map(filters?.map(f => [f.id, f.name]) || []);

    // Criar set de IDs de especialidades médicas para filtrar
    const medicalSpecialtyIds = new Set(filters?.map(f => f.id) || []);

    // Buscar IDs dos simulados individuais que pertencem a este mentor_exam
    const { data: userSimulados } = await this.supabase
      .from('simulated_exams')
      .select('id')
      .eq('mentor_exam_id', examId);

    const userSimuladoIds = userSimulados?.map(s => s.id) || [];

    // Buscar respostas de todos os simulados individuais
    const { data: responses } = await this.supabase
      .from('question_responses')
      .select('question_id, is_correct_on_first_attempt, response_time_seconds')
      .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

    // Mapear questões para filtros
    const questionFiltersMap = new Map<string, string[]>();
    questionsData?.forEach(q => {
      questionFiltersMap.set(q.id, q.filter_ids || []);
    });

    // Agrupar estatísticas por filtro
    const filterStats = new Map<string, {
      totalQuestions: number;
      totalResponses: number;
      correctCount: number;
      incorrectCount: number;
      totalTime: number;
    }>();

    responses?.forEach(r => {
      const filterIds = questionFiltersMap.get(r.question_id) || [];
      filterIds.forEach(filterId => {
        // Ignorar filtros que não são especialidades médicas
        if (!medicalSpecialtyIds.has(filterId)) return;

        if (!filterStats.has(filterId)) {
          filterStats.set(filterId, {
            totalQuestions: 0,
            totalResponses: 0,
            correctCount: 0,
            incorrectCount: 0,
            totalTime: 0
          });
        }
        const stats = filterStats.get(filterId)!;
        stats.totalResponses++;
        if (r.is_correct_on_first_attempt) {
          stats.correctCount++;
        } else {
          stats.incorrectCount++;
        }
        stats.totalTime += r.response_time_seconds || 0;
      });
    });

    // Contar questões por filtro (apenas especialidades médicas)
    questionsData?.forEach(q => {
      (q.filter_ids || []).forEach((filterId: string) => {
        // Ignorar filtros que não são especialidades médicas
        if (!medicalSpecialtyIds.has(filterId)) return;

        if (filterStats.has(filterId)) {
          filterStats.get(filterId)!.totalQuestions++;
        }
      });
    });

    // Retornar apenas filtros que são especialidades médicas (existem no filtersMap)
    return [...filterStats.entries()]
      .filter(([filterId]) => filtersMap.has(filterId))
      .map(([filterId, stats]) => ({
        filterId,
        filterName: filtersMap.get(filterId)!,
        totalQuestions: stats.totalQuestions,
        totalResponses: stats.totalResponses,
        correctCount: stats.correctCount,
        incorrectCount: stats.incorrectCount,
        accuracy: stats.totalResponses > 0 ? (stats.correctCount / stats.totalResponses) * 100 : 0,
        averageTimeSeconds: stats.totalResponses > 0 ? stats.totalTime / stats.totalResponses : 0
      }));
  }

  /**
   * Calcula estatísticas por subespecialidade (nível 1 e 2)
   */
  private async calculateSubspecialtyStats(examId: string, questions: any[]): Promise<any[]> {
    const questionIds = questions.map(q => q.questionId);

    // Buscar questões com sub_filter_ids
    const { data: questionsData } = await this.supabase
      .from('questions')
      .select('id, sub_filter_ids')
      .in('id', questionIds);

    // Coletar todos os sub_filter_ids (excluindo Ano e Universidade)
    const allSubFilterIds = new Set<string>();
    questionsData?.forEach(q => {
      (q.sub_filter_ids || []).forEach((id: string) => {
        // Ignorar filtros de Ano e Universidade
        if (!id.startsWith('Ano ') && !id.startsWith('Universidade_')) {
          allSubFilterIds.add(id);
        }
      });
    });

    if (allSubFilterIds.size === 0) {
      return [];
    }

    // Buscar nomes dos subfiltros
    const { data: subFilters } = await this.supabase
      .from('sub_filters')
      .select('id, name, filter_id, level')
      .in('id', [...allSubFilterIds]);

    const subFiltersMap = new Map(subFilters?.map(sf => [sf.id, sf]) || []);

    // Buscar IDs dos simulados individuais que pertencem a este mentor_exam
    const { data: userSimulados } = await this.supabase
      .from('simulated_exams')
      .select('id')
      .eq('mentor_exam_id', examId);

    const userSimuladoIds = userSimulados?.map(s => s.id) || [];

    // Buscar respostas de todos os simulados individuais
    const { data: responses } = await this.supabase
      .from('question_responses')
      .select('question_id, is_correct_on_first_attempt, response_time_seconds')
      .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

    // Mapear questões para sub_filter_ids
    const questionSubFiltersMap = new Map<string, string[]>();
    questionsData?.forEach(q => {
      const validSubFilters = (q.sub_filter_ids || []).filter((id: string) =>
        !id.startsWith('Ano ') && !id.startsWith('Universidade_')
      );
      questionSubFiltersMap.set(q.id, validSubFilters);
    });

    // Agrupar estatísticas por subfiltro
    const subFilterStats = new Map<string, {
      totalQuestions: number;
      totalResponses: number;
      correctCount: number;
      incorrectCount: number;
      totalTime: number;
    }>();

    responses?.forEach(r => {
      const subFilterIds = questionSubFiltersMap.get(r.question_id) || [];
      subFilterIds.forEach(subFilterId => {
        if (!subFiltersMap.has(subFilterId)) return;

        if (!subFilterStats.has(subFilterId)) {
          subFilterStats.set(subFilterId, {
            totalQuestions: 0,
            totalResponses: 0,
            correctCount: 0,
            incorrectCount: 0,
            totalTime: 0
          });
        }
        const stats = subFilterStats.get(subFilterId)!;
        stats.totalResponses++;
        if (r.is_correct_on_first_attempt) {
          stats.correctCount++;
        } else {
          stats.incorrectCount++;
        }
        stats.totalTime += r.response_time_seconds || 0;
      });
    });

    // Contar questões por subfiltro
    questionsData?.forEach(q => {
      const validSubFilters = (q.sub_filter_ids || []).filter((id: string) =>
        !id.startsWith('Ano ') && !id.startsWith('Universidade_')
      );
      validSubFilters.forEach((subFilterId: string) => {
        if (!subFiltersMap.has(subFilterId)) return;

        if (!subFilterStats.has(subFilterId)) {
          subFilterStats.set(subFilterId, {
            totalQuestions: 0,
            totalResponses: 0,
            correctCount: 0,
            incorrectCount: 0,
            totalTime: 0
          });
        }
        subFilterStats.get(subFilterId)!.totalQuestions++;
      });
    });

    // Retornar estatísticas formatadas
    return [...subFilterStats.entries()]
      .filter(([subFilterId]) => subFiltersMap.has(subFilterId))
      .map(([subFilterId, stats]) => {
        const subFilter = subFiltersMap.get(subFilterId)!;
        return {
          subFilterId,
          subFilterName: subFilter.name,
          filterId: subFilter.filter_id,
          level: subFilter.level,
          totalQuestions: stats.totalQuestions,
          totalResponses: stats.totalResponses,
          correctCount: stats.correctCount,
          incorrectCount: stats.incorrectCount,
          accuracy: stats.totalResponses > 0 ? (stats.correctCount / stats.totalResponses) * 100 : 0,
          averageTimeSeconds: stats.totalResponses > 0 ? stats.totalTime / stats.totalResponses : 0
        };
      })
      .sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR'));
  }
}
