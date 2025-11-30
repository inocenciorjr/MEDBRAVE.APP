// Removed Firebase dependency - using native Date type

// --- Payment Enums ---

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX',
  ADMIN = 'ADMIN',
  FREE = 'FREE',
  BANK_SLIP = 'BANK_SLIP',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
  CHARGEBACK = 'CHARGEBACK',
  FAILED = 'FAILED',
}

export enum CreditCardPaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  CHARGEBACK = 'chargeback',
}

export enum PixStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PixKeyType {
  CPF = 'cpf',
  CNPJ = 'cnpj',
  EMAIL = 'email',
  PHONE = 'phone',
  RANDOM = 'random',
}

export enum PaymentNotificationType {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_CHARGEBACK = 'PAYMENT_CHARGEBACK',
  PAYMENT_STATUS_UPDATED = 'PAYMENT_STATUS_UPDATED',
}

export enum UserPlanStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum PlanInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

// --- Payment Interfaces ---

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  userPlanId: string | null;
  invoiceId: string | null;
  couponId: string | null;
  originalAmount: number;
  discountAmount: number;
  amount: number;
  currency: string;
  description: string | null;
  paymentMethod: PaymentMethod;
  paymentMethodDetails: any | null;
  status: PaymentStatus;
  externalId: string | null;
  externalReference: string | null;
  transactionData: any | null;
  metadata: any | null;
  pixCode: string | null;
  pixExpirationDate: Date | null;
  cardLastFourDigits: string | null;
  cardBrand: string | null;
  installments: number | null;
  receiptUrl: string | null;
  failureReason: string | null;
  refundReason: string | null;
  chargebackReason: string | null;
  cancellationReason: string | null;
  processedAt: Date | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  cancelledAt: Date | null;
  chargebackAt: Date | null;
  processedBy: string | null;
  refundedBy: string | null;
  refundTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardPayment {
  id: string;
  paymentId: string;
  transactionId: string | null;
  cardHolderName: string;
  cardLastFourDigits: string;
  cardBrand: string;
  installments: number;
  authorizationCode: string | null;
  nsu: string | null;
  acquirerName: string | null;
  paymentMethodId: string | null;
  statementDescriptor: string | null;
  gatewayResponse: Record<string, any> | null;
  errorCode: string | null;
  errorMessage: string | null;
  refundId: string | null;
  refundAmount: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PixPayment {
  id: string;
  paymentId: string;
  txid: string;
  qrCode: string;
  qrCodeUrl: string;
  copyPasteText: string;
  expirationDate: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  expirationDate?: Date | null;
  maxUses?: number | null;
  timesUsed: number;
  isActive: boolean;
  applicablePlanIds?: string[] | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentNotification {
  id: string;
  paymentId?: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  relatedId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  // Questões
  maxQuestionsPerDay: number | null; // null = ilimitado
  maxQuestionListsPerDay: number | null;
  maxSimulatedExamsPerMonth: number | null;

  // FSRS/SRS
  maxFSRSCards: number | null;
  maxReviewsPerDay: number | null;

  // Flashcards
  maxFlashcardsCreated: number | null;
  maxFlashcardDecks: number | null;

  // IA Features
  maxPulseAIQueriesPerDay: number | null;
  maxQuestionExplanationsPerDay: number | null;
  maxContentGenerationPerMonth: number | null;

  // Funcionalidades Premium
  canExportData: boolean;
  canCreateCustomLists: boolean;
  canAccessAdvancedStatistics: boolean;
  canUseErrorNotebook: boolean;
  canAccessMentorship: boolean;
  canUseOfflineMode: boolean;
  canCustomizeInterface: boolean;

  // Suporte
  supportLevel: 'basic' | 'priority' | 'premium';
  maxSupportTicketsPerMonth: number | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  features: string[];
  interval?: PlanInterval;
  isPublic?: boolean;
  metadata?: Record<string, any> | null;

  // Novos campos para limites
  limits: PlanLimits;
  badge?: string; // "POPULAR", "MELHOR CUSTO-BENEFÍCIO", etc.
  highlight?: boolean; // Destacar na interface

  createdAt: Date;
  updatedAt: Date;
}

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: UserPlanStatus;
  lastPaymentId: string | null;
  paymentMethod: PaymentMethod;
  autoRenew: boolean;
  metadata?: Record<string, any> | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  nextBillingDate: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userPlanId: string | null;
  status: InvoiceStatus;
  items: InvoiceItem[];
  totalAmount: number;
  discountAmount: number;
  discountReason: string | null;
  netAmount: number;
  taxAmount: number;
  issueDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  paidAmount: number;
  paymentId: string | null;
  notes: string | null;
  metadata: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  metadata?: any;
}

// --- Payload Types ---

export interface CreatePaymentPayload {
  userId: string;
  planId: string;
  userPlanId?: string;
  amount: number;
  currency?: string;
  description?: string;
  paymentMethod: PaymentMethod;
  paymentMethodDetails?: any;
  couponId?: string;
  metadata?: any;
  originalAmount?: number;
  discountAmount?: number;
}

export interface CreateCreditCardPaymentPayload {
  paymentId: string;
  cardHolderName: string;
  cardLastFourDigits: string;
  cardBrand: string;
  installments: number;
  paymentMethodId?: string;
  statementDescriptor?: string;
}

export interface CreatePixPaymentPayload {
  paymentId: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  expirationHours?: number;
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  expirationDate?: Date;
  maxUses?: number;
  isActive?: boolean;
  applicablePlanIds?: string[];
  createdBy: string;
}

export interface CreatePlanPayload {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive?: boolean;
  features: string[];
  interval?: PlanInterval;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  limits?: PlanLimits;
}

export interface CreateUserPlanPayload {
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  lastPaymentId?: string;
  paymentMethod: PaymentMethod;
  autoRenew?: boolean;
  status?: UserPlanStatus;
  metadata?: Record<string, any>;
  trialEndsAt?: Date;
}

export interface CreatePaymentNotificationPayload {
  paymentId?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  metadata?: Record<string, any>;
}

// --- Result Types ---

export interface PaymentProcessResult {
  success: boolean;
  payment: Payment;
  pixQrCode?: string;
  pixCopiaECola?: string;
  expirationDate?: Date;
  userPlan?: any;
  error?: string;
}

export interface PaymentListOptions {
  status?: PaymentStatus | PaymentStatus[];
  paymentMethod?: PaymentMethod | PaymentMethod[];
  userId?: string;
  planId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentListResult {
  items: Payment[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlanListOptions {
  isActive?: boolean;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PlanListResult {
  items: Plan[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserPlanListOptions {
  userId?: string;
  planId?: string;
  status?: UserPlanStatus | UserPlanStatus[];
  active?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserPlanListResult {
  items: UserPlan[];
  total: number;
  limit: number;
  offset: number;
}

export interface CouponListOptions {
  isActive?: boolean;
  code?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  errorCode?: string;
  errorMessage?: string;
  discountAmount?: number;
  discountPercentage?: number;
  finalPrice?: number;
}

export interface ExpiredPlansCheckResult {
  processedCount: number;
  expiredCount: number;
  error?: string;
}

export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  name: string;
  description?: string;
  isEnabled: boolean;
  requiresRedirect: boolean;
  supportsInstallments: boolean;
  maxInstallments?: number;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  approvedPayments: number;
  approvedAmount: number;
  rejectedPayments: number;
  refundedPayments: number;
  refundedAmount: number;
  cancelledPayments: number;
  paymentsByMethod: {
    [key in PaymentMethod]?: {
      count: number;
      amount: number;
    };
  };
  paymentsByStatus: {
    [key in PaymentStatus]?: {
      count: number;
      amount: number;
    };
  };
  paymentsByDay: {
    [date: string]: {
      count: number;
      amount: number;
    };
  };
}

export interface UpdatePaymentPayload {
  status?: PaymentStatus;
  description?: string;
  paymentMethodDetails?: any;
  externalId?: string;
  externalReference?: string;
  transactionData?: any;
  pixCode?: string;
  pixExpirationDate?: Date;
  cardLastFourDigits?: string;
  cardBrand?: string;
  installments?: number;
  receiptUrl?: string;
  failureReason?: string;
  refundReason?: string;
  chargebackReason?: string;
  cancellationReason?: string;
  processedAt?: Date;
  paidAt?: Date;
  refundedAt?: Date;
  cancelledAt?: Date;
  chargebackAt?: Date;
  processedBy?: string;
  metadata?: any;
  refundedBy?: string;
  refundTransactionId?: string;
}

export interface ListPaymentsOptions {
  userId?: string;
  planId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
  startAfter?: string;
}

export interface PaginatedPaymentsResult {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPageStartAfter?: string;
}

export interface CreateInvoicePayload {
  userId: string;
  userPlanId?: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  items: Omit<InvoiceItem, 'subtotal'>[];
  discountAmount?: number;
  discountReason?: string;
  taxAmount?: number;
  issueDate?: Date;
  dueDate?: Date;
  notes?: string;
  metadata?: any;
}

export interface UpdateInvoicePayload {
  status?: InvoiceStatus;
  items?: Omit<InvoiceItem, 'subtotal'>[];
  discountAmount?: number;
  discountReason?: string;
  taxAmount?: number;
  issueDate?: Date;
  dueDate?: Date;
  paidAt?: Date;
  paidAmount?: number;
  paymentId?: string;
  notes?: string;
  metadata?: any;
}

export interface ListInvoicesOptions {
  status?: InvoiceStatus;
  userPlanId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedInvoicesResult {
  items: Invoice[];
  cursor: string | null;
  hasMore: boolean;
}

export interface UpdateUserPlanPayload {
  startDate?: Date | null;
  endDate?: Date | null;
  status?: UserPlanStatus;
  lastPaymentId?: string | null;
  paymentMethod?: PaymentMethod;
  autoRenew?: boolean;
  metadata?: Record<string, any> | null;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  nextBillingDate?: Date | null;
  trialEndsAt?: Date | null;
  lastRenewalAt?: Date | null;
}
