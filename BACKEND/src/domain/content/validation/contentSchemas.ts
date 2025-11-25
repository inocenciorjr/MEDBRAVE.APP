// Schemas de validação para Conteúdo (Artigos)
// Implementação inicial - esqueleto
import { z } from 'zod';

export const createContentSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  author_id: z.string(),
  tags: z.array(z.string()).optional(),
  category_id: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  summary: z.string().optional(),
  is_public: z.boolean().optional(),
});

export const updateContentSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  category_id: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  summary: z.string().optional(),
  is_public: z.boolean().optional(),
});
