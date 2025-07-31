import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import { IErrorNotebookRepository, ErrorNotebookFilters, PaginatedErrorNotebooks } from '../../../domain/studyTools/errorNotebook/repositories/IErrorNotebookRepository';
import { ErrorNotebook, CreateErrorNotebookPayload, UpdateErrorNotebookPayload, ErrorNotebookStats } from '../../../domain/studyTools/errorNotebook/types';
import { PaginationOptions } from '../../../domain/studyTools/studySessions/types';
import { AppError } from '../../../shared/errors/AppError';

const COLLECTIONS = {
  ERROR_NOTEBOOKS: 'errorNotebooks',
  ERROR_NOTEBOOK_ENTRIES: 'errorNotebookEntries',
};

export class FirebaseErrorNotebookRepository implements IErrorNotebookRepository {
  private db = firestore;

  async create(data: CreateErrorNotebookPayload): Promise<ErrorNotebook> {
    if (!data.userId) {
      throw new AppError('O ID do usuário é obrigatório', 400);
    }
    if (!data.title) {
      throw new AppError('O título do caderno é obrigatório', 400);
    }

    const now = Timestamp.now();
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc();

    const notebook: ErrorNotebook = {
      id: notebookRef.id,
      userId: data.userId,
      title: data.title,
      description: data.description ?? '',
      isPublic: data.isPublic !== undefined ? data.isPublic : false,
      lastEntryAt: null,
      entryCount: 0,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await notebookRef.set(notebook);
    return notebook;
  }

  async findById(id: string): Promise<ErrorNotebook | null> {
    const docRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    return docSnap.data() as ErrorNotebook;
  }

  async findByUser(
    userId: string,
    filters: ErrorNotebookFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedErrorNotebooks> {
    let query = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).where('userId', '==', userId);

    // Filtrar por tags se necessário
    if (filters.tags && filters.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', filters.tags);
    }

    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    try {
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      let hasMore = false;
      if (pagination.lastDocId) {
        const startAfterDoc = await this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(pagination.lastDocId).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      query = query.limit(pagination.limit + 1);

      const snapshot = await query.get();
      let notebooks = snapshot.docs.slice(0, pagination.limit).map(doc => doc.data() as ErrorNotebook);
      hasMore = snapshot.docs.length > pagination.limit;

      // Filtrar por busca de texto se necessário
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        notebooks = notebooks.filter(
          notebook =>
            notebook.title.toLowerCase().includes(searchTerm) ||
            (notebook.description && notebook.description.toLowerCase().includes(searchTerm)),
        );
      }

      return {
        items: notebooks,
        total,
        hasMore,
        lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
      };
    } catch (error) {
      // Fallback para quando índices compostos não estão disponíveis
      console.warn('Erro ao buscar com índice composto, tentando alternativa: ', error);

      // Consulta alternativa sem ordenação
      const basicQuery = this.db
        .collection(COLLECTIONS.ERROR_NOTEBOOKS)
        .where('userId', '==', userId);

      const snapshot = await basicQuery.get();
      let notebooks = snapshot.docs.map(doc => doc.data() as ErrorNotebook);

      // Filtrar por tags se necessário
      if (filters.tags && filters.tags.length > 0) {
        notebooks = notebooks.filter(notebook =>
          notebook.tags.some(tag => filters.tags!.includes(tag)),
        );
      }

      // Filtrar por busca de texto se necessário
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        notebooks = notebooks.filter(
          notebook =>
            notebook.title.toLowerCase().includes(searchTerm) ||
            (notebook.description && notebook.description.toLowerCase().includes(searchTerm)),
        );
      }

      // Ordenar manualmente
      notebooks.sort((a, b) => {
        const fieldA = a[sortBy as keyof ErrorNotebook];
        const fieldB = b[sortBy as keyof ErrorNotebook];

        if (fieldA instanceof Timestamp && fieldB instanceof Timestamp) {
          return sortOrder === 'desc'
            ? fieldB.toMillis() - fieldA.toMillis()
            : fieldA.toMillis() - fieldB.toMillis();
        }

        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortOrder === 'desc' ? fieldB.localeCompare(fieldA) : fieldA.localeCompare(fieldB);
        }

        return 0;
      });

      const total = notebooks.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const hasMore = notebooks.length > startIndex + pagination.limit;
      const paginatedNotebooks = notebooks.slice(startIndex, startIndex + pagination.limit);

      return {
        items: paginatedNotebooks,
        total,
        hasMore,
        lastDocId: hasMore ? paginatedNotebooks[paginatedNotebooks.length - 1].id : undefined,
      };
    }
  }

  async update(
    id: string,
    userId: string,
    data: UpdateErrorNotebookPayload,
  ): Promise<ErrorNotebook | null> {
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);
    const notebookSnap = await notebookRef.get();

    if (!notebookSnap.exists) {
      return null;
    }

    const notebook = notebookSnap.data() as ErrorNotebook;
    if (notebook.userId !== userId) {
      throw new AppError('Usuário não autorizado a atualizar este caderno', 403);
    }

    const updateData: Partial<ErrorNotebook> = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    await notebookRef.update(updateData);

    const updatedNotebookSnap = await notebookRef.get();
    return updatedNotebookSnap.data() as ErrorNotebook;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);
    const notebookSnap = await notebookRef.get();

    if (!notebookSnap.exists) {
      return false;
    }

    const notebook = notebookSnap.data() as ErrorNotebook;
    if (notebook.userId !== userId) {
      throw new AppError('Usuário não autorizado a excluir este caderno', 403);
    }

    const batch = this.db.batch();

    // Excluir todas as entradas relacionadas a este caderno
    const entriesQuery = this.db
      .collection(COLLECTIONS.ERROR_NOTEBOOK_ENTRIES)
      .where('notebookId', '==', id);
    const entriesSnapshot = await entriesQuery.get();

    if (!entriesSnapshot.empty) {
      entriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Excluir o caderno
    batch.delete(notebookRef);

    try {
      await batch.commit();
      return true;
    } catch (error) {
      console.error(`Erro ao excluir caderno ${id} e suas entradas:`, error);
      return false;
    }
  }

  async getStats(id: string, userId: string): Promise<ErrorNotebookStats | null> {
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);
    const notebookSnap = await notebookRef.get();

    if (!notebookSnap.exists) {
      return null;
    }

    const notebook = notebookSnap.data() as ErrorNotebook;
    if (notebook.userId !== userId) {
      throw new AppError('Usuário não autorizado a acessar estatísticas deste caderno', 403);
    }

    const entriesQuery = this.db
      .collection(COLLECTIONS.ERROR_NOTEBOOK_ENTRIES)
      .where('notebookId', '==', id);
    const entriesSnapshot = await entriesQuery.get();

    let totalEntries = 0;
    let resolvedEntries = 0;
    let unresolvedEntries = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    const entriesByCategory: Record<string, number> = {};

    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      totalEntries++;

      if (entry.isResolved) {
        resolvedEntries++;
        if (entry.resolvedAt && entry.createdAt) {
          const resolutionTime = entry.resolvedAt.toMillis() - entry.createdAt.toMillis();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      } else {
        unresolvedEntries++;
      }

      if (entry.errorCategory) {
        entriesByCategory[entry.errorCategory] = (entriesByCategory[entry.errorCategory] || 0) + 1;
      }
    });

    // Calcular o tempo médio de resolução em horas
    const averageResolutionTime =
      resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0;

    return {
      totalEntries,
      resolvedEntries,
      unresolvedEntries,
      entriesByCategory,
      lastUpdatedAt: Timestamp.now(),
      averageResolutionTime,
    };
  }

  async incrementEntryCount(id: string): Promise<void> {
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);
    const now = Timestamp.now();

    await notebookRef.update({
      entryCount: FieldValue.increment(1),
      lastEntryAt: now,
      updatedAt: now,
    });
  }

  async decrementEntryCount(id: string): Promise<void> {
    const notebookRef = this.db.collection(COLLECTIONS.ERROR_NOTEBOOKS).doc(id);

    await notebookRef.update({
      entryCount: FieldValue.increment(-1),
      updatedAt: Timestamp.now(),
    });
  }
}
