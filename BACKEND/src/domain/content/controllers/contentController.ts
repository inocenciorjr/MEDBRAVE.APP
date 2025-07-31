// Controller de Conteúdo (Artigos)
// Implementação inicial - esqueleto
import { Request, Response, NextFunction } from 'express';
import { ContentService } from '../services/contentService';
import { createContentSchema, updateContentSchema } from '../validation/contentSchemas';

const contentService = new ContentService();

export class ContentController {
  async createContent(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createContentSchema.parse(req.body);
      // Garantir que status e isPublic sempre sejam definidos
      const data = {
        ...parsed,
        status: parsed.status ?? 'DRAFT',
        isPublic: parsed.isPublic ?? true,
      };
      const content = await contentService.createContent(data);
      res.status(201).json(content);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: 'Dados inválidos', details: error.issues });
      } else {
        next(error);
      }
    }
  }

  async getContentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const content = await contentService.getContentById(id);
      if (!content) {
        return res.status(404).json({ error: 'Artigo não encontrado' });
      }
      return res.json(content);
    } catch (error) {
      return next(error);
    }
  }

  async updateContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateContentSchema.parse(req.body);
      const updated = await contentService.updateContent(id, parsed);
      if (!updated) {
        return res.status(404).json({ error: 'Artigo não encontrado' });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
      } else {
        return next(error);
      }
    }
  }

  async deleteContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await contentService.deleteContent(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, page, status, categoryId, authorId, tags } = req.query;
      const options: any = {
        limit: limit ? Number(limit) : undefined,
        page: page ? Number(page) : undefined,
        status,
        categoryId,
        authorId,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      };
      const list = await contentService.listContent(options);
      res.json(list);
    } catch (error) {
      next(error);
    }
  }
}
