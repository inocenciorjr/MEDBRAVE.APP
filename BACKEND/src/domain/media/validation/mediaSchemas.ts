// Schemas de validação para Mídia
// Implementação inicial - esqueleto
import { z } from 'zod';

export const uploadMediaSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(1),
  userId: z.string(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const createMediaFolderSchema = z.object({
  name: z.string().min(1),
  userId: z.string(),
  parentId: z.string().optional(),
  isPublic: z.boolean().optional(),
});
