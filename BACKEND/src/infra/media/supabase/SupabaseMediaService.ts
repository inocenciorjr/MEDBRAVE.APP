import {
  MediaFile,
  MediaFolder,
  MediaType,
  MediaStatus,
} from '../../../domain/media/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../config/supabase';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../../utils/logger';

export class SupabaseMediaService {
  private FILES_TABLE = 'media_files';
  private FOLDERS_TABLE = 'media_folders';
  private STORAGE_BUCKET = 'media';
  private LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  constructor() {
    // Criar diretório de uploads local se não existir
    if (!fs.existsSync(this.LOCAL_UPLOAD_DIR)) {
      fs.mkdirSync(this.LOCAL_UPLOAD_DIR, { recursive: true });
    }
  }

  async uploadMedia(
    data: Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'url'>,
    fileBuffer: Buffer,
  ): Promise<MediaFile> {
    const now = new Date();
    const id = uuidv4();

    // Sanitizar nome do arquivo para evitar problemas de URL
    const sanitizedFilename = data.filename
      .replace(/[()[\]{}]/g, '') // Remove parênteses, colchetes, chaves
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove caracteres especiais exceto ponto, underscore e hífen
      .toLowerCase(); // Converte para minúsculas

    logger.info('Iniciando upload de mídia', {
      originalFilename: data.filename,
      sanitizedFilename,
      size: data.size,
    });

    try {
      // Upload para Supabase Storage
      const storagePath = `${data.userId}/${id}_${sanitizedFilename}`;

      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: data.mimeType,
          upsert: false,
        });

      if (uploadError) {
        logger.error('Erro no upload para Supabase Storage', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      logger.info('Upload para Supabase Storage concluído', {
        storagePath,
        publicUrl,
      });

      // Salvar metadados no banco
      const mediaFile: Omit<MediaFile, 'id'> = {
        ...data,
        filename: sanitizedFilename,
        url: publicUrl,
        createdAt: now,
        updatedAt: now,
      };

      const { data: insertData, error: insertError } = await supabase
        .from(this.FILES_TABLE)
        .insert([{ id, ...mediaFile }])
        .select()
        .single();

      if (insertError) {
        logger.error('Erro ao salvar metadados no banco', insertError);
        // Tentar remover arquivo do storage em caso de erro
        await supabase.storage.from(this.STORAGE_BUCKET).remove([storagePath]);
        throw new Error(`Erro ao salvar metadados: ${insertError.message}`);
      }

      logger.info('Mídia salva com sucesso', {
        id,
        filename: sanitizedFilename,
      });
      return insertData as MediaFile;
    } catch (error) {
      logger.error('Erro geral no upload de mídia', error);

      // Fallback para armazenamento local
      const localPath = path.join(
        this.LOCAL_UPLOAD_DIR,
        `${id}_${sanitizedFilename}`,
      );
      fs.writeFileSync(localPath, fileBuffer);

      const localUrl = `/uploads/${id}_${sanitizedFilename}`;

      const mediaFile: MediaFile = {
        id,
        ...data,
        filename: sanitizedFilename,
        url: localUrl,
        createdAt: now,
        updatedAt: now,
      };

      // Tentar salvar no banco mesmo com storage local
      try {
        const { data: insertData, error: insertError } = await supabase
          .from(this.FILES_TABLE)
          .insert([mediaFile])
          .select()
          .single();

        if (insertError) {
          logger.error(
            'Erro ao salvar metadados com storage local',
            insertError,
          );
          throw new Error(`Erro ao salvar metadados: ${insertError.message}`);
        }

        logger.info('Mídia salva com storage local', { id, localPath });
        return insertData as MediaFile;
      } catch (dbError) {
        logger.error('Erro crítico ao salvar mídia', dbError);
        throw error;
      }
    }
  }

  async getMediaById(id: string): Promise<MediaFile | null> {
    try {
      const { data, error } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        logger.error('Erro ao buscar mídia por ID', error);
        throw new Error(`Erro ao buscar mídia: ${error.message}`);
      }

      return data as MediaFile;
    } catch (error) {
      logger.error('Erro geral ao buscar mídia por ID', error);
      throw error;
    }
  }

  async updateMedia(
    id: string,
    data: Partial<Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'url'>>,
  ): Promise<MediaFile | null> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      const { data: updatedData, error } = await supabase
        .from(this.FILES_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao atualizar mídia', error);
        throw new Error(`Erro ao atualizar mídia: ${error.message}`);
      }

      return updatedData as MediaFile;
    } catch (error) {
      logger.error('Erro geral ao atualizar mídia', error);
      throw error;
    }
  }

  async deleteMedia(id: string): Promise<void> {
    try {
      // Buscar mídia para obter o caminho do storage
      const media = await this.getMediaById(id);
      if (!media) {
        throw new Error('Mídia não encontrada');
      }

      // Remover do storage se não for local
      if (!media.url.startsWith('/uploads/')) {
        const storagePath = media.url.split('/').pop();
        if (storagePath) {
          await supabase.storage
            .from(this.STORAGE_BUCKET)
            .remove([`${media.userId}/${storagePath}`]);
        }
      } else {
        // Remover arquivo local
        const localPath = path.join(
          this.LOCAL_UPLOAD_DIR,
          media.url.replace('/uploads/', ''),
        );
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }

      // Remover do banco
      const { error } = await supabase
        .from(this.FILES_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Erro ao deletar mídia do banco', error);
        throw new Error(`Erro ao deletar mídia: ${error.message}`);
      }

      logger.info('Mídia deletada com sucesso', { id });
    } catch (error) {
      logger.error('Erro geral ao deletar mídia', error);
      throw error;
    }
  }

  async listMedia(options?: {
    userId?: string;
    folderId?: string | null;
    type?: MediaType;
    status?: MediaStatus;
    tags?: string[];
    limit?: number;
  }): Promise<MediaFile[]> {
    try {
      let query = supabase.from(this.FILES_TABLE).select('*');

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.folderId !== undefined) {
        if (options.folderId === null) {
          query = query.is('folderId', null);
        } else {
          query = query.eq('folderId', options.folderId);
        }
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('createdAt', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar mídias', error);
        throw new Error(`Erro ao listar mídias: ${error.message}`);
      }

      return data as MediaFile[];
    } catch (error) {
      logger.error('Erro geral ao listar mídias', error);
      throw error;
    }
  }

  async createMediaFolder(
    data: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt' | 'path'>,
  ): Promise<MediaFolder> {
    try {
      const now = new Date();
      const id = uuidv4();

      // Construir caminho da pasta
      let path = data.name;
      if (data.parentId) {
        const parent = await this.getMediaFolderById(data.parentId);
        if (parent) {
          path = `${parent.path}/${data.name}`;
        }
      }

      const folder: Omit<MediaFolder, 'id'> = {
        ...data,
        path,
        createdAt: now,
        updatedAt: now,
      };

      const { data: insertData, error } = await supabase
        .from(this.FOLDERS_TABLE)
        .insert([{ id, ...folder }])
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar pasta de mídia', error);
        throw new Error(`Erro ao criar pasta: ${error.message}`);
      }

      return insertData as MediaFolder;
    } catch (error) {
      logger.error('Erro geral ao criar pasta de mídia', error);
      throw error;
    }
  }

  async getMediaFolderById(id: string): Promise<MediaFolder | null> {
    try {
      const { data, error } = await supabase
        .from(this.FOLDERS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        logger.error('Erro ao buscar pasta por ID', error);
        throw new Error(`Erro ao buscar pasta: ${error.message}`);
      }

      return data as MediaFolder;
    } catch (error) {
      logger.error('Erro geral ao buscar pasta por ID', error);
      throw error;
    }
  }

  async listMediaFolders(options?: {
    userId?: string;
    parentId?: string | null;
    isPublic?: boolean;
    limit?: number;
  }): Promise<MediaFolder[]> {
    try {
      let query = supabase.from(this.FOLDERS_TABLE).select('*');

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.parentId !== undefined) {
        if (options.parentId === null) {
          query = query.is('parentId', null);
        } else {
          query = query.eq('parentId', options.parentId);
        }
      }

      if (options?.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      query = query.order('createdAt', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar pastas de mídia', error);
        throw new Error(`Erro ao listar pastas: ${error.message}`);
      }

      return data as MediaFolder[];
    } catch (error) {
      logger.error('Erro geral ao listar pastas de mídia', error);
      throw error;
    }
  }
}
