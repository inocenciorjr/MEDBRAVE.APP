// Tipos para gestão financeira de mentorados

/**
 * Status do mentorado
 */
export enum MenteeStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

/**
 * Tipo de pagamento
 */
export enum PaymentType {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  OTHER = 'other',
}

/**
 * Modalidade de pagamento
 */
export enum PaymentModality {
  CASH = 'cash', // À vista
  INSTALLMENT = 'installment', // Parcelado
}

/**
 * Frequência de cobrança/lembrete
 */
export enum BillingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly', // Trimestral
  SEMIANNUAL = 'semiannual', // Semestral
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

/**
 * Status do lembrete de cobrança
 */
export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

/**
 * Status da parcela
 */
export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

/**
 * Interface para informações financeiras do mentorado
 */
export interface MenteeFinancialInfo {
  id: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  
  // Informações de pagamento
  paymentType: PaymentType;
  paymentModality: PaymentModality;
  totalAmount: number;
  installments: number; // Número de parcelas (1 = à vista)
  installmentAmount: number;
  
  // Frequência de cobrança
  billingFrequency: BillingFrequency;
  customFrequencyDays?: number; // Para frequência customizada
  
  // Datas importantes
  startDate: Date;
  expirationDate: Date;
  nextBillingDate: Date;
  lastPaymentDate?: Date;
  
  // Status
  status: MenteeStatus;
  
  // Notas
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para lembrete de cobrança
 */
export interface BillingReminder {
  id: string;
  menteeFinancialInfoId: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  
  // Informações do lembrete
  dueDate: Date;
  amount: number;
  installmentNumber?: number; // Número da parcela (se parcelado)
  totalInstallments?: number;
  
  // Status
  status: ReminderStatus;
  
  // Datas de ação
  sentAt?: Date;
  paidAt?: Date;
  confirmedBy?: string; // ID do mentor que confirmou
  
  // Notas
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relacionamentos (populados em queries)
  mentee?: any;
  financialInfo?: any;
}

/**
 * Interface para histórico de pagamentos
 */
export interface PaymentHistory {
  id: string;
  menteeFinancialInfoId: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  
  // Informações do pagamento
  amount: number;
  paymentType: PaymentType;
  installmentNumber?: number;
  
  // Datas
  paymentDate: Date;
  confirmedAt: Date;
  confirmedBy: string;
  
  // Referência ao lembrete (se houver)
  reminderId?: string;
  
  // Notas
  notes?: string;
  
  createdAt: Date;
  
  // Relacionamentos (populados em queries)
  mentee?: any;
}

/**
 * Interface para estatísticas financeiras do mentor
 */
export interface MentorFinancialStats {
  totalMentees: number;
  activeMentees: number;
  expiredMentees: number;
  suspendedMentees: number;
  
  // Financeiro
  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  
  // Lembretes
  pendingReminders: number;
  overdueReminders: number;
  todayReminders: number;
  weekReminders: number;
  
  // Expiração
  expiringThisWeek: number;
  expiringThisMonth: number;
}

/**
 * Payload para criar/atualizar informações financeiras
 */
export interface CreateMenteeFinancialInfoPayload {
  mentorshipId: string;
  menteeId: string;
  paymentType: PaymentType;
  paymentModality: PaymentModality;
  totalAmount: number;
  installments?: number;
  billingFrequency: BillingFrequency;
  customFrequencyDays?: number;
  startDate: Date;
  expirationDate: Date;
  notes?: string;
}

export interface UpdateMenteeFinancialInfoPayload {
  paymentType?: PaymentType;
  paymentModality?: PaymentModality;
  totalAmount?: number;
  installments?: number;
  billingFrequency?: BillingFrequency;
  customFrequencyDays?: number;
  expirationDate?: Date;
  nextBillingDate?: Date;
  status?: MenteeStatus;
  notes?: string;
}

/**
 * Filtros para buscar mentorados
 */
export interface MenteeFilters {
  status?: MenteeStatus | MenteeStatus[];
  expiringBefore?: Date;
  expiringAfter?: Date;
  billingDueBefore?: Date;
  billingDueAfter?: Date;
  search?: string;
}

/**
 * Filtros para buscar lembretes
 */
export interface ReminderFilters {
  status?: ReminderStatus | ReminderStatus[];
  dueDateStart?: Date;
  dueDateEnd?: Date;
  menteeId?: string;
}
