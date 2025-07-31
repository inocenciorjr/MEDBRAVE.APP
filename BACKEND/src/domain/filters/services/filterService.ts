import * as admin from 'firebase-admin';
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';
import { Filter, FilterCategory, FilterCreatePayload, FilterListOptions, FilterStatus, FilterType, FilterUpdatePayload } from "../types";
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';

export const COLLECTION_NAME = "filters";
const SUBFILTERS_COLLECTION = "subFilters";

/**
 * Serviço para gerenciar filtros no Firestore
 */
export class FilterService {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  /**
   * Cria um novo filtro
   * @param data Dados do filtro
   * @returns Filtro criado
   */
  async createFilter(data: FilterCreatePayload): Promise<Filter> {
    try {
      if (data.category && !Object.values(FilterCategory).includes(data.category)) {
        throw new AppError(
          `Valor inválido para category: ${data.category}. Valores permitidos são: ${Object.values(FilterCategory).join(", ")}.`,
          400
        );
      }

      const now = Timestamp.now();
      const id = uuidv4();
      
      const newFilter: Filter = {
        id,
        ...data,
        isGlobal: typeof data.isGlobal === 'boolean' ? data.isGlobal : false,
        filterType: data.filterType || FilterType.CONTENT,
        status: data.status || FilterStatus.ACTIVE,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };
      
      // Convertemos as datas para Timestamp antes de salvar no Firestore
      await this.db.collection(COLLECTION_NAME).doc(id).set({
        ...newFilter,
        createdAt: now,
        updatedAt: now
      });
      
      logger.info(`Filtro criado com sucesso: ${id}`, {
        category: data.category,
        filterType: newFilter.filterType,
      });
      
      return newFilter;
    } catch (error) {
      logger.error('Erro ao criar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar filtro', 500);
    }
  }

  /**
   * Obtém um filtro pelo ID
   * @param filterId ID do filtro
   * @returns Filtro encontrado ou null se não existir
   */
  async getFilterById(filterId: string): Promise<Filter | null> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }
      
      const docRef = this.db.collection(COLLECTION_NAME).doc(filterId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        logger.warn(`Filtro com ID "${filterId}" não encontrado`);
        return null;
      }
      
      const data = docSnap.data();
      
      // Convertemos as timestamps do Firestore para datas JavaScript
      return {
        ...data,
        id: docSnap.id,
        createdAt: data?.createdAt instanceof Timestamp ? data.createdAt.toDate() : data?.createdAt,
        updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data?.updatedAt,
      } as Filter;
    } catch (error) {
      logger.error('Erro ao buscar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar filtro', 500);
    }
  }

  /**
   * Lista filtros com filtros e ordenação
   * @param options Opções de listagem e filtros
   * @returns Lista de filtros
   */
  async listFilters(options?: FilterListOptions): Promise<Filter[]> {
    try {
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = this.db.collection(COLLECTION_NAME);

      if (options?.category) {
        query = query.where("category", "==", options.category);
      }
      
      if (typeof options?.isGlobal === 'boolean') {
        query = query.where("isGlobal", "==", options.isGlobal);
      }
      
      if (options?.status) {
        query = query.where("status", "==", options.status);
      }
      
      if (options?.orderBy && options?.orderDirection) {
        query = query.orderBy(options.orderBy.toString(), options.orderDirection);
      } else {
        query = query.orderBy("createdAt", "desc");
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      // Convertemos as timestamps do Firestore para datas JavaScript
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as Filter;
      });
    } catch (error) {
      logger.error('Erro ao listar filtros:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar filtros', 500);
    }
  }

  /**
   * Atualiza um filtro existente
   * @param filterId ID do filtro
   * @param updateDataInput Dados para atualização
   * @returns Filtro atualizado ou null se não existir
   */
  async updateFilter(filterId: string, updateDataInput: FilterUpdatePayload): Promise<Filter | null> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }
      
      const filterRef = this.db.collection(COLLECTION_NAME).doc(filterId);
      const docSnap = await filterRef.get();

      if (!docSnap.exists) {
        logger.warn(`Filtro com ID "${filterId}" não encontrado para atualização`);
        return null;
      }

      // Cria uma cópia do objeto de entrada para evitar mutação do original
      const updatePayload = { ...updateDataInput };
      
      // Remove explicitamente a propriedade 'category' do payload de atualização,
      // caso ela tenha sido passada (apesar da tipagem que a proíbe).
      // Isso garante que a categoria do filtro não seja alterada.
      delete (updatePayload as any).category;

      const now = Timestamp.now();
      const finalUpdateData = {
        ...updatePayload,
        updatedAt: now
      };

      await filterRef.update(finalUpdateData);
      
      logger.info(`Filtro atualizado com sucesso: ${filterId}`);
      
      const updatedDoc = await filterRef.get();
      
      if (!updatedDoc.exists) {
        return null;
      }
      
      const data = updatedDoc.data();
      
      // Convertemos as timestamps do Firestore para datas JavaScript
      return {
        ...data,
        id: updatedDoc.id,
        createdAt: data?.createdAt instanceof Timestamp ? data.createdAt.toDate() : data?.createdAt,
        updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data?.updatedAt,
      } as Filter;
    } catch (error) {
      logger.error('Erro ao atualizar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar filtro', 500);
    }
  }

  /**
   * Exclui um filtro e seus subfiltros relacionados
   * @param filterId ID do filtro
   * @returns void
   */
  async deleteFilter(filterId: string): Promise<void> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }
      
      const filterRef = this.db.collection(COLLECTION_NAME).doc(filterId);
      const docSnap = await filterRef.get();

      if (!docSnap.exists) {
        throw new AppError(`Filtro com ID "${filterId}" não encontrado para exclusão.`, 404);
      }

      // Deletar subfiltros relacionados em cascata
      const subFiltersSnapshot = await this.db.collection(SUBFILTERS_COLLECTION)
        .where("filterId", "==", filterId)
        .get();
        
      if (!subFiltersSnapshot.empty) {
        const batch = this.db.batch();
        subFiltersSnapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        logger.info(`${subFiltersSnapshot.size} subfiltros associados ao filtro ${filterId} foram deletados.`);
      }

      await filterRef.delete();
      logger.info(`Filtro ${filterId} deletado com sucesso.`);
    } catch (error) {
      logger.error('Erro ao deletar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao deletar filtro', 500);
    }
  }
}

export {}; 