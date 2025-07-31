// Serviço de Conteúdo (Artigos)
// Implementação inicial - esqueleto

import {
  Content,
  CreateContentDTO,
  UpdateContentDTO,
  ContentQueryOptions,
  PaginatedContentResult,
} from '../types';
import { IContentService } from '../interfaces/IContentService';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from 'firebase-admin';

const COLLECTION = 'articles';

export class ContentService implements IContentService {
  private db: firestore.Firestore;

  constructor(db?: firestore.Firestore) {
    this.db = db || firestore();
  }

  async createContent(data: CreateContentDTO): Promise<Content> {
    const now = new Date();
    const id = uuidv4();

    // Configurar valores padrão
    const article: Content = {
      id,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      tags: data.tags || [],
      categoryId: data.categoryId || undefined,
      status: data.status || 'DRAFT',
      summary: data.summary || undefined,
      isPublic: data.isPublic !== undefined ? data.isPublic : false,
      imageUrl: data.imageUrl || undefined,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: data.status === 'PUBLISHED' ? now : undefined,
      readTimeMinutes: this.calculateReadTime(data.content),
    };

    await this.db.collection(COLLECTION).doc(id).set(article);
    return article;
  }

  async getContentById(id: string): Promise<Content | null> {
    const doc = await this.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.convertToContent(doc);
  }

  async updateContent(id: string, data: UpdateContentDTO): Promise<Content | null> {
    const ref = this.db.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return null;
    }

    const now = new Date();
    const updates: Partial<Content> = {
      ...data,
      updatedAt: now,
    };

    const docData = doc.data();
    if (data && data.status === 'PUBLISHED' && docData && docData.status !== 'PUBLISHED') {
      updates.publishedAt = now;
    }

    // Recalcular o tempo de leitura se o conteúdo foi alterado
    if (data.content) {
      updates.readTimeMinutes = this.calculateReadTime(data.content);
    }

    await ref.update(updates);

    const updated = await ref.get();
    return this.convertToContent(updated);
  }

  async deleteContent(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).delete();
  }

  async listContent(options?: ContentQueryOptions): Promise<PaginatedContentResult> {
    let query: FirebaseFirestore.Query = this.db.collection(COLLECTION);

    // Aplicar filtros
    if (options?.status) {
      query = (query as FirebaseFirestore.Query).where('status', '==', options.status);
    }

    if (options?.categoryId) {
      query = (query as FirebaseFirestore.Query).where('categoryId', '==', options.categoryId);
    }

    if (options?.authorId) {
      query = (query as FirebaseFirestore.Query).where('authorId', '==', options.authorId);
    }

    // Firestore não suporta múltiplos filtros array-contains-any,
    // então isso precisaria ser filtrado após a consulta
    // Esta é uma implementação simplificada
    if (options?.tags && options.tags.length > 0) {
      // @ts-ignore: Firestore types
      query = query.where('tags', 'array-contains-any', options.tags);
    }

    // Ordenação
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    // @ts-ignore: Firestore types
    query = query.orderBy(sortBy, sortOrder);

    // Paginação
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = (page - 1) * limit;

    // Contar total de registros (não eficiente para produção, use Counter ou agregação)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Aplicar paginação
    // @ts-ignore: Firestore types
    query = query.limit(limit).offset(offset);

    // Executar consulta
    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => this.convertToContent(doc));

    return {
      items,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async incrementViewCount(id: string): Promise<Content | null> {
    const ref = this.db.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return null;
    }

    // Usar operação atômica para incrementar
    await ref.update({
      viewCount: firestore.FieldValue.increment(1),
      updatedAt: new Date(),
    });

    const updated = await ref.get();
    return this.convertToContent(updated);
  }

  async publishContent(id: string): Promise<Content | null> {
    const ref = this.db.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return null;
    }

    const now = new Date();
    await ref.update({
      status: 'PUBLISHED',
      publishedAt: now,
      updatedAt: now,
    });

    const updated = await ref.get();
    return this.convertToContent(updated);
  }

  async archiveContent(id: string): Promise<Content | null> {
    const ref = this.db.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return null;
    }

    await ref.update({
      status: 'ARCHIVED',
      updatedAt: new Date(),
    });

    const updated = await ref.get();
    return this.convertToContent(updated);
  }

  async searchContent(
    term: string,
    options?: ContentQueryOptions,
  ): Promise<PaginatedContentResult> {
    // No Firestore, precisamos de uma solução de search externa para busca eficiente por texto
    // Esta é uma implementação simplificada que busca no título apenas
    const snapshot = await this.db
      .collection(COLLECTION)
      .orderBy('title')
      .startAt(term)
      .endAt(term + '\uf8ff')
      .get();

    const items = snapshot.docs.map(doc => this.convertToContent(doc));

    // Filtragem adicional se necessário
    let filteredItems = items;

    if (options?.status) {
      filteredItems = filteredItems.filter(item => item.status === options.status);
    }

    if (options?.categoryId) {
      filteredItems = filteredItems.filter(item => item.categoryId === options.categoryId);
    }

    if (options?.authorId) {
      filteredItems = filteredItems.filter(item => item.authorId === options.authorId);
    }

    if (options?.tags && options.tags.length > 0) {
      filteredItems = filteredItems.filter(item =>
        Array.isArray(item.tags) && options.tags ? item.tags.some(tag => options.tags!.includes(tag)) : false,
      );
    }

    // Ordenação e paginação
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';

    filteredItems = filteredItems.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      } else {
        return a[sortBy] < b[sortBy] ? 1 : -1;
      }
    });

    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const offset = (page - 1) * limit;
    const total = filteredItems.length;

    filteredItems = filteredItems.slice(offset, offset + limit);

    return {
      items: filteredItems,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  // Utilitários
  private convertToContent(doc: firestore.DocumentSnapshot): Content {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      publishedAt: data?.publishedAt?.toDate() || undefined,
    } as Content;
  }

  private calculateReadTime(content: string): number {
    // Média de palavras por minuto para leitura
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, readTime); // Mínimo de 1 minuto
  }
}
