/**
 * Types for Admin Invoice Management
 */

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  metadata?: any;
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
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number;
  paymentId: string | null;
  notes: string | null;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    id: string;
    name: string;
    email: string;
  };
  payment?: {
    id: string;
    status: string;
    paymentMethod: string;
  };
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
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  metadata?: any;
}

export interface UpdateInvoicePayload {
  status?: InvoiceStatus;
  items?: Omit<InvoiceItem, 'subtotal'>[];
  discountAmount?: number;
  discountReason?: string;
  taxAmount?: number;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  paidAmount?: number;
  paymentId?: string;
  notes?: string;
  metadata?: any;
}

export interface InvoiceListOptions {
  userId?: string;
  status?: InvoiceStatus;
  userPlanId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface InvoiceListResult {
  items: Invoice[];
  cursor: string | null;
  hasMore: boolean;
}

export interface MarkInvoiceAsPaidPayload {
  paidAmount: number;
  paymentId?: string;
  paidAt?: string;
}
