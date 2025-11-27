/**
 * Admin Payment Service
 * Handles all payment management operations for administrators
 */

import { get, post, buildQueryString } from './baseService';
import type {
  Payment,
  PaymentDetails,
  PaymentListOptions,
  PaymentListResult,
  RefundPaymentPayload,
  CancelPaymentPayload,
  PaymentStatistics,
  PaymentStatus,
  PaymentMethod,
} from '@/types/admin/payment';

/**
 * Get all payments with optional filters
 * @param options Filter options
 * @returns List of payments with pagination info
 */
export async function getAllPayments(options?: PaymentListOptions): Promise<PaymentListResult> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: Payment[]; meta: any }>(
    `/api/payments${queryString}`
  );
  
  return {
    items: response.data,
    total: response.meta?.total || response.data.length,
    page: response.meta?.page || 1,
    limit: response.meta?.limit || options?.limit || 100,
    totalPages: response.meta?.totalPages || 1,
  };
}

/**
 * Get payment by ID with full details
 * @param id Payment ID
 * @returns Payment details including PIX/card info
 */
export async function getPaymentById(id: string): Promise<PaymentDetails> {
  const response = await get<{ success: boolean; data: PaymentDetails }>(
    `/api/payments/${id}`
  );
  return response.data;
}

/**
 * Get payments for a specific user
 * @param userId User ID
 * @param options Additional filter options
 * @returns List of payments
 */
export async function getPaymentsByUserId(
  userId: string,
  options?: Omit<PaymentListOptions, 'userId'>
): Promise<PaymentListResult> {
  return getAllPayments({ ...options, userId });
}

/**
 * Refund a payment (admin only)
 * @param id Payment ID
 * @param payload Refund data
 * @returns Updated payment
 */
export async function refundPayment(
  id: string,
  payload: RefundPaymentPayload
): Promise<Payment> {
  const response = await post<{ success: boolean; data: Payment }>(
    `/api/payments/${id}/refund`,
    payload
  );
  return response.data;
}

/**
 * Cancel a payment
 * @param id Payment ID
 * @param payload Cancellation data
 * @returns Updated payment
 */
export async function cancelPayment(
  id: string,
  payload: CancelPaymentPayload
): Promise<Payment> {
  const response = await post<{ success: boolean; data: Payment }>(
    `/api/payments/${id}/cancel`,
    payload
  );
  return response.data;
}

/**
 * Get payment statistics
 * Note: This might need to be implemented in the backend
 * For now, calculates stats from fetched payments
 * @param options Filter options for stats calculation
 * @returns Payment statistics
 */
export async function getPaymentStats(
  options?: PaymentListOptions
): Promise<PaymentStatistics> {
  const result = await getAllPayments(options);
  const payments = result.items;
  
  const stats: PaymentStatistics = {
    totalPayments: payments.length,
    totalAmount: 0,
    approvedPayments: 0,
    approvedAmount: 0,
    rejectedPayments: 0,
    refundedPayments: 0,
    refundedAmount: 0,
    cancelledPayments: 0,
    paymentsByMethod: {},
    paymentsByStatus: {},
    paymentsByDay: {},
  };
  
  payments.forEach(payment => {
    stats.totalAmount += payment.amount;
    
    // By status
    if (payment.status === 'APPROVED') {
      stats.approvedPayments++;
      stats.approvedAmount += payment.amount;
    } else if (payment.status === 'REJECTED') {
      stats.rejectedPayments++;
    } else if (payment.status === 'REFUNDED') {
      stats.refundedPayments++;
      stats.refundedAmount += payment.amount;
    } else if (payment.status === 'CANCELLED') {
      stats.cancelledPayments++;
    }
    
    // By method
    if (!stats.paymentsByMethod[payment.paymentMethod]) {
      stats.paymentsByMethod[payment.paymentMethod] = { count: 0, amount: 0 };
    }
    stats.paymentsByMethod[payment.paymentMethod]!.count++;
    stats.paymentsByMethod[payment.paymentMethod]!.amount += payment.amount;
    
    // By status
    if (!stats.paymentsByStatus[payment.status]) {
      stats.paymentsByStatus[payment.status] = { count: 0, amount: 0 };
    }
    stats.paymentsByStatus[payment.status]!.count++;
    stats.paymentsByStatus[payment.status]!.amount += payment.amount;
    
    // By day
    const day = payment.createdAt.split('T')[0];
    if (!stats.paymentsByDay[day]) {
      stats.paymentsByDay[day] = { count: 0, amount: 0 };
    }
    stats.paymentsByDay[day].count++;
    stats.paymentsByDay[day].amount += payment.amount;
  });
  
  return stats;
}

/**
 * Get payments by status
 * @param status Payment status
 * @returns List of payments
 */
export async function getPaymentsByStatus(status: PaymentStatus): Promise<Payment[]> {
  const result = await getAllPayments({ status });
  return result.items;
}

/**
 * Get payments by method
 * @param method Payment method
 * @returns List of payments
 */
export async function getPaymentsByMethod(method: PaymentMethod): Promise<Payment[]> {
  const result = await getAllPayments({ paymentMethod: method });
  return result.items;
}

/**
 * Get pending payments
 * @returns List of pending payments
 */
export async function getPendingPayments(): Promise<Payment[]> {
  return getPaymentsByStatus('PENDING');
}

/**
 * Get approved payments
 * @returns List of approved payments
 */
export async function getApprovedPayments(): Promise<Payment[]> {
  return getPaymentsByStatus('APPROVED');
}

/**
 * Get failed payments
 * @returns List of failed/rejected payments
 */
export async function getFailedPayments(): Promise<Payment[]> {
  const rejected = await getPaymentsByStatus('REJECTED');
  const failed = await getPaymentsByStatus('FAILED');
  return [...rejected, ...failed];
}

/**
 * Get payments by date range
 * @param startDate Start date (ISO string)
 * @param endDate End date (ISO string)
 * @returns List of payments
 */
export async function getPaymentsByDateRange(
  startDate: string,
  endDate: string
): Promise<Payment[]> {
  const result = await getAllPayments({ startDate, endDate });
  return result.items;
}

/**
 * Get recent payments
 * @param limit Number of payments to fetch
 * @returns List of recent payments
 */
export async function getRecentPayments(limit: number = 10): Promise<Payment[]> {
  const result = await getAllPayments({ limit, sortBy: 'createdAt', sortOrder: 'desc' });
  return result.items;
}

/**
 * Search payments by user email or transaction ID
 * @param query Search query
 * @returns List of matching payments
 */
export async function searchPayments(query: string): Promise<Payment[]> {
  const result = await getAllPayments();
  const lowerQuery = query.toLowerCase();
  
  return result.items.filter(p => 
    p.user?.email?.toLowerCase().includes(lowerQuery) ||
    p.user?.name?.toLowerCase().includes(lowerQuery) ||
    p.externalId?.toLowerCase().includes(lowerQuery) ||
    p.externalReference?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Export payments to CSV
 * Note: This is a client-side implementation
 * For large datasets, consider implementing server-side export
 * @param payments Payments to export
 * @returns CSV string
 */
export function exportPaymentsToCSV(payments: Payment[]): string {
  const headers = [
    'ID',
    'Data',
    'Usuário',
    'Plano',
    'Valor',
    'Método',
    'Status',
    'Cupom',
  ];
  
  const rows = payments.map(p => [
    p.id,
    new Date(p.createdAt).toLocaleString('pt-BR'),
    p.user?.email || p.userId,
    p.plan?.name || p.planId,
    `${p.currency} ${p.amount.toFixed(2)}`,
    p.paymentMethod,
    p.status,
    p.coupon?.code || '-',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}

/**
 * Download payments as CSV file
 * @param payments Payments to download
 * @param filename Filename for the download
 */
export function downloadPaymentsCSV(payments: Payment[], filename: string = 'payments.csv'): void {
  const csv = exportPaymentsToCSV(payments);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format payment amount
 * @param payment Payment
 * @returns Formatted amount string
 */
export function formatPaymentAmount(payment: Payment): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: payment.currency,
  }).format(payment.amount);
}

/**
 * Get payment status color
 * @param status Payment status
 * @returns Color name
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    PENDING: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    REFUNDED: 'purple',
    CANCELLED: 'gray',
    CHARGEBACK: 'red',
    FAILED: 'red',
  };
  
  return colors[status] || 'gray';
}

/**
 * Get payment method icon
 * @param method Payment method
 * @returns Icon name (Material Symbols)
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    CREDIT_CARD: 'credit_card',
    PIX: 'pix',
    ADMIN: 'admin_panel_settings',
    FREE: 'card_giftcard',
    BANK_SLIP: 'receipt',
    OTHER: 'payments',
  };
  
  return icons[method] || 'payments';
}
