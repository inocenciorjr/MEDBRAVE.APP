export interface AdminUser {
  id: string;
  adminRole: 'admin' | 'superadmin';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface AdminAction {
  type: string;
  description: string;
  performedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AdminAuditLog {
  id: string;
  action: AdminAction;
  createdAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  reportedContent: number;
}
