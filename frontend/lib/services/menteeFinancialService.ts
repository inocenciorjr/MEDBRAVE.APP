import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// Enums
export enum MenteeStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

export enum PaymentType {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  OTHER = 'other',
}

export enum PaymentModality {
  CASH = 'cash',
  INSTALLMENT = 'installment',
}

export enum BillingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Interfaces
export interface MenteeFinancialInfo {
  id: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  paymentType: PaymentType;
  paymentModality: PaymentModality;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  billingFrequency: BillingFrequency;
  customFrequencyDays?: number;
  startDate: string;
  expirationDate: string;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  status: MenteeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  mentorship?: any;
}

export interface BillingReminder {
  id: string;
  menteeFinancialInfoId: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  dueDate: string;
  amount: number;
  installmentNumber?: number;
  totalInstallments?: number;
  status: ReminderStatus;
  sentAt?: string;
  paidAt?: string;
  confirmedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  mentee?: {
    id: string;
    display_name: string;
    email: string;
    photo_url?: string;
  };
  financialInfo?: MenteeFinancialInfo;
}

export interface PaymentHistory {
  id: string;
  menteeFinancialInfoId: string;
  mentorshipId: string;
  menteeId: string;
  mentorId: string;
  amount: number;
  paymentType: PaymentType;
  installmentNumber?: number;
  paymentDate: string;
  confirmedAt: string;
  confirmedBy: string;
  reminderId?: string;
  notes?: string;
  createdAt: string;
  mentee?: {
    id: string;
    display_name: string;
    email: string;
    photo_url?: string;
  };
}

export interface MentorFinancialStats {
  totalMentees: number;
  activeMentees: number;
  expiredMentees: number;
  suspendedMentees: number;
  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  pendingReminders: number;
  overdueReminders: number;
  todayReminders: number;
  weekReminders: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
}

export interface CreateFinancialInfoPayload {
  menteeId: string;
  paymentType: PaymentType;
  paymentModality: PaymentModality;
  totalAmount: number;
  installments?: number;
  billingFrequency: BillingFrequency;
  customFrequencyDays?: number;
  startDate: string;
  expirationDate: string;
  notes?: string;
}

// Service
class MenteeFinancialService {
  private baseUrl = '/mentorship/financial';

  async getStats(): Promise<MentorFinancialStats> {
    const response = await fetchWithAuth(`${this.baseUrl}/stats`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async listMentees(filters?: {
    status?: MenteeStatus[];
    expiringDays?: number;
    search?: string;
  }): Promise<{ data: MenteeFinancialInfo[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters?.expiringDays) {
      params.append('expiringDays', filters.expiringDays.toString());
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    const url = `${this.baseUrl}/mentees${params.toString() ? `?${params}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return { data: data.data, total: data.total };
  }

  async saveFinancialInfo(
    mentorshipId: string,
    payload: CreateFinancialInfoPayload
  ): Promise<MenteeFinancialInfo> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${mentorshipId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async suspendMentee(mentorshipId: string, reason?: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${mentorshipId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async reactivateMentee(mentorshipId: string, newExpirationDate?: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${mentorshipId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ newExpirationDate }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async expireMentee(mentorshipId: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${mentorshipId}/expire`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async extendMentorship(
    mentorshipId: string,
    newExpirationDate: string,
    regenerateReminders: boolean = true
  ): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/mentees/${mentorshipId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ newExpirationDate, regenerateReminders }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  // Lembretes
  async listReminders(filters?: {
    status?: ReminderStatus[];
    startDate?: string;
    endDate?: string;
    menteeId?: string;
  }): Promise<{ data: BillingReminder[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.menteeId) params.append('menteeId', filters.menteeId);
    
    const url = `${this.baseUrl}/reminders${params.toString() ? `?${params}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return { data: data.data, total: data.total };
  }

  async getTodayReminders(): Promise<BillingReminder[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/today`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async getWeekReminders(): Promise<BillingReminder[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/week`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  async confirmPayment(reminderId: string, notes?: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/${reminderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async revertPayment(reminderId: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/${reminderId}/revert`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async cancelReminder(reminderId: string): Promise<void> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/${reminderId}/cancel`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  async updateReminderDate(reminderId: string, newDate: string): Promise<BillingReminder> {
    const response = await fetchWithAuth(`${this.baseUrl}/reminders/${reminderId}/date`, {
      method: 'PUT',
      body: JSON.stringify({ newDate }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // Histórico
  async getPaymentHistory(menteeId?: string, limit?: number): Promise<PaymentHistory[]> {
    const params = new URLSearchParams();
    if (menteeId) params.append('menteeId', menteeId);
    if (limit) params.append('limit', limit.toString());
    
    const url = `${this.baseUrl}/payments${params.toString() ? `?${params}` : ''}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}

export const menteeFinancialService = new MenteeFinancialService();
export default menteeFinancialService;
