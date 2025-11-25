// Controller de Mídia
// Implementação inicial - esqueleto
import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/mediaService';
import {
  uploadMediaSchema,
  createMediaFolderSchema,
} from '../validation/mediaSchemas';
import { MediaType, MediaStatus } from '../types';
// import { File as MulterFile } from 'multer'; // Não existe exportação direta

const mediaService = new MediaService();

type MulterRequest = Request & { file?: Express.Multer.File };

export class MediaController {
  async uploadMedia(req: MulterRequest, res: Response, next: NextFunction) {
    try {
      console.log('📤 [Media Controller] Iniciando upload...');
      console.log(
        '📤 [Media Controller] req.file:',
        req.file ? 'Presente' : 'Ausente',
      );
      console.log('📤 [Media Controller] req.body:', req.body);

      if (!req.file) {
        console.log('❌ [Media Controller] Arquivo não enviado');
        return res.status(400).json({ error: 'Arquivo não enviado' });
      }

      console.log('📤 [Media Controller] Arquivo recebido:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      // Converter campos que vêm como string do FormData
      const bodyWithConversions = {
        ...req.body,
        size: req.body.size ? Number(req.body.size) : req.file.size,
        filename: req.body.filename || req.file.originalname,
        mimeType: req.body.mimeType || req.file.mimetype,
      };

      console.log(
        '📤 [Media Controller] Dados após conversão:',
        bodyWithConversions,
      );

      console.log('📤 [Media Controller] Validando com schema...');
      const parsed = uploadMediaSchema.parse(bodyWithConversions);
      console.log('📤 [Media Controller] Validação bem-sucedida:', parsed);

      const fileBuffer = req.file.buffer;
      console.log(
        '📤 [Media Controller] Buffer do arquivo:',
        fileBuffer ? `${fileBuffer.length} bytes` : 'Ausente',
      );

      // Garantir campos obrigatórios e conversão correta
      const data = {
        ...parsed,
        type: (req.body.type as MediaType) || 'image',
        originalFilename: req.file.originalname,
        status: (req.body.status as MediaStatus) || 'active',
        isPublic:
          req.body.isPublic !== undefined
            ? req.body.isPublic === 'true' || req.body.isPublic === true
            : true,
        userId: parsed.userId || 'anonymous',
      };

      console.log('📤 [Media Controller] Dados finais para o serviço:', data);
      console.log('📤 [Media Controller] Chamando mediaService.uploadMedia...');

      const media = await mediaService.uploadMedia(data, fileBuffer);

      console.log('✅ [Media Controller] Upload bem-sucedido:', media);
      res.status(201).json(media);
      return;
    } catch (error) {
      console.error('❌ [Media Controller] Erro capturado:', error);
      console.error('❌ [Media Controller] Tipo do erro:', typeof error);

      if (error instanceof Error) {
        console.error('❌ [Media Controller] Error.name:', error.name);
        console.error('❌ [Media Controller] Error.message:', error.message);
        console.error('❌ [Media Controller] Error.stack:', error.stack);
      }

      if (error instanceof Error && 'issues' in error) {
        console.log(
          '❌ [Media Controller] Erro de validação Zod:',
          error.issues,
        );
        res
          .status(400)
          .json({ error: 'Dados inválidos', details: error.issues });
        return;
      } else {
        console.log('❌ [Media Controller] Passando erro para next()');
        next(error);
        return;
      }
    }
  }

  async getMediaById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const media = await mediaService.getMediaById(id);
      if (!media) {
        return res.status(404).json({ error: 'Mídia não encontrada' });
      }
      res.json(media);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async updateMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = uploadMediaSchema.partial().parse(req.body);
      const updated = await mediaService.updateMedia(id, parsed);
      if (!updated) {
        return res.status(404).json({ error: 'Mídia não encontrada' });
      }
      res.json(updated);
      return;
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        res
          .status(400)
          .json({ error: 'Dados inválidos', details: error.issues });
        return;
      } else {
        next(error);
        return;
      }
    }
  }

  async deleteMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await mediaService.deleteMedia(id);
      res.status(204).send();
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async listMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, folderId, type, status, tags, limit } = req.query;
      const options: any = {
        userId,
        folderId,
        type,
        status,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        limit: limit ? Number(limit) : undefined,
      };
      const list = await mediaService.listMedia(options);
      res.json(list);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async createMediaFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createMediaFolderSchema.parse(req.body);
      const data = {
        ...parsed,
        isPublic: parsed.isPublic !== undefined ? parsed.isPublic : true,
        userId: parsed.userId || 'anonymous',
      };
      const folder = await mediaService.createMediaFolder(data);
      res.status(201).json(folder);
      return;
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        res
          .status(400)
          .json({ error: 'Dados inválidos', details: error.issues });
        return;
      } else {
        next(error);
        return;
      }
    }
  }

  async listMediaFolders(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, parentId, isPublic, limit } = req.query;
      const options: any = {
        userId,
        parentId,
        isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
        limit: limit ? Number(limit) : undefined,
      };
      const list = await mediaService.listMediaFolders(options);
      res.json(list);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }
}
