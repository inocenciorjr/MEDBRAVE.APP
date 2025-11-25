import { z } from 'zod';

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'superadmin']),
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AdminActionSchema = z.object({
  type: z.string(),
  description: z.string(),
  performedBy: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export const AdminAuditLogSchema = z.object({
  id: z.string().uuid(),
  action: AdminActionSchema,
  createdAt: z.date(),
});

export const validateAdminUser = (data: unknown) => AdminUserSchema.parse(data);
export const validateAdminAction = (data: unknown) =>
  AdminActionSchema.parse(data);
export const validateAdminAuditLog = (data: unknown) =>
  AdminAuditLogSchema.parse(data);
