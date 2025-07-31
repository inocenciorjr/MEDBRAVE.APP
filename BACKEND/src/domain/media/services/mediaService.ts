// Serviço de Mídia
// Implementação real com integração ao Firebase Storage e Firestore

import { MediaFile, MediaFolder, MediaType, MediaStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { firestore, storage } from '../../../config/firebaseAdmin';
import * as fs from 'fs';
import * as path from 'path';

export class MediaService {
  private FILES_COLLECTION = 'mediaFiles';
  private FOLDERS_COLLECTION = 'mediaFolders';
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
    
    // 🔧 SANITIZAR nome do arquivo para evitar problemas de URL
    const sanitizedFilename = data.filename
      .replace(/[()[\]{}]/g, '') // Remove parênteses, colchetes, chaves
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove caracteres especiais exceto ponto, underscore e hífen
      .toLowerCase(); // Converte para minúsculas
    
    console.log('🔄 [Media Service] Iniciando upload...', { 
      originalFilename: data.filename,
      sanitizedFilename,
      size: data.size 
    });
    
    try {
      // Tentar upload para Firebase Storage primeiro
      const storagePath = `media/${data.userId}/${id}_${sanitizedFilename}`;
      const fileRef = storage.bucket().file(storagePath);
      await fileRef.save(fileBuffer, { contentType: data.mimeType });
      await fileRef.makePublic();
      
      // 🔧 CORRIGIDO: URL mais robusta do Firebase Storage
      const bucketName = storage.bucket().name;
      // Usar URL simples e direta para evitar problemas de encoding
      const url = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
      
      console.log('✅ [Media Service] Upload para Firebase Storage bem-sucedido:', url);
      console.log('🎯 [Media Service] Usando URL SIMPLIFICADA (não encoded)');
      console.log('📁 [Media Service] Storage path:', storagePath);
      console.log('🪣 [Media Service] Bucket name:', bucketName);
      
      const media: MediaFile = {
        id,
        ...data,
        filename: sanitizedFilename, // Usar nome sanitizado
        originalFilename: data.filename, // Manter nome original para referência
        url,
        createdAt: now,
        updatedAt: now,
      };
      await firestore.collection(this.FILES_COLLECTION).doc(id).set(media);
      return media;
    } catch (storageError: any) {
      console.warn('⚠️ [Media Service] Firebase Storage falhou, usando fallback local:', storageError?.message || storageError);
      
      // Fallback: salvar localmente
      const localFileName = `${id}_${sanitizedFilename}`;
      const localFilePath = path.join(this.LOCAL_UPLOAD_DIR, localFileName);
      
      fs.writeFileSync(localFilePath, fileBuffer);
      
      // URL local para servir o arquivo
      const url = `http://localhost:5000/uploads/${localFileName}`;
      
      console.log('✅ [Media Service] Upload local bem-sucedido:', url);
      console.log('🏠 [Media Service] Usando FALLBACK LOCAL');
      
      const media: MediaFile = {
        id,
        ...data,
        filename: sanitizedFilename,
        originalFilename: data.filename,
        url,
        createdAt: now,
        updatedAt: now,
      };
      await firestore.collection(this.FILES_COLLECTION).doc(id).set(media);
      return media;
    }
  }

  async getMediaById(id: string): Promise<MediaFile | null> {
    const doc = await firestore.collection(this.FILES_COLLECTION).doc(id).get();
    if (!doc.exists) {
return null;
}
    return doc.data() as MediaFile;
  }

  async updateMedia(
    id: string,
    data: Partial<Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt' | 'url'>>,
  ): Promise<MediaFile | null> {
    const ref = firestore.collection(this.FILES_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
return null;
}
    const now = new Date();
    await ref.update({ ...data, updatedAt: now });
    const updated = await ref.get();
    return updated.data() as MediaFile;
  }

  async deleteMedia(id: string): Promise<void> {
    const ref = firestore.collection(this.FILES_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
return;
}
    const media = doc.data() as MediaFile;
    if (media.url) {
      const storagePath = decodeURIComponent(media.url.split('/').slice(4).join('/'));
      await storage
        .bucket()
        .file(storagePath)
        .delete()
        .catch(() => {});
    }
    await ref.delete();
  }

  async listMedia(options?: {
    userId?: string;
    folderId?: string | null;
    type?: MediaType;
    status?: MediaStatus;
    tags?: string[];
    limit?: number;
  }): Promise<MediaFile[]> {
    let query: FirebaseFirestore.Query = firestore.collection(this.FILES_COLLECTION);
    if (options?.userId) {
query = query.where('userId', '==', options.userId);
}
    if (options?.folderId !== undefined) {
query = query.where('folderId', '==', options.folderId);
}
    if (options?.type) {
query = query.where('type', '==', options.type);
}
    if (options?.status) {
query = query.where('status', '==', options.status);
}
    if (options?.tags && options.tags.length > 0) {
query = query.where('tags', 'array-contains-any', options.tags);
}
    query = query.orderBy('createdAt', 'desc');
    if (options?.limit) {
query = query.limit(options.limit);
}
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as MediaFile);
  }

  async createMediaFolder(
    data: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt' | 'path'>,
  ): Promise<MediaFolder> {
    const now = new Date();
    const id = uuidv4();
    const path = data.parentId ? `${data.parentId}/${data.name}` : data.name;
    const folder: MediaFolder = {
      id,
      ...data,
      path,
      createdAt: now,
      updatedAt: now,
    };
    await firestore.collection(this.FOLDERS_COLLECTION).doc(id).set(folder);
    return folder;
  }

  async listMediaFolders(options?: {
    userId?: string;
    parentId?: string | null;
    isPublic?: boolean;
    limit?: number;
  }): Promise<MediaFolder[]> {
    let query: FirebaseFirestore.Query = firestore.collection(this.FOLDERS_COLLECTION);
    if (options?.userId) {
query = query.where('userId', '==', options.userId);
}
    if (options?.parentId !== undefined) {
query = query.where('parentId', '==', options.parentId);
}
    if (options?.isPublic !== undefined) {
query = query.where('isPublic', '==', options.isPublic);
}
    query = query.orderBy('createdAt', 'desc');
    if (options?.limit) {
query = query.limit(options.limit);
}
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as MediaFolder);
  }
}
