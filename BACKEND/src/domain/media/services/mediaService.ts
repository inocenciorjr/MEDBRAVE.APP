// Serviço de Mídia
// Implementação com integração ao Supabase Storage e Database

import { MediaFile, MediaFolder, MediaType, MediaStatus } from '../types';
import { SupabaseMediaService } from '../../../infra/media/supabase/SupabaseMediaService';

export class MediaService {
  private supabaseMediaService: SupabaseMediaService;

  constructor() {
    this.supabaseMediaService = new SupabaseMediaService();
  }

  async uploadMedia(
    data: Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'url'>,
    fileBuffer: Buffer,
  ): Promise<MediaFile> {
    return this.supabaseMediaService.uploadMedia(data, fileBuffer);
  }
  async getMediaById(id: string): Promise<MediaFile | null> {
    return this.supabaseMediaService.getMediaById(id);
  }

  async updateMedia(
    id: string,
    data: Partial<Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'url'>>,
  ): Promise<MediaFile | null> {
    return this.supabaseMediaService.updateMedia(id, data);
  }

  async deleteMedia(id: string): Promise<void> {
    return this.supabaseMediaService.deleteMedia(id);
  }

  async listMedia(options?: {
    userId?: string;
    folderId?: string | null;
    type?: MediaType;
    status?: MediaStatus;
    tags?: string[];
    limit?: number;
  }): Promise<MediaFile[]> {
    return this.supabaseMediaService.listMedia(options);
  }

  async createMediaFolder(
    data: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt' | 'path'>,
  ): Promise<MediaFolder> {
    return this.supabaseMediaService.createMediaFolder(data);
  }

  async listMediaFolders(options?: {
    userId?: string;
    parentId?: string | null;
    isPublic?: boolean;
    limit?: number;
  }): Promise<MediaFolder[]> {
    return this.supabaseMediaService.listMediaFolders(options);
  }
}
