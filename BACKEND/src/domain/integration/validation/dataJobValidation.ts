import { z } from 'zod';
import { DataJobType, DataFormat } from '../types';

/**
 * Schema para validação de criação de job de dados
 */
export const createDataJobSchema = z.object({
  type: z.enum([DataJobType.IMPORT, DataJobType.EXPORT], {
    errorMap: () => ({ message: 'Tipo deve ser import ou export' }),
  }),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  collection: z.string().min(1, 'Coleção é obrigatória'),
  format: z.enum([DataFormat.JSON, DataFormat.CSV, DataFormat.EXCEL], {
    errorMap: () => ({ message: 'Formato deve ser json, csv ou excel' }),
  }),
  query: z.record(z.any()).optional(),
  mappings: z.record(z.string()).optional(),
  sourceUrl: z.string().url('URL de origem inválida').optional().nullable(),
});

/**
 * Schema para validação de atualização de status de job
 */
export const updateDataJobStatusSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  totalRecords: z.number().min(0).optional(),
  processedRecords: z.number().min(0).optional(),
  resultUrl: z.string().url('URL de resultado inválida').optional(),
  error: z.string().optional(),
});

/**
 * Schema para validação de parâmetros de listagem de jobs
 */
export const getDataJobsSchema = z.object({
  type: z.enum([DataJobType.IMPORT, DataJobType.EXPORT]).optional(),
  status: z.string().optional(),
  collection: z.string().optional(),
  createdBy: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined)),
  offset: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined)),
  orderByCreatedAt: z.enum(['asc', 'desc']).optional(),
});
