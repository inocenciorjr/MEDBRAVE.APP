/**
 * Admin Invoice Service
 * Handles all invoice management operations for administrators
 */

import { get, post, put, buildQueryString } from './baseService';
import type {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceListOptions,
  InvoiceListResult,
  MarkInvoiceAsPaidPayload,
  InvoiceStatus,
} from '@/types/admin/invoice';

/**
 * Get all invoices with optional filters
 * @param options Filter options
 * @returns List of invoices with pagination info
 */
export async function getAllInvoices(options?: InvoiceListOptions): Promise<InvoiceListResult> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: Invoice[]; cursor: string | null; hasMore: boolean }>(
    `/invoices${queryString}`
  );
  
  return {
    items: response.data,
    cursor: response.cursor,
    hasMore: response.hasMore,
  };
}

/**
 * Get invoice by ID
 * @param id Invoice ID
 * @returns Invoice details
 */
export async function getInvoiceById(id: string): Promise<Invoice> {
  const response = await get<{ success: boolean; data: Invoice }>(
    `/invoices/${id}`
  );
  return response.data;
}

/**
 * Get invoices for a specific user
 * @param userId User ID
 * @param options Additional filter options
 * @returns List of invoices
 */
export async function getInvoicesByUserId(
  userId: string,
  options?: Omit<InvoiceListOptions, 'userId'>
): Promise<InvoiceListResult> {
  return getAllInvoices({ ...options, userId });
}

/**
 * Create a new invoice
 * @param data Invoice data
 * @returns Created invoice
 */
export async function createInvoice(data: CreateInvoicePayload): Promise<Invoice> {
  const response = await post<{ success: boolean; data: Invoice }>(
    '/invoices',
    data
  );
  return response.data;
}

/**
 * Update an existing invoice
 * @param id Invoice ID
 * @param data Updated invoice data
 * @returns Updated invoice
 */
export async function updateInvoice(id: string, data: UpdateInvoicePayload): Promise<Invoice> {
  const response = await put<{ success: boolean; data: Invoice }>(
    `/invoices/${id}`,
    data
  );
  return response.data;
}

/**
 * Mark invoice as paid
 * @param id Invoice ID
 * @param payload Payment data
 * @returns Updated invoice
 */
export async function markInvoiceAsPaid(
  id: string,
  payload: MarkInvoiceAsPaidPayload
): Promise<Invoice> {
  const response = await post<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/mark-paid`,
    payload
  );
  return response.data;
}

/**
 * Get invoices by status
 * @param status Invoice status
 * @returns List of invoices
 */
export async function getInvoicesByStatus(status: InvoiceStatus): Promise<Invoice[]> {
  const result = await getAllInvoices({ status });
  return result.items;
}

/**
 * Get pending invoices
 * @returns List of pending invoices
 */
export async function getPendingInvoices(): Promise<Invoice[]> {
  return getInvoicesByStatus('PENDING');
}

/**
 * Get paid invoices
 * @returns List of paid invoices
 */
export async function getPaidInvoices(): Promise<Invoice[]> {
  return getInvoicesByStatus('PAID');
}

/**
 * Get overdue invoices
 * @returns List of overdue invoices
 */
export async function getOverdueInvoices(): Promise<Invoice[]> {
  return getInvoicesByStatus('OVERDUE');
}

/**
 * Get invoices by date range
 * @param startDate Start date (ISO string)
 * @param endDate End date (ISO string)
 * @returns List of invoices
 */
export async function getInvoicesByDateRange(
  startDate: string,
  endDate: string
): Promise<Invoice[]> {
  const result = await getAllInvoices({ startDate, endDate });
  return result.items;
}

/**
 * Get recent invoices
 * @param limit Number of invoices to fetch
 * @returns List of recent invoices
 */
export async function getRecentInvoices(limit: number = 10): Promise<Invoice[]> {
  const result = await getAllInvoices({ limit, orderBy: 'createdAt', orderDirection: 'desc' });
  return result.items;
}

/**
 * Search invoices by invoice number or user email
 * @param query Search query
 * @returns List of matching invoices
 */
export async function searchInvoices(query: string): Promise<Invoice[]> {
  const result = await getAllInvoices();
  const lowerQuery = query.toLowerCase();
  
  return result.items.filter(i => 
    i.invoiceNumber.toLowerCase().includes(lowerQuery) ||
    i.user?.email?.toLowerCase().includes(lowerQuery) ||
    i.user?.name?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get invoice statistics
 * @param options Filter options for stats calculation
 * @returns Invoice statistics
 */
export async function getInvoiceStats(options?: InvoiceListOptions): Promise<{
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}> {
  const result = await getAllInvoices(options);
  const invoices = result.items;
  
  return {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    cancelled: invoices.filter(i => i.status === 'CANCELLED').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.netAmount, 0),
    paidAmount: invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.paidAmount, 0),
    pendingAmount: invoices
      .filter(i => i.status === 'PENDING')
      .reduce((sum, i) => sum + i.netAmount, 0),
  };
}

/**
 * Generate invoice PDF
 * Note: This should be implemented in the backend
 * This is a placeholder that would trigger the backend endpoint
 * @param id Invoice ID
 * @returns PDF URL or blob
 */
export async function generateInvoicePDF(id: string): Promise<string> {
  // This would call a backend endpoint that generates the PDF
  // For now, return a placeholder
  throw new Error('PDF generation not implemented yet');
}

/**
 * Send invoice by email
 * Note: This should be implemented in the backend
 * @param id Invoice ID
 * @param email Email address (optional, uses invoice user email if not provided)
 */
export async function sendInvoiceByEmail(id: string, email?: string): Promise<void> {
  // This would call a backend endpoint that sends the email
  throw new Error('Email sending not implemented yet');
}

/**
 * Export invoices to CSV
 * @param invoices Invoices to export
 * @returns CSV string
 */
export function exportInvoicesToCSV(invoices: Invoice[]): string {
  const headers = [
    'Número',
    'Data Emissão',
    'Data Vencimento',
    'Usuário',
    'Status',
    'Valor Total',
    'Desconto',
    'Valor Líquido',
    'Data Pagamento',
  ];
  
  const rows = invoices.map(i => [
    i.invoiceNumber,
    new Date(i.issueDate).toLocaleDateString('pt-BR'),
    i.dueDate ? new Date(i.dueDate).toLocaleDateString('pt-BR') : '-',
    i.user?.email || i.userId,
    i.status,
    `${i.totalAmount.toFixed(2)}`,
    `${i.discountAmount.toFixed(2)}`,
    `${i.netAmount.toFixed(2)}`,
    i.paidAt ? new Date(i.paidAt).toLocaleDateString('pt-BR') : '-',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}

/**
 * Download invoices as CSV file
 * @param invoices Invoices to download
 * @param filename Filename for the download
 */
export function downloadInvoicesCSV(invoices: Invoice[], filename: string = 'invoices.csv'): void {
  const csv = exportInvoicesToCSV(invoices);
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
 * Format invoice amount
 * @param invoice Invoice
 * @returns Formatted amount string
 */
export function formatInvoiceAmount(invoice: Invoice): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL', // Assuming BRL, should come from invoice
  }).format(invoice.netAmount);
}

/**
 * Get invoice status color
 * @param status Invoice status
 * @returns Color name
 */
export function getInvoiceStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    PENDING: 'orange',
    PAID: 'green',
    OVERDUE: 'red',
    CANCELLED: 'gray',
  };
  
  return colors[status] || 'gray';
}

/**
 * Check if invoice is overdue
 * @param invoice Invoice
 * @returns True if overdue
 */
export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
    return false;
  }
  
  if (!invoice.dueDate) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  
  return now > dueDate;
}

/**
 * Calculate invoice total from items
 * @param items Invoice items
 * @returns Total amount
 */
export function calculateInvoiceTotal(
  items: Array<{ quantity: number; unitPrice: number }>
): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}
