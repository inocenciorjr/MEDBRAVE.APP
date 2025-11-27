/**
 * Types for Admin Payment Management
 */

export type PaymentStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'CHARGEBACK'
  | 'FAILED';

export type PaymentMethod = 
  | 'CREDIT_CARD'
  | 'PIX'
  | 'ADMIN'
  | 'FREE'
  | 'BANK_SLIP'
  | 'OTHER';

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
  pixExpirationDate: string | null;
  cardLastFourDigits: string | null;
  cardBrand: string | null;
  installments: number | null;
  receiptUrl: string | null;
  failureReason: string | null;
  refundReason: string | null;
  chargebackReason: string | null;
  cancellationReason: string | null;
  processedAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  cancelledAt: string | null;
  chargebackAt: string | null;
  processedBy: string | null;
  refundedBy: string | null;
  refundTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: string;
    name: string;
  };
  coupon?: {
    id: string;
    code: string;
  };
}

export interface PaymentListOptions {
  userId?: string;
  planId?: string;
  status?: PaymentStatus | PaymentStatus[];
  paymentMethod?: PaymentMethod | PaymentMethod[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentListResult {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RefundPaymentPayload {
  reason: string;
  gatewayTransactionId?: string;
}

export interface CancelPaymentPayload {
  reason: string;
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

export interface PaymentDetails extends Payment {
  pixPayment?: {
    id: string;
    txid: string;
    qrCode: string;
    qrCodeUrl: string;
    copyPasteText: string;
    expirationDate: string;
    status: string;
  };
  creditCardPayment?: {
    id: string;
    transactionId: string | null;
    cardHolderName: string;
    cardLastFourDigits: string;
    cardBrand: string;
    installments: number;
    authorizationCode: string | null;
    nsu: string | null;
    acquirerName: string | null;
    status: string;
  };
}
