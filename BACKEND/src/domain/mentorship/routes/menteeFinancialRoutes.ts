import { Router } from 'express';
import { enhancedAuthMiddleware, requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { authenticate, isMentor } from '../middlewares/authMiddleware';
import { menteeFinancialService } from '../services/MenteeFinancialService';

const router = Router();

// Middleware de autenticação
router.use(enhancedAuthMiddleware as any);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * GET /api/mentorship/financial/stats
 * Obter estatísticas financeiras do mentor
 */
router.get('/stats', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const stats = await menteeFinancialService.getFinancialStats(mentorId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/mentees
 * Listar mentorados com informações financeiras
 */
router.get('/mentees', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const { status, expiringDays, search } = req.query;
    
    const filters: any = {};
    if (status) {
      filters.status = Array.isArray(status) ? status : [status];
    }
    if (expiringDays) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(expiringDays));
      filters.expiringBefore = date;
    }
    if (search) filters.search = search;

    const result = await menteeFinancialService.listMentees(mentorId, filters);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Erro ao listar mentorados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/mentee/:mentorshipId
 * Obter informações financeiras de um mentorado específico
 */
router.get('/mentee/:mentorshipId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const financialInfo = await menteeFinancialService.getByMentorship(mentorshipId);
    res.json({ success: true, data: financialInfo });
  } catch (error: any) {
    console.error('Erro ao buscar informações financeiras:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/financial/mentee/:mentorshipId
 * Atualizar informações financeiras de um mentorado
 */
router.put('/mentee/:mentorshipId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const existing = await menteeFinancialService.getByMentorship(mentorshipId);
    
    if (existing) {
      const updated = await menteeFinancialService.updateFinancialInfo(
        existing.id,
        mentorId,
        req.body
      );
      return res.json({ success: true, data: updated });
    }

    // Se não existe, criar
    const created = await menteeFinancialService.createFinancialInfo(mentorId, {
      ...req.body,
      mentorshipId,
    });
    res.json({ success: true, data: created });
  } catch (error: any) {
    console.error('Erro ao atualizar informações financeiras:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentees/:mentorshipId
 * Criar/atualizar informações financeiras de um mentorado (legacy)
 */
router.post('/mentees/:mentorshipId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const existing = await menteeFinancialService.getByMentorship(mentorshipId);
    
    if (existing) {
      const updated = await menteeFinancialService.updateFinancialInfo(
        existing.id,
        mentorId,
        req.body
      );
      return res.json({ success: true, data: updated });
    }

    const created = await menteeFinancialService.createFinancialInfo(mentorId, {
      ...req.body,
      mentorshipId,
    });
    res.json({ success: true, data: created });
  } catch (error: any) {
    console.error('Erro ao salvar informações financeiras:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentees/:mentorshipId/suspend
 * Suspender mentorado
 */
router.post('/mentees/:mentorshipId/suspend', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    const { reason } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.suspendMentee(mentorshipId, mentorId, reason);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentees/:mentorshipId/reactivate
 * Reativar mentorado
 */
router.post('/mentees/:mentorshipId/reactivate', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    const { newExpirationDate } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.reactivateMentee(
      mentorshipId,
      mentorId,
      newExpirationDate ? new Date(newExpirationDate) : undefined
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentees/:mentorshipId/expire
 * Expirar mentorado manualmente
 */
router.post('/mentees/:mentorshipId/expire', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.expireMentee(mentorshipId, mentorId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentees/:mentorshipId/extend
 * Estender tempo de mentoria
 */
router.post('/mentees/:mentorshipId/extend', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    const { newExpirationDate, regenerateReminders } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.extendMentorship(
      mentorshipId,
      mentorId,
      new Date(newExpirationDate),
      regenerateReminders !== false
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ COBRANÇAS POR MENTORADO ============

/**
 * GET /api/mentorship/financial/mentee/:mentorshipId/charges
 * Listar cobranças de um mentorado específico
 */
router.get('/mentee/:mentorshipId/charges', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const charges = await menteeFinancialService.getMenteeCharges(mentorshipId, mentorId);
    res.json({ success: true, data: charges });
  } catch (error: any) {
    console.error('Erro ao buscar cobranças:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/mentee/:mentorshipId/charges
 * Criar nova cobrança para um mentorado
 */
router.post('/mentee/:mentorshipId/charges', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    const { description, amount, dueDate } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const charge = await menteeFinancialService.createCharge(mentorshipId, mentorId, {
      description,
      amount,
      dueDate: new Date(dueDate),
    });
    res.json({ success: true, data: charge });
  } catch (error: any) {
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/financial/charges/:chargeId
 * Atualizar cobrança
 */
router.put('/charges/:chargeId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { chargeId } = req.params;
    const { description, amount, dueDate } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const charge = await menteeFinancialService.updateCharge(chargeId, mentorId, {
      description,
      amount,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    res.json({ success: true, data: charge });
  } catch (error: any) {
    console.error('Erro ao atualizar cobrança:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/mentorship/financial/charges/:chargeId
 * Excluir cobrança
 */
router.delete('/charges/:chargeId', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { chargeId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.deleteCharge(chargeId, mentorId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir cobrança:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/charges/:chargeId/mark-paid
 * Marcar cobrança como paga
 */
router.post('/charges/:chargeId/mark-paid', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { chargeId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const charge = await menteeFinancialService.markChargeAsPaid(chargeId, mentorId);
    res.json({ success: true, data: charge });
  } catch (error: any) {
    console.error('Erro ao marcar como pago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/charges/:chargeId/send-reminder
 * Enviar lembrete de cobrança
 */
router.post('/charges/:chargeId/send-reminder', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { chargeId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.sendChargeReminder(chargeId, mentorId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao enviar lembrete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ LEMBRETES ============

/**
 * GET /api/mentorship/financial/mentorship/:mentorshipId/reminders
 * Listar lembretes de cobrança de uma mentoria específica
 */
router.get('/mentorship/:mentorshipId/reminders', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { mentorshipId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const result = await menteeFinancialService.getRemindersByMentorship(mentorshipId, mentorId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/reminders
 * Listar lembretes de cobrança
 */
router.get('/reminders', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const { status, startDate, endDate, menteeId } = req.query;
    
    const filters: any = {};
    if (status) {
      filters.status = Array.isArray(status) ? status : [status];
    }
    if (startDate) filters.dueDateStart = new Date(startDate as string);
    if (endDate) filters.dueDateEnd = new Date(endDate as string);
    if (menteeId) filters.menteeId = menteeId;

    const result = await menteeFinancialService.listReminders(mentorId, filters);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/reminders/today
 * Lembretes do dia
 */
router.get('/reminders/today', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const reminders = await menteeFinancialService.getTodayReminders(mentorId);
    res.json({ success: true, data: reminders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/reminders/week
 * Lembretes dos próximos 7 dias
 */
router.get('/reminders/week', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const reminders = await menteeFinancialService.getWeekReminders(mentorId);
    res.json({ success: true, data: reminders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/reminders/:reminderId/confirm
 * Confirmar pagamento de um lembrete
 */
router.post('/reminders/:reminderId/confirm', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { reminderId } = req.params;
    const { notes } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const result = await menteeFinancialService.confirmPayment(reminderId, mentorId, notes);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/reminders/:reminderId/revert
 * Reverter pagamento confirmado (desfazer confirmação)
 */
router.post('/reminders/:reminderId/revert', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { reminderId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const result = await menteeFinancialService.revertPayment(reminderId, mentorId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/financial/reminders/:reminderId/cancel
 * Cancelar lembrete
 */
router.post('/reminders/:reminderId/cancel', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { reminderId } = req.params;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    await menteeFinancialService.cancelReminder(reminderId, mentorId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/financial/reminders/:reminderId/date
 * Atualizar data do lembrete
 */
router.put('/reminders/:reminderId/date', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    const { reminderId } = req.params;
    const { newDate } = req.body;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const reminder = await menteeFinancialService.updateReminderDate(
      reminderId,
      mentorId,
      new Date(newDate)
    );
    res.json({ success: true, data: reminder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ HISTÓRICO ============

/**
 * GET /api/mentorship/financial/payments
 * Histórico de pagamentos
 */
router.get('/payments', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const { menteeId, limit } = req.query;
    const payments = await menteeFinancialService.getPaymentHistory(
      mentorId,
      menteeId as string,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ RELATÓRIO FINANCEIRO ============

/**
 * GET /api/mentorship/financial/report
 * Relatório financeiro completo
 */
router.get('/report', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const { startDate, endDate } = req.query;
    const report = await menteeFinancialService.getFinancialReport(
      mentorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/report/monthly
 * Receita mensal (últimos 12 meses)
 */
router.get('/report/monthly', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const data = await menteeFinancialService.getMonthlyRevenue(mentorId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/report/by-payment-type
 * Receita por tipo de pagamento
 */
router.get('/report/by-payment-type', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const data = await menteeFinancialService.getRevenueByPaymentType(mentorId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/financial/report/top-mentees
 * Top mentorados por receita
 */
router.get('/report/top-mentees', authenticate, isMentor, async (req: any, res) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) return res.status(401).json({ success: false, error: 'Não autenticado' });

    const { limit } = req.query;
    const data = await menteeFinancialService.getTopMenteesByRevenue(
      mentorId,
      limit ? parseInt(limit as string) : 10
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export const menteeFinancialRoutes = router;
