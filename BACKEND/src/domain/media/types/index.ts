// Tipos principais para Mídia
// Baseado no projeto original e documentação

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other';
export type MediaStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'inactive'
  | 'deleted';

export interface MediaFile {
  id: string;
  userId: string;
  folderId?: string | null;
  filename: string;
  originalFilename: string;
  type: MediaType;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  status: MediaStatus;
  tags?: string[] | null;
  alt?: string | null;
  caption?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFolder {
  id: string;
  userId: string;
  parentId?: string | null;
  name: string;
  path: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
