import { supabaseAdmin } from '../../../supabase.config';
import {
  MenteeStatus,
  PaymentType,
  BillingFrequency,
  ReminderStatus,
  MenteeFinancialInfo,
  BillingReminder,
  PaymentHistory,
  MentorFinancialStats,
  CreateMenteeFinancialInfoPayload,
  UpdateMenteeFinancialInfoPayload,
  MenteeFilters,
  ReminderFilters,
} from '../types/financial';

// Tipos ainda não foram regenerados do Supabase, então usamos any temporariamente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export class MenteeFinancialService {
  /**
   * Criar informações financeiras para um mentorado
   */
  async createFinancialInfo(
    mentorId: string,
    payload: CreateMenteeFinancialInfoPayload
  ): Promise<MenteeFinancialInfo> {
    const installmentAmount = payload.installments 
      ? payload.totalAmount / payload.installments 
      : payload.totalAmount;

    const nextBillingDate = this.calculateNextBillingDate(
      payload.startDate,
      payload.billingFrequency,
      payload.customFrequencyDays
    );

    const data = {
      id: crypto.randomUUID(),
      mentorshipid: payload.mentorshipId,
      menteeid: payload.menteeId,
      mentorid: mentorId,
      paymenttype: payload.paymentType,
      paymentmodality: payload.paymentModality,
      totalamount: payload.totalAmount,
      installments: payload.installments || 1,
      installmentamount: installmentAmount,
      billingfrequency: payload.billingFrequency,
      customfrequencydays: payload.customFrequencyDays,
      startdate: payload.startDate,
      expirationdate: payload.expirationDate,
      nextbillingdate: nextBillingDate,
      status: MenteeStatus.ACTIVE,
      notes: payload.notes,
      createdat: new Date(),
      updatedat: new Date(),
    };

    const { data: result, error } = await db
      .from('mentee_financial_info')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    // Criar lembretes de cobrança automaticamente
    await this.generateBillingReminders(this.mapFinancialInfoFromDb(result));

    return this.mapFinancialInfoFromDb(result);
  }

  /**
   * Mapear dados do banco para interface
   */
  private mapFinancialInfoFromDb(row: any): MenteeFinancialInfo {
    return {
      id: row.id,
      mentorshipId: row.mentorshipid,
      menteeId: row.menteeid,
      mentorId: row.mentorid,
      paymentType: row.paymenttype,
      paymentModality: row.paymentmodality,
      totalAmount: parseFloat(row.totalamount),
      installments: row.installments,
      installmentAmount: parseFloat(row.installmentamount),
      billingFrequency: row.billingfrequency,
      customFrequencyDays: row.customfrequencydays,
      startDate: new Date(row.startdate),
      expirationDate: new Date(row.expirationdate),
      nextBillingDate: row.nextbillingdate ? new Date(row.nextbillingdate) : undefined,
      lastPaymentDate: row.lastpaymentdate ? new Date(row.lastpaymentdate) : undefined,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.createdat),
      updatedAt: new Date(row.updatedat),
    };
  }

  private mapReminderFromDb(row: any): BillingReminder {
    return {
      id: row.id,
      menteeFinancialInfoId: row.menteefinancialinfoid,
      mentorshipId: row.mentorshipid,
      menteeId: row.menteeid,
      mentorId: row.mentorid,
      dueDate: new Date(row.duedate),
      amount: parseFloat(row.amount),
      installmentNumber: row.installmentnumber,
      totalInstallments: row.totalinstallments,
      status: row.status,
      sentAt: row.sentat ? new Date(row.sentat) : undefined,
      paidAt: row.paidat ? new Date(row.paidat) : undefined,
      confirmedBy: row.confirmedby,
      notes: row.notes,
      createdAt: new Date(row.createdat),
      updatedAt: new Date(row.updatedat),
      mentee: row.mentee,
      financialInfo: row.financialinfo,
    };
  }

  private mapPaymentFromDb(row: any): PaymentHistory {
    return {
      id: row.id,
      menteeFinancialInfoId: row.menteefinancialinfoid,
      mentorshipId: row.mentorshipid,
      menteeId: row.menteeid,
      mentorId: row.mentorid,
      amount: parseFloat(row.amount),
      paymentType: row.paymenttype,
      installmentNumber: row.installmentnumber,
      paymentDate: new Date(row.paymentdate),
      confirmedAt: new Date(row.confirmedat),
      confirmedBy: row.confirmedby,
      reminderId: row.reminderid,
      notes: row.notes,
      createdAt: new Date(row.createdat),
      mentee: row.mentee,
    };
  }

  /**
   * Atualizar informações financeiras
   * Se houver mudanças em valor, parcelas ou frequência, regenera as cobranças pendentes
   */
  async updateFinancialInfo(
    id: string,
    mentorId: string,
    payload: UpdateMenteeFinancialInfoPayload
  ): Promise<MenteeFinancialInfo> {
    const updateData: any = { updatedat: new Date() };

    // Buscar dados atuais para comparação
    const { data: current } = await db
      .from('mentee_financial_info')
      .select('*')
      .eq('id', id)
      .eq('mentorid', mentorId)
      .single();

    if (!current) throw new Error('Informação financeira não encontrada');

    // Verificar se houve mudanças que exigem regeneração de cobranças
    const needsRegeneration =
      (payload.totalAmount && payload.totalAmount !== parseFloat(current.totalamount)) ||
      (payload.installments && payload.installments !== current.installments) ||
      (payload.billingFrequency && payload.billingFrequency !== current.billingfrequency) ||
      (payload.customFrequencyDays && payload.customFrequencyDays !== current.customfrequencydays);

    if (payload.paymentType) updateData.paymenttype = payload.paymentType;
    if (payload.paymentModality) updateData.paymentmodality = payload.paymentModality;
    if (payload.totalAmount) updateData.totalamount = payload.totalAmount;
    if (payload.installments) updateData.installments = payload.installments;
    if (payload.billingFrequency) updateData.billingfrequency = payload.billingFrequency;
    if (payload.customFrequencyDays) updateData.customfrequencydays = payload.customFrequencyDays;
    if (payload.expirationDate) updateData.expirationdate = payload.expirationDate;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.status) updateData.status = payload.status;

    // Recalcular valor da parcela se necessário
    if (payload.totalAmount || payload.installments) {
      const total = payload.totalAmount || parseFloat(current.totalamount);
      const inst = payload.installments || current.installments;
      updateData.installmentamount = total / inst;
    }

    const { data, error } = await db
      .from('mentee_financial_info')
      .update(updateData)
      .eq('id', id)
      .eq('mentorid', mentorId)
      .select()
      .single();

    if (error) throw error;

    const updatedInfo = this.mapFinancialInfoFromDb(data);

    // Se houve mudanças significativas, regenerar cobranças pendentes
    if (needsRegeneration) {
      await this.regeneratePendingReminders(updatedInfo);
    }

    return updatedInfo;
  }

  /**
   * Regenerar cobranças pendentes (deleta pendentes e cria novas)
   * Mantém cobranças já pagas ou canceladas
   */
  private async regeneratePendingReminders(
    financialInfo: MenteeFinancialInfo
  ): Promise<void> {
    const now = new Date();

    // Deletar apenas cobranças pendentes (não pagas, não canceladas)
    await db
      .from('billing_reminders')
      .delete()
      .eq('menteefinancialinfoid', financialInfo.id)
      .in('status', [ReminderStatus.PENDING, ReminderStatus.OVERDUE]);

    // Gerar novas cobranças a partir de hoje
    const reminders: any[] = [];
    let currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(financialInfo.expirationDate);

    let installmentNumber = 1;

    // Contar quantas parcelas já foram pagas
    const { count: paidCount } = await db
      .from('billing_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('menteefinancialinfoid', financialInfo.id)
      .eq('status', ReminderStatus.PAID);

    installmentNumber = (paidCount || 0) + 1;

    while (currentDate <= endDate) {
      reminders.push({
        id: crypto.randomUUID(),
        menteefinancialinfoid: financialInfo.id,
        mentorshipid: financialInfo.mentorshipId,
        menteeid: financialInfo.menteeId,
        mentorid: financialInfo.mentorId,
        duedate: new Date(currentDate),
        amount: financialInfo.installmentAmount,
        installmentnumber: financialInfo.installments > 1 ? installmentNumber : null,
        totalinstallments: financialInfo.installments > 1 ? financialInfo.installments : null,
        status: ReminderStatus.PENDING,
        createdat: now,
        updatedat: now,
      });

      currentDate = this.calculateNextBillingDate(
        currentDate,
        financialInfo.billingFrequency,
        financialInfo.customFrequencyDays
      );
      installmentNumber++;

      // Limitar a 24 lembretes
      if (reminders.length >= 24) break;
    }

    if (reminders.length > 0) {
      const { error } = await db.from('billing_reminders').insert(reminders);
      if (error) console.error('Erro ao regenerar lembretes:', error);
    }
  }

  /**
   * Buscar informações financeiras por mentorship
   */
  async getByMentorship(mentorshipId: string): Promise<MenteeFinancialInfo | null> {
    const { data, error } = await db.from('mentee_financial_info')
      .select('*')
      .eq('mentorshipid', mentorshipId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapFinancialInfoFromDb(data) : null;
  }

  /**
   * Listar mentorados com filtros
   */
  async listMentees(
    mentorId: string,
    filters?: MenteeFilters
  ): Promise<{ data: MenteeFinancialInfo[]; total: number }> {
    let q = db.from('mentee_financial_info')
      .select(`
        *,
        mentorship:mentorships!mentorshipid (
          id, status, "startDate", "endDate", "menteeId",
          mentee:users!"menteeId" (id, display_name, email, photo_url)
        )
      `, { count: 'exact' })
      .eq('mentorid', mentorId);

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        q = q.in('status', filters.status);
      } else {
        q = q.eq('status', filters.status);
      }
    }

    if (filters?.expiringBefore) {
      q = q.lte('expirationdate', filters.expiringBefore.toISOString());
    }

    if (filters?.expiringAfter) {
      q = q.gte('expirationdate', filters.expiringAfter.toISOString());
    }

    if (filters?.billingDueBefore) {
      q = q.lte('nextbillingdate', filters.billingDueBefore.toISOString());
    }

    const { data, error, count } = await q.order('expirationdate', { ascending: true });

    if (error) throw error;
    return { 
      data: (data || []).map((row: any) => ({
        ...this.mapFinancialInfoFromDb(row),
        mentorship: row.mentorship,
      })), 
      total: count || 0 
    };
  }

  /**
   * Gerar lembretes de cobrança automaticamente
   */
  async generateBillingReminders(financialInfo: MenteeFinancialInfo): Promise<void> {
    const reminders: any[] = [];
    let currentDate = new Date(financialInfo.startDate);
    const endDate = new Date(financialInfo.expirationDate);

    let installmentNumber = 1;
    while (currentDate <= endDate) {
      reminders.push({
        id: crypto.randomUUID(),
        menteefinancialinfoid: financialInfo.id,
        mentorshipid: financialInfo.mentorshipId,
        menteeid: financialInfo.menteeId,
        mentorid: financialInfo.mentorId,
        duedate: new Date(currentDate),
        amount: financialInfo.installmentAmount,
        installmentnumber: financialInfo.installments > 1 ? installmentNumber : null,
        totalinstallments: financialInfo.installments > 1 ? financialInfo.installments : null,
        status: ReminderStatus.PENDING,
        createdat: new Date(),
        updatedat: new Date(),
      });

      currentDate = this.calculateNextBillingDate(
        currentDate,
        financialInfo.billingFrequency,
        financialInfo.customFrequencyDays
      );
      installmentNumber++;

      // Limitar a 24 lembretes para evitar loops infinitos
      if (reminders.length >= 24) break;
    }

    if (reminders.length > 0) {
      const { error } = await db.from('billing_reminders').insert(reminders);
      if (error) console.error('Erro ao criar lembretes:', error);
    }
  }

  /**
   * Calcular próxima data de cobrança
   */
  private calculateNextBillingDate(
    fromDate: Date,
    frequency: BillingFrequency,
    customDays?: number
  ): Date {
    const date = new Date(fromDate);
    
    switch (frequency) {
      case BillingFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case BillingFrequency.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case BillingFrequency.SEMIANNUAL:
        date.setMonth(date.getMonth() + 6);
        break;
      case BillingFrequency.ANNUAL:
        date.setFullYear(date.getFullYear() + 1);
        break;
      case BillingFrequency.CUSTOM:
        date.setDate(date.getDate() + (customDays || 30));
        break;
    }
    
    return date;
  }

  /**
   * Buscar lembretes de uma mentoria específica
   */
  async getRemindersByMentorship(
    mentorshipId: string,
    mentorId: string
  ): Promise<BillingReminder[]> {
    const { data, error } = await db
      .from('billing_reminders')
      .select('*')
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId)
      .order('duedate', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => this.mapReminderFromDb(row));
  }

  /**
   * Listar lembretes de cobrança
   */
  async listReminders(
    mentorId: string,
    filters?: ReminderFilters
  ): Promise<{ data: BillingReminder[]; total: number }> {
    let q = db.from('billing_reminders')
      .select(`
        *,
        mentee:users!menteeid (id, display_name, email, photo_url),
        financialinfo:mentee_financial_info!menteefinancialinfoid (
          paymenttype, billingfrequency, totalamount
        )
      `, { count: 'exact' })
      .eq('mentorid', mentorId);

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        q = q.in('status', filters.status);
      } else {
        q = q.eq('status', filters.status);
      }
    }

    if (filters?.dueDateStart) {
      q = q.gte('duedate', filters.dueDateStart.toISOString());
    }

    if (filters?.dueDateEnd) {
      q = q.lte('duedate', filters.dueDateEnd.toISOString());
    }

    if (filters?.menteeId) {
      q = q.eq('menteeid', filters.menteeId);
    }

    const { data, error, count } = await q.order('duedate', { ascending: true });

    if (error) throw error;
    return { data: (data || []).map((row: any) => this.mapReminderFromDb(row)), total: count || 0 };
  }

  /**
   * Confirmar pagamento de um lembrete
   */
  async confirmPayment(
    reminderId: string,
    mentorId: string,
    notes?: string
  ): Promise<{ reminder: BillingReminder; payment: PaymentHistory }> {
    // Buscar lembrete
    const { data: reminder, error: reminderError } = await db.from('billing_reminders')
      .select('*, financialinfo:mentee_financial_info!menteefinancialinfoid (*)')
      .eq('id', reminderId)
      .eq('mentorid', mentorId)
      .single();

    if (reminderError) throw reminderError;
    if (!reminder) throw new Error('Lembrete não encontrado');

    const now = new Date();

    // Atualizar lembrete
    const { data: updatedReminder, error: updateError } = await db.from('billing_reminders')
      .update({
        status: ReminderStatus.PAID,
        paidat: now,
        confirmedby: mentorId,
        notes,
        updatedat: now,
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Criar registro de pagamento
    const paymentData = {
      id: crypto.randomUUID(),
      menteefinancialinfoid: reminder.menteefinancialinfoid,
      mentorshipid: reminder.mentorshipid,
      menteeid: reminder.menteeid,
      mentorid: mentorId,
      amount: reminder.amount,
      paymenttype: reminder.financialinfo?.paymenttype || PaymentType.OTHER,
      installmentnumber: reminder.installmentnumber,
      paymentdate: now,
      confirmedat: now,
      confirmedby: mentorId,
      reminderid: reminderId,
      notes,
      createdat: now,
    };

    const { data: payment, error: paymentError } = await db.from('payment_history')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Atualizar última data de pagamento nas informações financeiras
    await db.from('mentee_financial_info')
      .update({
        lastpaymentdate: now,
        nextbillingdate: this.calculateNextBillingDate(
          now,
          reminder.financialinfo?.billingfrequency || BillingFrequency.MONTHLY,
          reminder.financialinfo?.customfrequencydays
        ),
        updatedat: now,
      })
      .eq('id', reminder.menteefinancialinfoid);

    return { 
      reminder: this.mapReminderFromDb(updatedReminder), 
      payment: this.mapPaymentFromDb(payment) 
    };
  }

  /**
   * Reverter pagamento confirmado (desfazer confirmação)
   */
  async revertPayment(
    reminderId: string,
    mentorId: string
  ): Promise<{ reminder: BillingReminder }> {
    // Buscar lembrete
    const { data: reminder, error: reminderError } = await db
      .from('billing_reminders')
      .select('*')
      .eq('id', reminderId)
      .eq('mentorid', mentorId)
      .single();

    if (reminderError) throw reminderError;
    if (!reminder) throw new Error('Lembrete não encontrado');
    if (reminder.status !== ReminderStatus.PAID) {
      throw new Error('Este lembrete não está marcado como pago');
    }

    const now = new Date();
    const dueDate = new Date(reminder.duedate);

    // Determinar novo status (pendente ou atrasado)
    const newStatus = dueDate < now ? ReminderStatus.OVERDUE : ReminderStatus.PENDING;

    // Reverter status do lembrete
    const { data: updatedReminder, error: updateError } = await db
      .from('billing_reminders')
      .update({
        status: newStatus,
        paidat: null,
        confirmedby: null,
        updatedat: now,
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Deletar registro de pagamento associado
    await db
      .from('payment_history')
      .delete()
      .eq('reminderid', reminderId)
      .eq('mentorid', mentorId);

    return {
      reminder: this.mapReminderFromDb(updatedReminder),
    };
  }

  /**
   * Suspender mentorado
   */
  async suspendMentee(
    mentorshipId: string,
    mentorId: string,
    reason?: string
  ): Promise<void> {
    const now = new Date();

    // Atualizar status financeiro
    await db.from('mentee_financial_info')
      .update({ status: MenteeStatus.SUSPENDED, notes: reason, updatedat: now })
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId);

    // Atualizar mentorship
    await db.from('mentorships')
      .update({ status: 'SUSPENDED', updatedAt: now })
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId);
  }

  /**
   * Reativar mentorado
   */
  async reactivateMentee(
    mentorshipId: string,
    mentorId: string,
    newExpirationDate?: Date
  ): Promise<void> {
    const now = new Date();
    const updateData: any = { status: MenteeStatus.ACTIVE, updatedat: now };
    
    if (newExpirationDate) {
      updateData.expirationdate = newExpirationDate;
    }

    await db.from('mentee_financial_info')
      .update(updateData)
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId);

    await db.from('mentorships')
      .update({ status: 'ACTIVE', endDate: newExpirationDate, updatedAt: now })
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId);
  }

  /**
   * Expirar mentorado manualmente
   */
  async expireMentee(mentorshipId: string, mentorId: string): Promise<void> {
    const now = new Date();

    await db.from('mentee_financial_info')
      .update({ status: MenteeStatus.EXPIRED, updatedat: now })
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId);

    await db.from('mentorships')
      .update({ status: 'EXPIRED', updatedAt: now })
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId);
  }

  /**
   * Estender tempo de mentoria
   */
  async extendMentorship(
    mentorshipId: string,
    mentorId: string,
    newExpirationDate: Date,
    regenerateReminders: boolean = true
  ): Promise<void> {
    const now = new Date();

    const { data: financialInfo } = await db.from('mentee_financial_info')
      .select('*')
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId)
      .single();

    await db.from('mentee_financial_info')
      .update({ expirationdate: newExpirationDate, updatedat: now })
      .eq('mentorshipid', mentorshipId)
      .eq('mentorid', mentorId);

    await db.from('mentorships')
      .update({ endDate: newExpirationDate, updatedAt: now })
      .eq('id', mentorshipId)
      .eq('mentorId', mentorId);

    // Regenerar lembretes se solicitado
    if (regenerateReminders && financialInfo) {
      // Deletar lembretes pendentes futuros
      await db.from('billing_reminders')
        .delete()
        .eq('menteefinancialinfoid', financialInfo.id)
        .eq('status', ReminderStatus.PENDING)
        .gt('duedate', now.toISOString());

      // Gerar novos lembretes
      const mappedInfo = this.mapFinancialInfoFromDb(financialInfo);
      await this.generateBillingReminders({
        ...mappedInfo,
        expirationDate: newExpirationDate,
        startDate: now,
      });
    }
  }

  /**
   * Obter estatísticas financeiras do mentor
   */
  async getFinancialStats(mentorId: string): Promise<MentorFinancialStats> {
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date(now);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Contagem de mentorados por status
    const { data: menteeStats } = await db.from('mentee_financial_info')
      .select('status')
      .eq('mentorid', mentorId);

    const statusCounts = {
      active: 0,
      expired: 0,
      suspended: 0,
      total: menteeStats?.length || 0,
    };

    menteeStats?.forEach((m: any) => {
      if (m.status === MenteeStatus.ACTIVE) statusCounts.active++;
      else if (m.status === MenteeStatus.EXPIRED) statusCounts.expired++;
      else if (m.status === MenteeStatus.SUSPENDED) statusCounts.suspended++;
    });

    // Lembretes
    const { data: reminders } = await db.from('billing_reminders')
      .select('status, duedate, amount')
      .eq('mentorid', mentorId);

    let pendingReminders = 0;
    let overdueReminders = 0;
    let todayReminders = 0;
    let weekReminders = 0;
    let pendingPayments = 0;
    let overduePayments = 0;

    reminders?.forEach((r: any) => {
      const dueDate = new Date(r.duedate);
      // Comparar apenas a data (sem hora) para determinar se está atrasado
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (r.status === ReminderStatus.PENDING) {
        pendingReminders++;
        pendingPayments += parseFloat(r.amount);
        // Atrasado apenas se a DATA de vencimento for anterior a hoje (não inclui hoje)
        if (dueDateOnly < todayOnly) {
          overdueReminders++;
          overduePayments += parseFloat(r.amount);
        }
        if (dueDate >= todayStart && dueDate <= todayEnd) todayReminders++;
        if (dueDate <= weekFromNow) weekReminders++;
      } else if (r.status === ReminderStatus.OVERDUE) {
        // Também contar os que já estão marcados como overdue
        overdueReminders++;
        overduePayments += parseFloat(r.amount);
      }
    });

    // Pagamentos confirmados
    const { data: payments } = await db.from('payment_history')
      .select('amount')
      .eq('mentorid', mentorId);

    const totalRevenue = payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

    // Expirações próximas
    const { count: expiringWeek } = await db.from('mentee_financial_info')
      .select('*', { count: 'exact', head: true })
      .eq('mentorid', mentorId)
      .eq('status', MenteeStatus.ACTIVE)
      .lte('expirationdate', weekFromNow.toISOString());

    const { count: expiringMonth } = await db.from('mentee_financial_info')
      .select('*', { count: 'exact', head: true })
      .eq('mentorid', mentorId)
      .eq('status', MenteeStatus.ACTIVE)
      .lte('expirationdate', monthFromNow.toISOString());

    return {
      totalMentees: statusCounts.total,
      activeMentees: statusCounts.active,
      expiredMentees: statusCounts.expired,
      suspendedMentees: statusCounts.suspended,
      totalRevenue,
      pendingPayments,
      overduePayments,
      pendingReminders,
      overdueReminders,
      todayReminders,
      weekReminders,
      expiringThisWeek: expiringWeek || 0,
      expiringThisMonth: expiringMonth || 0,
    };
  }

  /**
   * Processar expirações automáticas (chamado pelo job)
   * Considera atrasado apenas quando a DATA de vencimento passou (não a hora)
   */
  async processExpirations(): Promise<{ expired: number; notified: number }> {
    const now = new Date();
    // Início do dia atual (00:00:00) para comparação por data
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let expired = 0;
    const notified = 0;

    // Buscar mentorados ativos com data de expiração passada (antes de hoje)
    const { data: expiredMentees } = await db.from('mentee_financial_info')
      .select('id, mentorshipid, mentorid, menteeid')
      .eq('status', MenteeStatus.ACTIVE)
      .lt('expirationdate', todayStart.toISOString());

    if (expiredMentees && expiredMentees.length > 0) {
      for (const mentee of expiredMentees) {
        try {
          await db.from('mentee_financial_info')
            .update({ status: MenteeStatus.EXPIRED, updatedat: now })
            .eq('id', mentee.id);

          await db.from('mentorships')
            .update({ status: 'EXPIRED', updatedAt: now })
            .eq('id', mentee.mentorshipid);

          expired++;
        } catch (error) {
          console.error(`Erro ao expirar mentorado ${mentee.id}:`, error);
        }
      }
    }

    // Atualizar lembretes vencidos (data de vencimento anterior a hoje)
    await db.from('billing_reminders')
      .update({ status: ReminderStatus.OVERDUE, updatedat: now })
      .eq('status', ReminderStatus.PENDING)
      .lt('duedate', todayStart.toISOString());

    return { expired, notified };
  }

  /**
   * Obter lembretes do dia para um mentor
   */
  async getTodayReminders(mentorId: string): Promise<BillingReminder[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await db.from('billing_reminders')
      .select(`
        *,
        mentee:users!menteeid (id, display_name, email, photo_url)
      `)
      .eq('mentorid', mentorId)
      .eq('status', ReminderStatus.PENDING)
      .gte('duedate', todayStart.toISOString())
      .lte('duedate', todayEnd.toISOString())
      .order('duedate', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => this.mapReminderFromDb(row));
  }

  /**
   * Obter lembretes dos próximos 7 dias para um mentor
   */
  async getWeekReminders(mentorId: string): Promise<BillingReminder[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const { data, error } = await db.from('billing_reminders')
      .select(`
        *,
        mentee:users!menteeid (id, display_name, email, photo_url)
      `)
      .eq('mentorid', mentorId)
      .in('status', [ReminderStatus.PENDING, ReminderStatus.OVERDUE])
      .gte('duedate', todayStart.toISOString())
      .lte('duedate', weekEnd.toISOString())
      .order('duedate', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => this.mapReminderFromDb(row));
  }

  /**
   * Histórico de pagamentos
   */
  async getPaymentHistory(
    mentorId: string,
    menteeId?: string,
    limit: number = 50
  ): Promise<PaymentHistory[]> {
    let q = db.from('payment_history')
      .select(`
        *,
        mentee:users!menteeid (id, display_name, email, photo_url)
      `)
      .eq('mentorid', mentorId)
      .order('paymentdate', { ascending: false })
      .limit(limit);

    if (menteeId) {
      q = q.eq('menteeid', menteeId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row: any) => this.mapPaymentFromDb(row));
  }

  /**
   * Cancelar lembrete
   */
  async cancelReminder(reminderId: string, mentorId: string): Promise<void> {
    await db.from('billing_reminders')
      .update({ status: ReminderStatus.CANCELLED, updatedat: new Date() })
      .eq('id', reminderId)
      .eq('mentorid', mentorId);
  }

  /**
   * Atualizar data de um lembrete
   */
  async updateReminderDate(
    reminderId: string,
    mentorId: string,
    newDate: Date
  ): Promise<BillingReminder> {
    const { data, error } = await db.from('billing_reminders')
      .update({ duedate: newDate, updatedat: new Date() })
      .eq('id', reminderId)
      .eq('mentorid', mentorId)
      .select()
      .single();

    if (error) throw error;
    return this.mapReminderFromDb(data);
  }

  // ============ COBRANÇAS POR MENTORADO ============

  /**
   * Buscar cobranças de um mentorado
   */
  async getMenteeCharges(mentorshipId: string, mentorId: string): Promise<any[]> {
    const { data, error } = await db
      .from('mentorship_charges')
      .select('*')
      .eq('mentorship_id', mentorshipId)
      .eq('mentor_id', mentorId)
      .order('due_date', { ascending: false });

    if (error) throw error;

    // Atualizar status de cobranças vencidas
    const now = new Date();
    const charges = (data || []).map((charge: any) => {
      const dueDate = new Date(charge.due_date);
      if (charge.status === 'pending' && dueDate < now) {
        return { ...charge, status: 'overdue' };
      }
      return charge;
    });

    return charges.map((c: any) => ({
      id: c.id,
      description: c.description,
      amount: parseFloat(c.amount),
      dueDate: c.due_date,
      status: c.status,
      paidAt: c.paid_at,
      createdAt: c.created_at,
    }));
  }

  /**
   * Criar cobrança
   */
  async createCharge(
    mentorshipId: string,
    mentorId: string,
    payload: { description: string; amount: number; dueDate: Date }
  ): Promise<any> {
    const { data, error } = await db
      .from('mentorship_charges')
      .insert({
        mentorship_id: mentorshipId,
        mentor_id: mentorId,
        description: payload.description,
        amount: payload.amount,
        due_date: payload.dueDate.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      description: data.description,
      amount: parseFloat(data.amount),
      dueDate: data.due_date,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  /**
   * Atualizar cobrança
   */
  async updateCharge(
    chargeId: string,
    mentorId: string,
    payload: { description?: string; amount?: number; dueDate?: Date }
  ): Promise<any> {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (payload.description) updateData.description = payload.description;
    if (payload.amount) updateData.amount = payload.amount;
    if (payload.dueDate) updateData.due_date = payload.dueDate.toISOString();

    const { data, error } = await db
      .from('mentorship_charges')
      .update(updateData)
      .eq('id', chargeId)
      .eq('mentor_id', mentorId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      description: data.description,
      amount: parseFloat(data.amount),
      dueDate: data.due_date,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  /**
   * Excluir cobrança
   */
  async deleteCharge(chargeId: string, mentorId: string): Promise<void> {
    const { error } = await db
      .from('mentorship_charges')
      .delete()
      .eq('id', chargeId)
      .eq('mentor_id', mentorId);

    if (error) throw error;
  }

  /**
   * Marcar cobrança como paga
   */
  async markChargeAsPaid(chargeId: string, mentorId: string): Promise<any> {
    const { data, error } = await db
      .from('mentorship_charges')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chargeId)
      .eq('mentor_id', mentorId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      description: data.description,
      amount: parseFloat(data.amount),
      dueDate: data.due_date,
      status: data.status,
      paidAt: data.paid_at,
      createdAt: data.created_at,
    };
  }

  /**
   * Enviar lembrete de cobrança (placeholder - implementar integração com email/notificação)
   */
  async sendChargeReminder(chargeId: string, mentorId: string): Promise<void> {
    // Verificar se a cobrança existe e pertence ao mentor
    const { data: charge, error } = await db
      .from('mentorship_charges')
      .select('*')
      .eq('id', chargeId)
      .eq('mentor_id', mentorId)
      .single();

    if (error || !charge) {
      throw new Error('Cobrança não encontrada');
    }

    // TODO: Implementar envio de email/notificação
    // Por enquanto, apenas registra que o lembrete foi enviado
    console.log(`Lembrete enviado para cobrança ${chargeId}`);
  }

  // ============ RELATÓRIO FINANCEIRO ============

  /**
   * Relatório financeiro completo
   */
  async getFinancialReport(
    mentorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    summary: {
      totalRevenue: number;
      pendingAmount: number;
      overdueAmount: number;
      paidThisMonth: number;
      paidLastMonth: number;
      growthPercentage: number;
      averageTicket: number;
      totalPayments: number;
    };
    recentPayments: any[];
  }> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Pagamentos totais
    let paymentsQuery = db
      .from('payment_history')
      .select(
        `
        *,
        mentee:users!menteeid (id, display_name, email, photo_url)
      `
      )
      .eq('mentorid', mentorId)
      .order('paymentdate', { ascending: false });

    if (startDate) {
      paymentsQuery = paymentsQuery.gte('paymentdate', startDate.toISOString());
    }
    if (endDate) {
      paymentsQuery = paymentsQuery.lte('paymentdate', endDate.toISOString());
    }

    const { data: allPayments } = await paymentsQuery;

    // Pagamentos deste mês
    const { data: thisMonthPayments } = await db
      .from('payment_history')
      .select('amount')
      .eq('mentorid', mentorId)
      .gte('paymentdate', thisMonthStart.toISOString());

    // Pagamentos do mês passado
    const { data: lastMonthPayments } = await db
      .from('payment_history')
      .select('amount')
      .eq('mentorid', mentorId)
      .gte('paymentdate', lastMonthStart.toISOString())
      .lte('paymentdate', lastMonthEnd.toISOString());

    // Valores pendentes e atrasados
    const { data: reminders } = await db
      .from('billing_reminders')
      .select('amount, status, duedate')
      .eq('mentorid', mentorId)
      .in('status', [ReminderStatus.PENDING, ReminderStatus.OVERDUE]);

    // Início do dia atual para comparação por data (não por hora)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let pendingAmount = 0;
    let overdueAmount = 0;
    reminders?.forEach((r: any) => {
      const amount = parseFloat(r.amount);
      const dueDate = new Date(r.duedate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      // Atrasado se já está marcado como overdue OU se a DATA de vencimento é anterior a hoje
      if (r.status === ReminderStatus.OVERDUE || dueDateOnly < todayStart) {
        overdueAmount += amount;
      } else {
        pendingAmount += amount;
      }
    });

    const totalRevenue =
      allPayments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
    const paidThisMonth =
      thisMonthPayments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
    const paidLastMonth =
      lastMonthPayments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

    const growthPercentage =
      paidLastMonth > 0 ? ((paidThisMonth - paidLastMonth) / paidLastMonth) * 100 : 0;

    const totalPayments = allPayments?.length || 0;
    const averageTicket = totalPayments > 0 ? totalRevenue / totalPayments : 0;

    return {
      summary: {
        totalRevenue,
        pendingAmount,
        overdueAmount,
        paidThisMonth,
        paidLastMonth,
        growthPercentage,
        averageTicket,
        totalPayments,
      },
      recentPayments: (allPayments || []).slice(0, 20).map((p: any) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        paymentType: p.paymenttype,
        paymentDate: p.paymentdate,
        installmentNumber: p.installmentnumber,
        mentee: p.mentee,
      })),
    };
  }

  /**
   * Receita mensal (últimos 12 meses)
   */
  async getMonthlyRevenue(
    mentorId: string
  ): Promise<{ month: string; revenue: number; payments: number }[]> {
    const months: { month: string; revenue: number; payments: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const { data } = await db
        .from('payment_history')
        .select('amount')
        .eq('mentorid', mentorId)
        .gte('paymentdate', monthStart.toISOString())
        .lte('paymentdate', monthEnd.toISOString());

      const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const revenue = data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue,
        payments: data?.length || 0,
      });
    }

    return months;
  }

  /**
   * Receita por tipo de pagamento
   */
  async getRevenueByPaymentType(
    mentorId: string
  ): Promise<{ type: string; label: string; revenue: number; count: number; percentage: number }[]> {
    const { data } = await db
      .from('payment_history')
      .select('paymenttype, amount')
      .eq('mentorid', mentorId);

    const typeMap: Record<string, { revenue: number; count: number }> = {};
    let total = 0;

    data?.forEach((p: any) => {
      const type = p.paymenttype || 'other';
      const amount = parseFloat(p.amount);
      if (!typeMap[type]) {
        typeMap[type] = { revenue: 0, count: 0 };
      }
      typeMap[type].revenue += amount;
      typeMap[type].count++;
      total += amount;
    });

    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      bank_transfer: 'Transferência',
      cash: 'Dinheiro',
      other: 'Outro',
    };

    return Object.entries(typeMap)
      .map(([type, data]) => ({
        type,
        label: labels[type] || type,
        revenue: data.revenue,
        count: data.count,
        percentage: total > 0 ? (data.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Top mentorados por receita
   */
  async getTopMenteesByRevenue(
    mentorId: string,
    limit: number = 10
  ): Promise<{ menteeId: string; name: string; email: string; avatar?: string; totalPaid: number; paymentsCount: number }[]> {
    const { data } = await db
      .from('payment_history')
      .select(
        `
        menteeid,
        amount,
        mentee:users!menteeid (id, display_name, email, photo_url)
      `
      )
      .eq('mentorid', mentorId);

    const menteeMap: Record<
      string,
      { name: string; email: string; avatar?: string; totalPaid: number; paymentsCount: number }
    > = {};

    data?.forEach((p: any) => {
      const menteeId = p.menteeid;
      const amount = parseFloat(p.amount);
      if (!menteeMap[menteeId]) {
        menteeMap[menteeId] = {
          name: p.mentee?.display_name || 'Sem nome',
          email: p.mentee?.email || '',
          avatar: p.mentee?.photo_url,
          totalPaid: 0,
          paymentsCount: 0,
        };
      }
      menteeMap[menteeId].totalPaid += amount;
      menteeMap[menteeId].paymentsCount++;
    });

    return Object.entries(menteeMap)
      .map(([menteeId, data]) => ({
        menteeId,
        ...data,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, limit);
  }
}

export const menteeFinancialService = new MenteeFinancialService();
export default menteeFinancialService;


