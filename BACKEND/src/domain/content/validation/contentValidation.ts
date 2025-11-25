import { z } from 'zod';
import { ContentStatus } from '../types';

/**
 * Schema para validação na criação de conteúdo
 */
export const createContentSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter pelo menos 3 caracteres')
    .max(150, 'O título não deve exceder 150 caracteres'),
  content: z.string().min(10, 'O conteúdo deve ter pelo menos 10 caracteres'),
  authorId: z.string().min(1, 'O autor é obrigatório'),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  status: z
    .enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as [
      ContentStatus,
      ...ContentStatus[],
    ])
    .optional()
    .default('DRAFT'),
  summary: z
    .string()
    .max(500, 'O resumo não deve exceder 500 caracteres')
    .optional(),
  isPublic: z.boolean().optional().default(false),
  imageUrl: z.string().url('A URL da imagem é inválida').optional(),
});

/**
 * Schema para validação na atualização de conteúdo
 */
export const updateContentSchema = createContentSchema
  .partial()
  .omit({ authorId: true });

/**
 * Schema para validação na criação de categoria
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(50, 'O nome não deve exceder 50 caracteres'),
  description: z
    .string()
    .max(200, 'A descrição não deve exceder 200 caracteres')
    .optional(),
  parentId: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url('A URL da imagem é inválida').optional(),
});

/**
 * Schema para validação na atualização de categoria
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * Schema para validação na criação de comentário
 */
export const createCommentSchema = z.object({
  contentId: z.string().min(1, 'O ID do conteúdo é obrigatório'),
  authorId: z.string().min(1, 'O autor é obrigatório'),
  text: z
    .string()
    .min(1, 'O texto é obrigatório')
    .max(1000, 'O comentário não deve exceder 1000 caracteres'),
  parentId: z.string().optional(),
});

/**
 * Schema para validação na atualização de comentário
 */
export const updateCommentSchema = z.object({
  text: z
    .string()
    .min(1, 'O texto é obrigatório')
    .max(1000, 'O comentário não deve exceder 1000 caracteres')
    .optional(),
  isDeleted: z.boolean().optional(),
});

/**
 * Schema para validação na criação de like
 */
export const createLikeSchema = z.object({
  contentId: z.string().min(1, 'O ID do conteúdo é obrigatório'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório'),
});

/**
 * Schema para validação de parâmetros de consulta
 */
export const contentQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  status: z
    .enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as [
      ContentStatus,
      ...ContentStatus[],
    ])
    .optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => (typeof val === 'string' ? val.split(',') : val)),
  searchTerm: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'commentCount'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
