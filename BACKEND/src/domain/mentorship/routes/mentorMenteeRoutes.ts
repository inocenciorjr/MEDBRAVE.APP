import { Router } from 'express';
import { supabaseAdmin } from '../../../supabase.config';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { authenticate, isMentor } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação e acesso à mentoria
router.use(enhancedAuthMiddleware as any);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * GET /api/mentorship/mentor/users
 * Buscar todos os usuários disponíveis para adicionar como mentorados
 * Query params: search (opcional)
 */
router.get('/users', authenticate, isMentor, async (req: any, res) => {
  try {
    const { search, programId, page = '1', limit = '50' } = req.query;
    const mentorId = req.user?.id;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Buscar todos os usuários (exceto admins e mentores)
    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, display_name, email, photo_url, role, created_at', { count: 'exact' })
      .not('role', 'in', '("ADMIN","SUPERADMIN","MENTOR","admin","superadmin","mentor")')
      .order('display_name', { ascending: true });

    // Aplicar filtro de busca se fornecido
    if (search && typeof search === 'string' && search.length >= 2) {
      usersQuery = usersQuery.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Aplicar paginação
    usersQuery = usersQuery.range(offset, offset + limitNum - 1);

    const { data: users, error: usersError, count } = await usersQuery;

    if (usersError) throw usersError;

    // Buscar mentorias ativas deste mentor
    // Se programId for fornecido, filtrar apenas mentorias deste programa específico
    let mentorshipsQuery = (supabaseAdmin as any)
      .from('mentorships')
      .select('id, menteeId, status, startDate, endDate, program_id')
      .eq('mentorId', mentorId)
      .in('status', ['ACTIVE', 'PENDING']);
    
    // Filtrar por programa se fornecido
    if (programId) {
      mentorshipsQuery = mentorshipsQuery.eq('program_id', programId);
    }

    const { data: mentorships, error: mentorshipsError } = await mentorshipsQuery;

    if (mentorshipsError) throw mentorshipsError;

    // Criar mapa de mentorias por menteeId
    const mentorshipMap = new Map<string, any>();
    (mentorships || []).forEach((m: any) => {
      if (m.menteeId) {
        mentorshipMap.set(m.menteeId, m);
      }
    });

    // Combinar dados de usuários com status de mentoria
    const usersWithMentorshipStatus = (users || []).map((user: any) => {
      const mentorship = mentorshipMap.get(user.id);
      return {
        ...user,
        isMentee: !!mentorship,
        mentorshipStatus: mentorship?.status || null,
        mentorshipId: mentorship?.id || null,
        mentorshipEndDate: mentorship?.endDate || null,
      };
    });

    res.json({
      success: true,
      data: usersWithMentorshipStatus,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      hasMore: (count || 0) > offset + limitNum,
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/mentor/mentees
 * Buscar mentorados do mentor autenticado
 * Query params: programId (opcional) - filtrar por programa
 * Retorna apenas mentorados únicos de programas ativos
 */
router.get('/mentees', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { programId } = req.query;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Primeiro, buscar IDs dos programas ativos do mentor
    const { data: activePrograms } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .select('id')
      .eq('mentor_id', mentorId)
      .neq('status', 'closed'); // Excluir programas fechados

    const activeProgramIds = (activePrograms || []).map((p: any) => p.id);

    // Buscar mentorias do mentor apenas de programas ativos
    let query = (supabaseAdmin as any)
      .from('mentorships')
      .select('*')
      .eq('mentorId', mentorId);
    
    // Filtrar por programa específico se fornecido
    if (programId) {
      query = query.eq('program_id', programId);
    } else {
      // Caso contrário, filtrar apenas programas ativos
      // Incluir mentorias com program_id em programas ativos
      if (activeProgramIds.length > 0) {
        query = query.in('program_id', activeProgramIds);
      } else {
        // Se não há programas ativos, retornar vazio
        return res.json({ success: true, data: [], total: 0 });
      }
    }
    
    const { data: mentorships, error: mentorshipsError } = await query.order('createdAt', { ascending: false });

    if (mentorshipsError) throw mentorshipsError;

    if (!mentorships || mentorships.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Buscar dados dos mentorados ÚNICOS
    const menteeIds = [...new Set(mentorships.map((m: any) => m.menteeId).filter(Boolean))];
    const menteesMap = new Map();

    for (const menteeId of menteeIds) {
      try {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email, photo_url')
          .eq('id', String(menteeId))
          .single();
        
        if (user) {
          menteesMap.set(menteeId, user);
        }
      } catch (err) {
        console.error(`Erro ao buscar mentorado ${menteeId}:`, err);
      }
    }

    // Combinar dados
    const mentorshipsWithMentees = mentorships.map((m: any) => ({
      ...m,
      mentee: menteesMap.get(m.menteeId) || null,
    }));

    // Retornar total de mentorados únicos, não de mentorias
    res.json({
      success: true,
      data: mentorshipsWithMentees,
      total: menteeIds.length, // Contagem de mentorados únicos
    });
  } catch (error: any) {
    console.error('Erro ao buscar mentorados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/mentor/mentees/batch
 * Adicionar mentorados em lote
 * Body: { menteeIds: string[], durationDays?: number, endDate?: string, programId?: string }
 */
router.post('/mentees/batch', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { menteeIds, durationDays, endDate, programId } = req.body;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (!menteeIds || !Array.isArray(menteeIds) || menteeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'menteeIds é obrigatório e deve ser um array não vazio',
      });
    }

    // Verificar mentorias existentes para evitar duplicatas NO MESMO PROGRAMA
    // Um usuário pode participar de múltiplas mentorias/programas simultaneamente
    let query = (supabaseAdmin as any)
      .from('mentorships')
      .select('menteeId')
      .eq('mentorId', mentorId)
      .in('menteeId', menteeIds)
      .in('status', ['ACTIVE', 'PENDING']);
    
    // Se um programId foi fornecido, verificar duplicatas apenas nesse programa
    // Se não foi fornecido (null), verificar apenas mentorias sem programa
    if (programId) {
      query = query.eq('program_id', programId);
    } else {
      query = query.is('program_id', null);
    }

    const { data: existingMentorships } = await query;

    const existingMenteeIds = new Set((existingMentorships || []).map((m: any) => m.menteeId));
    const newMenteeIds = menteeIds.filter((id: string) => !existingMenteeIds.has(id));

    if (newMenteeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: programId 
          ? 'Todos os usuários selecionados já estão neste programa'
          : 'Todos os usuários selecionados já são seus mentorados (sem programa)',
        alreadyMentees: menteeIds.length,
      });
    }

    // Calcular data de término
    const startDate = new Date();
    let calculatedEndDate: Date;
    
    if (endDate) {
      // Se endDate já vem como ISO string completo, usar diretamente
      calculatedEndDate = new Date(endDate);
    } else {
      calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + (durationDays || 30));
      // Definir hora para 23:59:59 para evitar problemas de timezone
      calculatedEndDate.setHours(23, 59, 59, 999);
    }

    // Criar mentorias em lote
    const mentorshipsToCreate = newMenteeIds.map((menteeId: string) => ({
      id: crypto.randomUUID(),
      mentorId,
      menteeId,
      program_id: programId || null, // Vincular ao programa se fornecido
      status: 'ACTIVE',
      startDate: startDate.toISOString(),
      endDate: calculatedEndDate.toISOString(),
      objectives: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const { data: createdMentorships, error: createError } = await (supabaseAdmin as any)
      .from('mentorships')
      .insert(mentorshipsToCreate)
      .select();

    if (createError) throw createError;

    // Atualizar contadores do perfil do mentor
    try {
      const { data: profile } = await (supabaseAdmin as any)
        .from('mentor_profiles')
        .select('totalMentees, activeMentees')
        .eq('userId', mentorId)
        .single();

      if (profile) {
        await (supabaseAdmin as any)
          .from('mentor_profiles')
          .update({
            totalMentees: (profile.totalMentees || 0) + newMenteeIds.length,
            activeMentees: (profile.activeMentees || 0) + newMenteeIds.length,
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', mentorId);
      }
    } catch (profileError) {
      console.error('Erro ao atualizar perfil do mentor:', profileError);
    }

    // Formatar mentorships para o frontend
    const formattedMentorships = (createdMentorships || []).map((m: any) => ({
      id: m.id,
      mentee_id: m.menteeId,
      mentor_id: m.mentorId,
      program_id: m.program_id,
      status: m.status?.toLowerCase() || 'active',
      start_date: m.startDate,
      end_date: m.endDate,
    }));

    res.json({
      success: true,
      data: {
        created: createdMentorships?.length || newMenteeIds.length,
        skipped: existingMenteeIds.size,
        mentorships: formattedMentorships,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar mentorias em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/mentorship/mentor/mentees/:menteeId
 * Remover um mentorado
 */
router.delete('/mentees/:menteeId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { menteeId } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Buscar mentoria
    const { data: mentorship } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, status')
      .eq('mentorId', mentorId)
      .eq('menteeId', menteeId)
      .in('status', ['ACTIVE', 'PENDING'])
      .single();

    if (!mentorship) {
      return res.status(404).json({
        success: false,
        error: 'Mentoria não encontrada',
      });
    }

    // Atualizar status para CANCELLED ao invés de deletar
    const { error } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', mentorship.id);

    if (error) throw error;

    // Atualizar contadores do mentor
    try {
      const { data: profile } = await (supabaseAdmin as any)
        .from('mentor_profiles')
        .select('activeMentees')
        .eq('userId', mentorId)
        .single();

      if (profile && profile.activeMentees > 0) {
        await (supabaseAdmin as any)
          .from('mentor_profiles')
          .update({
            activeMentees: profile.activeMentees - 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', mentorId);
      }
    } catch (profileError) {
      console.error('Erro ao atualizar perfil do mentor:', profileError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover mentorado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/mentor/mentees/:menteeId
 * Buscar detalhes de um mentorado específico
 */
router.get('/mentees/:menteeId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { menteeId } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Buscar mentoria
    const { data: mentorship, error: mentorshipError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('*')
      .eq('mentorId', mentorId)
      .eq('menteeId', menteeId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (mentorshipError || !mentorship) {
      return res.status(404).json({
        success: false,
        error: 'Mentorado não encontrado',
      });
    }

    // Buscar dados do usuário mentorado
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email, photo_url')
      .eq('id', menteeId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    res.json({
      success: true,
      data: {
        id: menteeId,
        mentorshipId: mentorship.id,
        name: user.display_name || 'Sem nome',
        email: user.email,
        avatar: user.photo_url,
        status: mentorship.status,
        startDate: mentorship.startDate,
        endDate: mentorship.endDate,
        progress: mentorship.progress || 0,
        questionsAnswered: mentorship.questionsAnswered || 0,
        accuracy: mentorship.accuracy || 0,
        programId: mentorship.program_id,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do mentorado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/mentor/mentees/:mentorshipId/suspend
 * Suspender um mentorado
 */
router.post('/mentees/:mentorshipId/suspend', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Verificar se a mentoria pertence ao mentor
    const { data: mentorship, error: findError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, status')
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId)
      .single();

    if (findError || !mentorship) {
      return res.status(404).json({ success: false, error: 'Mentoria não encontrada' });
    }

    if (mentorship.status === 'SUSPENDED') {
      return res.status(400).json({ success: false, error: 'Mentoria já está suspensa' });
    }

    // Atualizar status
    const { error: updateError } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({ status: 'SUSPENDED', updatedAt: new Date().toISOString() })
      .eq('id', mentorshipId);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao suspender mentorado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/mentor/mentees/:mentorshipId/reactivate
 * Reativar um mentorado suspenso
 */
router.post('/mentees/:mentorshipId/reactivate', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Verificar se a mentoria pertence ao mentor
    const { data: mentorship, error: findError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, status')
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId)
      .single();

    if (findError || !mentorship) {
      return res.status(404).json({ success: false, error: 'Mentoria não encontrada' });
    }

    if (mentorship.status !== 'SUSPENDED') {
      return res.status(400).json({ success: false, error: 'Mentoria não está suspensa' });
    }

    // Atualizar status
    const { error: updateError } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({ status: 'ACTIVE', updatedAt: new Date().toISOString() })
      .eq('id', mentorshipId);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao reativar mentorado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/mentor/mentees/:mentorshipId/extend
 * Estender tempo de mentoria
 */
router.post('/mentees/:mentorshipId/extend', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    const { days } = req.body;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (!days || days <= 0) {
      return res.status(400).json({ success: false, error: 'Número de dias inválido' });
    }

    // Verificar se a mentoria pertence ao mentor
    const { data: mentorship, error: findError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, endDate')
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId)
      .single();

    if (findError || !mentorship) {
      return res.status(404).json({ success: false, error: 'Mentoria não encontrada' });
    }

    // Calcular nova data de término
    const currentEndDate = mentorship.endDate ? new Date(mentorship.endDate) : new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    // Atualizar data de término
    const { error: updateError } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({ 
        endDate: newEndDate.toISOString(), 
        updatedAt: new Date().toISOString() 
      })
      .eq('id', mentorshipId);

    if (updateError) throw updateError;

    res.json({ success: true, data: { newEndDate: newEndDate.toISOString() } });
  } catch (error: any) {
    console.error('Erro ao estender mentoria:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/mentor/program/:programId/mentees
 * Listar mentorados de um programa específico com dados completos
 */
router.get('/program/:programId/mentees', authenticate, isMentor, async (req: any, res) => {
  try {
    const { programId } = req.params;
    const { search, status, page = '1', limit = '50' } = req.query;
    const mentorId = req.user?.id;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Verificar se o programa pertence ao mentor
    const { data: program, error: programError } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .select('id, title')
      .eq('id', programId)
      .eq('mentor_id', mentorId)
      .single();

    if (programError || !program) {
      return res.status(404).json({ success: false, error: 'Programa não encontrado' });
    }

    // Construir query para buscar mentorias
    let mentorshipsQuery = (supabaseAdmin as any)
      .from('mentorships')
      .select('*', { count: 'exact' })
      .eq('mentorId', mentorId)
      .eq('program_id', programId)
      .order('createdAt', { ascending: false });

    // Filtrar por status se fornecido
    if (status && status !== 'all') {
      mentorshipsQuery = mentorshipsQuery.eq('status', status.toUpperCase());
    }

    // Aplicar paginação
    mentorshipsQuery = mentorshipsQuery.range(offset, offset + limitNum - 1);

    const { data: mentorships, error: mentorshipsError, count } = await mentorshipsQuery;

    if (mentorshipsError) {
      console.error('Erro ao buscar mentorias:', mentorshipsError);
      throw mentorshipsError;
    }

    if (!mentorships || mentorships.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        hasMore: false,
        program: { id: program.id, title: program.title }
      });
    }

    // Buscar dados dos usuários
    const menteeIds = [...new Set(mentorships.map((m: any) => m.menteeId).filter(Boolean))];
    
    const { data: users, error: usersError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, display_name, photo_url, role, created_at')
      .in('id', menteeIds as string[]);

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
    }

    const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

    // Buscar informações financeiras
    const mentorshipIds = mentorships.map((m: any) => m.id);
    const { data: financialInfos } = await (supabaseAdmin as any)
      .from('mentee_financial_info')
      .select('*')
      .in('mentorshipid', mentorshipIds);

    const financialMap = new Map((financialInfos || []).map((f: any) => [f.mentorshipid, f]));

    // Formatar dados para o frontend
    let formattedMentorships = mentorships.map((mentorship: any) => {
      const user: any = usersMap.get(mentorship.menteeId);
      const financial: any = financialMap.get(mentorship.id);
      
      return {
        id: mentorship.id,
        status: mentorship.status,
        startDate: mentorship.startDate,
        endDate: mentorship.endDate,
        suspensionReason: mentorship.suspension_reason,
        cancellationReason: mentorship.cancellation_reason,
        createdAt: mentorship.createdAt,
        updatedAt: mentorship.updatedAt,
        questionsAnswered: mentorship.questionsAnswered || 0,
        accuracy: mentorship.accuracy || 0,
        user: user ? {
          id: user.id,
          email: user.email,
          display_name: user.display_name || 'Sem nome',
          photo_url: user.photo_url,
          role: user.role,
          created_at: user.created_at
        } : null,
        financialInfo: financial ? {
          id: financial.id,
          paymentType: financial.paymenttype,
          paymentModality: financial.paymentmodality,
          totalAmount: financial.totalamount,
          installments: financial.installments,
          billingFrequency: financial.billingfrequency,
          status: financial.status
        } : null
      };
    }).filter((m: any) => m.user !== null);

    // Filtrar por busca se fornecido (no resultado, pois o Supabase não suporta busca em joins)
    if (search && typeof search === 'string' && search.length >= 2) {
      const searchLower = search.toLowerCase();
      formattedMentorships = formattedMentorships.filter((mentorship: any) => {
        return (
          mentorship.user?.display_name?.toLowerCase().includes(searchLower) ||
          mentorship.user?.email?.toLowerCase().includes(searchLower)
        );
      });
    }

    res.json({
      success: true,
      data: formattedMentorships,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      hasMore: (count || 0) > offset + limitNum,
      program: {
        id: program.id,
        title: program.title
      }
    });

  } catch (error: any) {
    console.error('Erro ao listar mentorados do programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/mentor/batch/update
 * Atualizar múltiplos mentorados (suspender, reativar, estender, alterar data)
 */
router.put('/batch/update', authenticate, isMentor, async (req: any, res) => {
  try {
    const { mentorshipIds, action, endDate, durationDays, suspensionReason } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (!mentorshipIds || !Array.isArray(mentorshipIds) || mentorshipIds.length === 0) {
      return res.status(400).json({ success: false, error: 'mentorshipIds é obrigatório' });
    }

    if (!['suspend', 'reactivate', 'extend', 'update_end_date'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    // Verificar se todas as mentorias pertencem ao mentor
    const { data: mentorships, error: mentorshipsError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, status, endDate, menteeId')
      .eq('mentorId', mentorId)
      .in('id', mentorshipIds);

    if (mentorshipsError || !mentorships || mentorships.length !== mentorshipIds.length) {
      return res.status(404).json({ success: false, error: 'Algumas mentorias não foram encontradas' });
    }

    let updateData: any = { updatedAt: new Date().toISOString() };

    switch (action) {
      case 'suspend':
        updateData.status = 'SUSPENDED';
        if (suspensionReason) {
          updateData.suspension_reason = suspensionReason;
        }
        break;
      
      case 'reactivate':
        updateData.status = 'ACTIVE';
        updateData.suspension_reason = null;
        break;
      
      case 'extend':
        if (durationDays) {
          const extendedDate = new Date();
          extendedDate.setDate(extendedDate.getDate() + durationDays);
          extendedDate.setHours(23, 59, 59, 999);
          updateData.endDate = extendedDate.toISOString();
        }
        break;
      
      case 'update_end_date':
        if (endDate) {
          const newEndDate = new Date(endDate);
          newEndDate.setHours(23, 59, 59, 999);
          updateData.endDate = newEndDate.toISOString();
        }
        break;
    }

    const { data: updatedMentorships, error: updateError } = await (supabaseAdmin as any)
      .from('mentorships')
      .update(updateData)
      .in('id', mentorshipIds)
      .select('*');

    if (updateError) {
      console.error('Erro ao atualizar mentorias:', updateError);
      throw updateError;
    }

    console.log(`[MentorshipBatch] ${mentorshipIds.length} mentorias atualizadas com ação: ${action}`);

    res.json({
      success: true,
      data: updatedMentorships,
      message: `${mentorshipIds.length} mentoria(s) atualizada(s) com sucesso`
    });

  } catch (error: any) {
    console.error('Erro ao atualizar mentorias em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/mentorship/mentor/batch/remove
 * Remover múltiplos mentorados (cancelar mentorias)
 */
router.delete('/batch/remove', authenticate, isMentor, async (req: any, res) => {
  try {
    const { mentorshipIds, reason } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (!mentorshipIds || !Array.isArray(mentorshipIds) || mentorshipIds.length === 0) {
      return res.status(400).json({ success: false, error: 'mentorshipIds é obrigatório' });
    }

    // Verificar se todas as mentorias pertencem ao mentor
    const { data: mentorships, error: mentorshipsError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, menteeId')
      .eq('mentorId', mentorId)
      .in('id', mentorshipIds);

    if (mentorshipsError || !mentorships || mentorships.length !== mentorshipIds.length) {
      return res.status(404).json({ success: false, error: 'Algumas mentorias não foram encontradas' });
    }

    // Atualizar status para CANCELLED ao invés de deletar
    const { data: cancelledMentorships, error: cancelError } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({
        status: 'CANCELLED',
        cancellation_reason: reason || 'Removido pelo mentor',
        updatedAt: new Date().toISOString()
      })
      .in('id', mentorshipIds)
      .select('*');

    if (cancelError) {
      console.error('Erro ao cancelar mentorias:', cancelError);
      throw cancelError;
    }

    // Atualizar contadores do mentor
    try {
      const { data: profile } = await (supabaseAdmin as any)
        .from('mentor_profiles')
        .select('activeMentees')
        .eq('userId', mentorId)
        .single();

      if (profile && profile.activeMentees > 0) {
        const newCount = Math.max(0, profile.activeMentees - mentorshipIds.length);
        await (supabaseAdmin as any)
          .from('mentor_profiles')
          .update({
            activeMentees: newCount,
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', mentorId);
      }
    } catch (profileError) {
      console.error('Erro ao atualizar perfil do mentor:', profileError);
    }

    console.log(`[MentorshipBatch] ${mentorshipIds.length} mentorias removidas`);

    res.json({
      success: true,
      data: cancelledMentorships,
      message: `${mentorshipIds.length} mentoria(s) removida(s) com sucesso`
    });

  } catch (error: any) {
    console.error('Erro ao remover mentorias em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/mentor/batch/financial
 * Atualizar informações financeiras em massa
 * Cria ou atualiza as informações financeiras e gera os lembretes de cobrança
 */
router.put('/batch/financial', authenticate, isMentor, async (req: any, res) => {
  try {
    const { mentorshipIds, paymentType, paymentModality, totalAmount, installments, billingFrequency, customFrequencyDays, notes } = req.body;
    const mentorId = req.user?.id;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    if (!mentorshipIds || !Array.isArray(mentorshipIds) || mentorshipIds.length === 0) {
      return res.status(400).json({ success: false, error: 'mentorshipIds é obrigatório' });
    }

    // Verificar se todas as mentorias pertencem ao mentor
    const { data: mentorships, error: mentorshipsError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('id, menteeId, endDate')
      .eq('mentorId', mentorId)
      .in('id', mentorshipIds);

    if (mentorshipsError || !mentorships || mentorships.length !== mentorshipIds.length) {
      return res.status(404).json({ success: false, error: 'Algumas mentorias não foram encontradas' });
    }

    const results: any[] = [];
    const now = new Date();
    const installmentAmount = installments && installments > 1 ? totalAmount / installments : totalAmount;

    // Processar cada mentoria individualmente para criar/atualizar e gerar lembretes
    for (const mentorship of mentorships) {
      try {
        // Verificar se já existe informação financeira
        const { data: existingFinancial } = await (supabaseAdmin as any)
          .from('mentee_financial_info')
          .select('id')
          .eq('mentorshipid', mentorship.id)
          .single();

        let financialInfoId: string;

        if (existingFinancial) {
          // Atualizar existente
          const updateData: any = { 
            updatedat: now.toISOString(),
            paymenttype: paymentType,
            paymentmodality: paymentModality,
            totalamount: totalAmount,
            installments: installments || 1,
            installmentamount: installmentAmount,
            billingfrequency: billingFrequency,
            customfrequencydays: customFrequencyDays,
            notes: notes,
          };

          await (supabaseAdmin as any)
            .from('mentee_financial_info')
            .update(updateData)
            .eq('id', existingFinancial.id);

          financialInfoId = existingFinancial.id;

          // Deletar lembretes pendentes antigos para regenerar
          await (supabaseAdmin as any)
            .from('billing_reminders')
            .delete()
            .eq('menteefinancialinfoid', existingFinancial.id)
            .eq('status', 'pending');

        } else {
          // Criar novo
          const newFinancialInfo = {
            id: crypto.randomUUID(),
            mentorshipid: mentorship.id,
            menteeid: mentorship.menteeId,
            mentorid: mentorId,
            paymenttype: paymentType,
            paymentmodality: paymentModality,
            totalamount: totalAmount,
            installments: installments || 1,
            installmentamount: installmentAmount,
            billingfrequency: billingFrequency,
            customfrequencydays: customFrequencyDays,
            startdate: now.toISOString(),
            expirationdate: mentorship.endDate,
            nextbillingdate: now.toISOString(),
            status: 'active',
            notes: notes,
            createdat: now.toISOString(),
            updatedat: now.toISOString(),
          };

          const { data: created } = await (supabaseAdmin as any)
            .from('mentee_financial_info')
            .insert(newFinancialInfo)
            .select()
            .single();

          financialInfoId = created?.id || newFinancialInfo.id;
        }

        // Gerar lembretes de cobrança
        const endDate = new Date(mentorship.endDate);
        const reminders: any[] = [];
        let currentDate = new Date(now);
        let installmentNumber = 1;

        // Calcular intervalo baseado na frequência
        const getNextDate = (date: Date): Date => {
          const next = new Date(date);
          switch (billingFrequency) {
            case 'monthly':
              next.setMonth(next.getMonth() + 1);
              break;
            case 'quarterly':
              next.setMonth(next.getMonth() + 3);
              break;
            case 'semiannual':
              next.setMonth(next.getMonth() + 6);
              break;
            case 'annual':
              next.setFullYear(next.getFullYear() + 1);
              break;
            case 'custom':
              next.setDate(next.getDate() + (customFrequencyDays || 30));
              break;
            default:
              next.setMonth(next.getMonth() + 1);
          }
          return next;
        };

        // Gerar lembretes até a data de expiração (máximo 24)
        while (currentDate <= endDate && reminders.length < 24) {
          reminders.push({
            id: crypto.randomUUID(),
            menteefinancialinfoid: financialInfoId,
            mentorshipid: mentorship.id,
            menteeid: mentorship.menteeId,
            mentorid: mentorId,
            duedate: new Date(currentDate).toISOString(),
            amount: installmentAmount,
            installmentnumber: installments > 1 ? installmentNumber : null,
            totalinstallments: installments > 1 ? installments : null,
            status: 'pending',
            createdat: now.toISOString(),
            updatedat: now.toISOString(),
          });

          currentDate = getNextDate(currentDate);
          installmentNumber++;
        }

        // Inserir lembretes
        if (reminders.length > 0) {
          await (supabaseAdmin as any)
            .from('billing_reminders')
            .insert(reminders);
        }

        results.push({
          mentorshipId: mentorship.id,
          financialInfoId,
          remindersCreated: reminders.length,
        });

      } catch (err: any) {
        console.error(`Erro ao processar mentoria ${mentorship.id}:`, err);
        results.push({
          mentorshipId: mentorship.id,
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => !r.error).length;
    console.log(`[MentorshipBatch] Informações financeiras processadas: ${successCount}/${mentorshipIds.length}`);

    res.json({
      success: true,
      data: results,
      message: `Informações financeiras configuradas para ${successCount} mentoria(s)`,
      totalRemindersCreated: results.reduce((sum, r) => sum + (r.remindersCreated || 0), 0),
    });

  } catch (error: any) {
    console.error('Erro ao atualizar informações financeiras em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const mentorMenteeRoutes = router;
