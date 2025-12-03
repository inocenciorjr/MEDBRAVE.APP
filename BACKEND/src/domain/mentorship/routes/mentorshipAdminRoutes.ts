import { Router } from 'express';
import { supabaseAdmin } from '../../../supabase.config';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';

const router = Router();

// Aplicar middlewares de autenticação e admin em todas as rotas
router.use(enhancedAuthMiddleware as any);
router.use(adminMiddleware as any);

/**
 * GET /api/mentorship/admin/mentors
 * Buscar todos os mentores
 */
router.get('/mentors', async (req, res) => {
  try {
    // Buscar usuários com role MENTOR
    const { data: mentors, error: mentorsError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email, photo_url, role, created_at')
      .eq('role', 'MENTOR');

    if (mentorsError) throw mentorsError;

    // Buscar perfis de mentor
    const { data: profiles, error: profilesError } = await (supabaseAdmin as any)
      .from('mentor_profiles')
      .select('*');

    if (profilesError) throw profilesError;

    // Combinar dados
    const mentorsWithProfiles = (mentors || []).map((mentor: any) => ({
      ...mentor,
      mentorProfile: profiles?.find((p: any) => p.userId === mentor.id)
    }));

    res.json(mentorsWithProfiles);
  } catch (error: any) {
    console.error('Erro ao buscar mentores:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentorship/admin/mentorships
 * Buscar todas as mentorias
 */
router.get('/mentorships', async (req, res) => {
  try {
    // Buscar mentorias
    const { data: mentorships, error: mentorshipsError } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('*');

    if (mentorshipsError) throw mentorshipsError;

    if (!mentorships || mentorships.length === 0) {
      return res.json([]);
    }

    // Buscar nomes dos mentores e mentorados
    // Como mentorId e menteeId são TEXT (Firebase IDs), precisamos buscar um por um
    const mentorIds = [...new Set(mentorships.map((m: any) => m.mentorId).filter(Boolean))];
    const menteeIds = [...new Set(mentorships.map((m: any) => m.menteeId).filter(Boolean))];
    const allUserIds = [...new Set([...mentorIds, ...menteeIds])];

    const usersMap = new Map();

    if (allUserIds.length > 0) {
      // Buscar usuários um por um para evitar erro de UUID
      for (const userId of allUserIds) {
        try {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, display_name, email')
            .eq('id', String(userId))
            .single();
          
          if (user) {
            usersMap.set(userId, user);
          }
        } catch (err) {
          console.error(`Erro ao buscar usuário ${userId}:`, err);
        }
      }

      const mentorshipsWithUsers = mentorships.map((m: any) => ({
        ...m,
        mentor: usersMap.get(m.mentorId),
        mentee: usersMap.get(m.menteeId)
      }));

      return res.json(mentorshipsWithUsers);
    }

    res.json(mentorships);
  } catch (error: any) {
    console.error('Erro ao buscar mentorias:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mentorship/admin/mentors/:userId/toggle-approval
 * Aprovar/revogar aprovação de mentor
 */
router.put('/mentors/:userId/toggle-approval', async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar perfil atual
    const { data: profile } = await (supabaseAdmin as any)
      .from('mentor_profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    const isApproved = !profile?.isApproved;

    if (profile) {
      // Atualizar perfil existente
      const { error } = await (supabaseAdmin as any)
        .from('mentor_profiles')
        .update({
          isApproved,
          approvedAt: isApproved ? new Date().toISOString() : null
        })
        .eq('userId', userId);

      if (error) throw error;
    } else {
      // Criar novo perfil
      const { error } = await (supabaseAdmin as any)
        .from('mentor_profiles')
        .insert({
          id: crypto.randomUUID(),
          userId,
          isActive: true,
          isApproved,
          approvedAt: isApproved ? new Date().toISOString() : null,
          totalMentees: 0,
          activeMentees: 0,
          rating: 0,
          ratingCount: 0
        });

      if (error) throw error;
    }

    res.json({ success: true, isApproved });
  } catch (error: any) {
    console.error('Erro ao atualizar aprovação:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mentorship/admin/mentorships/:id/status
 * Atualizar status de mentoria
 */
router.put('/mentorships/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { error } = await (supabaseAdmin as any)
      .from('mentorships')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mentorship/admin/users
 * Buscar todos os usuários com status de mentoria
 * Query params: search (opcional), mentorId (opcional)
 */
router.get('/users', async (req, res) => {
  try {
    const { search, mentorId } = req.query;

    // Buscar todos os usuários (exceto admins)
    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, display_name, email, photo_url, role, created_at')
      .neq('role', 'ADMIN')
      .neq('role', 'SUPERADMIN')
      .order('display_name', { ascending: true });

    // Aplicar filtro de busca se fornecido
    if (search && typeof search === 'string' && search.length >= 2) {
      usersQuery = usersQuery.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery.limit(100);

    if (usersError) throw usersError;

    // Buscar mentorias ativas para verificar quem já é mentorado
    let mentorshipsQuery = (supabaseAdmin as any)
      .from('mentorships')
      .select('id, mentorId, menteeId, status, startDate, endDate')
      .in('status', ['ACTIVE', 'PENDING']);

    // Se mentorId fornecido, filtrar apenas mentorias desse mentor
    if (mentorId && typeof mentorId === 'string') {
      mentorshipsQuery = mentorshipsQuery.eq('mentorId', mentorId);
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
      total: usersWithMentorshipStatus.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/admin/mentorships/batch
 * Criar mentorias em lote
 * Body: { mentorId, menteeIds: string[], durationDays: number, endDate?: string }
 */
router.post('/mentorships/batch', async (req, res) => {
  try {
    const { mentorId, menteeIds, durationDays, endDate } = req.body;

    if (!mentorId || !menteeIds || !Array.isArray(menteeIds) || menteeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'mentorId e menteeIds são obrigatórios',
      });
    }

    // Verificar se o mentor existe e é realmente um mentor
    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, role')
      .eq('id', mentorId)
      .single();

    if (mentorError || !mentor) {
      return res.status(404).json({
        success: false,
        error: 'Mentor não encontrado',
      });
    }

    if (mentor.role !== 'MENTOR' && mentor.role !== 'mentor') {
      return res.status(400).json({
        success: false,
        error: 'Usuário não é um mentor',
      });
    }

    // Permitir múltiplas mentorias - um usuário pode participar de várias mentorias
    // Não verificamos duplicatas aqui pois o admin pode criar mentorias livremente
    const newMenteeIds = menteeIds;

    // Calcular data de término
    const startDate = new Date();
    let calculatedEndDate: Date;
    
    if (endDate) {
      calculatedEndDate = new Date(endDate);
    } else {
      calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + (durationDays || 30));
    }

    // Criar mentorias em lote
    const mentorshipsToCreate = newMenteeIds.map((menteeId: string) => ({
      id: crypto.randomUUID(),
      mentorId,
      menteeId,
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
      // Não falhar a operação por erro no perfil
    }

    res.json({
      success: true,
      data: {
        created: createdMentorships?.length || newMenteeIds.length,
        skipped: 0,
        mentorships: createdMentorships,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar mentorias em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/mentorship/admin/mentorships/:id
 * Remover uma mentoria
 */
router.delete('/mentorships/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar mentoria para atualizar contadores
    const { data: mentorship } = await (supabaseAdmin as any)
      .from('mentorships')
      .select('mentorId, status')
      .eq('id', id)
      .single();

    // Deletar mentoria
    const { error } = await (supabaseAdmin as any)
      .from('mentorships')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Atualizar contadores do mentor se a mentoria estava ativa
    if (mentorship && mentorship.status === 'ACTIVE') {
      try {
        const { data: profile } = await (supabaseAdmin as any)
          .from('mentor_profiles')
          .select('activeMentees')
          .eq('userId', mentorship.mentorId)
          .single();

        if (profile && profile.activeMentees > 0) {
          await (supabaseAdmin as any)
            .from('mentor_profiles')
            .update({
              activeMentees: profile.activeMentees - 1,
              updatedAt: new Date().toISOString(),
            })
            .eq('userId', mentorship.mentorId);
        }
      } catch (profileError) {
        console.error('Erro ao atualizar perfil do mentor:', profileError);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover mentoria:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS DE PROGRAMAS DE MENTORIA (ADMIN) =====

/**
 * GET /api/mentorship/admin/programs
 * Buscar todos os programas de mentoria
 */
router.get('/programs', async (req, res) => {
  try {
    const { status } = req.query;

    let query = (supabaseAdmin as any)
      .from('mentor_programs')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por status se fornecido
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: programs, error } = await query;

    if (error) throw error;

    // Buscar informações dos mentores
    const mentorIds = [...new Set((programs || []).map((p: any) => p.mentor_id).filter(Boolean))];
    const mentorsMap = new Map();

    for (const mentorId of mentorIds) {
      try {
        const { data: mentor } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .eq('id', String(mentorId))
          .single();
        
        if (mentor) {
          mentorsMap.set(mentorId, mentor);
        }
      } catch (err) {
        console.error(`Erro ao buscar mentor ${mentorId}:`, err);
      }
    }

    const programsWithMentors = (programs || []).map((p: any) => ({
      id: p.id,
      mentorId: p.mentor_id,
      title: p.title,
      description: p.description,
      status: p.status,
      isPublic: p.is_public,
      participantsCount: p.active_participants_count || 0,
      createdAt: p.created_at,
      mentor: mentorsMap.get(p.mentor_id) ? {
        id: mentorsMap.get(p.mentor_id).id,
        email: mentorsMap.get(p.mentor_id).email,
        displayName: mentorsMap.get(p.mentor_id).display_name,
      } : null,
    }));

    res.json({ success: true, data: programsWithMentors });
  } catch (error: any) {
    console.error('Erro ao buscar programas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/admin/programs/:id/approve
 * Aprovar um programa de mentoria
 */
router.post('/programs/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: program, error: fetchError } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !program) {
      return res.status(404).json({ success: false, error: 'Programa não encontrado' });
    }

    if (program.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        error: 'Apenas programas pendentes podem ser aprovados' 
      });
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Programa aprovado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao aprovar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/admin/programs/:id/reject
 * Rejeitar um programa de mentoria
 */
router.post('/programs/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Motivo da rejeição é obrigatório' 
      });
    }

    const { data: program, error: fetchError } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !program) {
      return res.status(404).json({ success: false, error: 'Programa não encontrado' });
    }

    if (program.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        error: 'Apenas programas pendentes podem ser rejeitados' 
      });
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('mentor_programs')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Programa rejeitado' });
  } catch (error: any) {
    console.error('Erro ao rejeitar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
