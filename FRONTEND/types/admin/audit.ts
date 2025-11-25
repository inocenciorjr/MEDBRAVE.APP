/**
 * Audit log types for admin monitoring
 */

export interface AdminAction {
  type: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  action: AdminAction;
  createdAt: string;
}

export type AuditLogSortField = 'createdAt' | 'actionType' | 'performedBy';
