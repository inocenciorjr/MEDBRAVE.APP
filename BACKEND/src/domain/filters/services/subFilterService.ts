import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { 
  FilterCategory, 
  FilterStatus, 
  SubFilter, 
  SubFilterCreatePayload, 
  SubFilterListOptions, 
  SubFilterListResult, 
  SubFilterUpdatePayload 
} from '../types';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';
import { FilterService } from './filterService';

const SUBFILTERS_COLLECTION = "subFilters";
const FILTERS_COLLECTION = "filters";

/**
 * Serviço para gerenciar subfiltros no Firestore
 */
export class SubFilterService {
  private db: admin.firestore.Firestore;
  private filterService: FilterService;

  constructor(db: admin.firestore.Firestore = admin.firestore()) {
    this.db = db;
    this.filterService = new FilterService(db);
  }

  /**
   * Cria um novo subfiltro
   * @param data Dados do subfiltro
   * @returns Subfiltro criado
   */
  async createSubFilter(data: SubFilterCreatePayload): Promise<SubFilter> {
    try {
      if (!data.filterId) {
        throw new AppError("O ID do filtro pai é obrigatório para criar um subfiltro.", 400);
      }
      
      if (!data.name) {
        throw new AppError("O nome é obrigatório para criar um subfiltro.", 400);
      }

      // Verificar se o filtro pai existe
      const parentFilter = await this.filterService.getFilterById(data.filterId);
      if (!parentFilter) {
        throw new AppError(`Filtro pai com ID ${data.filterId} não encontrado.`, 404);
      }

      // Se tiver parentId, verificar se o subfiltro pai existe
      if (data.parentId) {
        const parentSubFilter = await this.getSubFilterById(data.parentId);
        if (!parentSubFilter) {
          throw new AppError(`Subfiltro pai com ID ${data.parentId} não encontrado.`, 404);
        }
        
        // Verificar se o subfiltro pai pertence ao mesmo filtro
        if (parentSubFilter.filterId !== data.filterId) {
          throw new AppError(`O subfiltro pai deve pertencer ao mesmo filtro (${data.filterId}).`, 400);
        }
      }

      const now = Timestamp.now();
      const id = uuidv4();
      
      const subFilterData: SubFilter = {
        id,
        filterId: data.filterId,
        name: data.name,
        description: data.description,
        order: data.order || 0,
        isActive: data.isActive ?? true,
        parentId: data.parentId,
        status: data.status || FilterStatus.ACTIVE,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };

      // Converter datas para Timestamp antes de salvar no Firestore
      await this.db.collection(SUBFILTERS_COLLECTION).doc(id).set({
        ...subFilterData,
        createdAt: now,
        updatedAt: now
      });
      
      logger.info(`Subfiltro criado com sucesso: ${id}`, {
        filterId: data.filterId,
        parentId: data.parentId,
      });
      
      return subFilterData;
    } catch (error) {
      logger.error('Erro ao criar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar subfiltro', 500);
    }
  }

  /**
   * Obtém um subfiltro pelo ID
   * @param subFilterId ID do subfiltro
   * @returns Subfiltro encontrado ou null se não existir
   */
  async getSubFilterById(subFilterId: string): Promise<SubFilter | null> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }
      
      const docRef = this.db.collection(SUBFILTERS_COLLECTION).doc(subFilterId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        logger.warn(`Subfiltro com ID "${subFilterId}" não encontrado`);
        return null;
      }
      
      const data = docSnap.data();
      
      // Convertemos as timestamps do Firestore para datas JavaScript
      return {
        ...data,
        id: docSnap.id,
        createdAt: data?.createdAt instanceof Timestamp ? data.createdAt.toDate() : data?.createdAt,
        updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data?.updatedAt,
      } as SubFilter;
    } catch (error) {
      logger.error('Erro ao buscar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar subfiltro', 500);
    }
  }

  /**
   * Atualiza um subfiltro existente
   * @param subFilterId ID do subfiltro
   * @param updateData Dados para atualização
   * @returns Subfiltro atualizado ou null se não existir
   */
  async updateSubFilter(
    subFilterId: string,
    updateData: SubFilterUpdatePayload
  ): Promise<SubFilter | null> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }
      
      const subFilterRef = this.db.collection(SUBFILTERS_COLLECTION).doc(subFilterId);
      const docSnap = await subFilterRef.get();

      if (!docSnap.exists) {
        logger.warn(`Subfiltro com ID "${subFilterId}" não encontrado para atualização`);
        return null;
      }

      // Verificar se está tentando atualizar o parentId
      if (updateData.parentId) {
        // Verificar se o parentId é do mesmo subfiltro que está sendo atualizado
        if (updateData.parentId === subFilterId) {
          throw new AppError('Um subfiltro não pode ser seu próprio pai', 400);
        }
        
        const existingData = docSnap.data() as SubFilter;
        
        // Se parentId for diferente do atual, verificar se o novo subfiltro pai existe
        if (updateData.parentId !== existingData.parentId) {
          const parentSubFilter = await this.getSubFilterById(updateData.parentId);
          if (!parentSubFilter) {
            throw new AppError(`Subfiltro pai com ID ${updateData.parentId} não encontrado.`, 404);
          }
          
          // Verificar se o subfiltro pai pertence ao mesmo filtro
          if (parentSubFilter.filterId !== existingData.filterId) {
            throw new AppError(`O subfiltro pai deve pertencer ao mesmo filtro (${existingData.filterId}).`, 400);
          }
        }
      }

      const now = Timestamp.now();
      const dataToUpdate = { 
        ...updateData, 
        updatedAt: now 
      };
      
      // Não permitimos alterar o filterId
      delete (dataToUpdate as any).filterId;
      
      await subFilterRef.update(dataToUpdate);
      
      logger.info(`Subfiltro atualizado com sucesso: ${subFilterId}`);
      
      const updatedDoc = await subFilterRef.get();
      
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
      } as SubFilter;
    } catch (error) {
      logger.error('Erro ao atualizar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar subfiltro', 500);
    }
  }

  /**
   * Exclui um subfiltro e seus subfiltros filhos
   * @param subFilterId ID do subfiltro
   */
  async deleteSubFilter(subFilterId: string): Promise<void> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }
      
      const subFilterRef = this.db.collection(SUBFILTERS_COLLECTION).doc(subFilterId);
      const subFilterDoc = await subFilterRef.get();

      if (!subFilterDoc.exists) {
        logger.warn(`Subfiltro com ID "${subFilterId}" não encontrado para deleção.`);
        return;
      }

      const subFilterData = subFilterDoc.data() as SubFilter;
      const filterDocRef = this.db.collection(FILTERS_COLLECTION).doc(subFilterData.filterId);

      // Verificar se este subfiltro é pai de outros subfiltros
      const childSubFiltersSnapshot = await this.db.collection(SUBFILTERS_COLLECTION)
        .where("parentId", "==", subFilterId)
        .get();
        
      await this.db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Primeiro fazemos todas as leituras
        const parentFilterDoc = await transaction.get(filterDocRef);
        
        // Excluir subfiltros filhos, se existirem
        if (!childSubFiltersSnapshot.empty) {
          childSubFiltersSnapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
            transaction.delete(doc.ref);
          });
          logger.info(`${childSubFiltersSnapshot.size} subfiltros filhos do subfiltro ${subFilterId} foram deletados.`);
        }
        
        // Excluir o próprio subfiltro
        transaction.delete(subFilterRef);
        
        // Atualizar contador no filtro pai, se necessário
        if (parentFilterDoc.exists) {
          transaction.update(filterDocRef, {
            subFilterCount: FieldValue.increment(-1),
            updatedAt: Timestamp.now(),
          });
        }
      });
      
      logger.info(`Subfiltro ${subFilterId} deletado com sucesso.`);
    } catch (error) {
      logger.error('Erro ao deletar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao deletar subfiltro', 500);
    }
  }

  /**
   * Lista subfiltros por filterId com paginação e filtros
   * @param filterId ID do filtro
   * @param options Opções de listagem e filtros
   * @returns Lista paginada de subfiltros
   */
  async listSubFiltersByFilterId(
    filterId: string,
    options?: SubFilterListOptions
  ): Promise<SubFilterListResult> {
    try {
      if (!filterId) {
        throw new AppError("O ID do filtro pai é obrigatório para listar subfiltros.", 400);
      }

      let query: admin.firestore.Query<admin.firestore.DocumentData> = this.db
        .collection(SUBFILTERS_COLLECTION)
        .where("filterId", "==", filterId);

      if (options?.isActive !== undefined) {
        query = query.where("isActive", "==", options.isActive);
      }
      
      // Receber parentId como argumento separado, se necessário, e filtrar manualmente ou ajustar a interface se for padrão do projeto.

      const sortBy = options?.sortBy || "order";
      const sortDirection = options?.sortDirection || "asc";
      query = query.orderBy(sortBy.toString(), sortDirection);
      
      if (sortBy !== "name") {
        query = query.orderBy("name", "asc");
      }

      if (options?.startAfter) {
        const startAfterDoc = await this.db.collection(SUBFILTERS_COLLECTION).doc(options.startAfter.id).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      const limit = options?.limit || 20;
      query = query.limit(limit + 1);

      const snapshot = await query.get();
      const subFilters = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as SubFilter;
      });

      let nextPageStartAfter: SubFilter | undefined = undefined;
      if (subFilters.length > limit) {
        nextPageStartAfter = subFilters.pop();
      }

      return { subFilters, nextPageStartAfter };
    } catch (error) {
      logger.error('Erro ao listar subfiltros:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar subfiltros', 500);
    }
  }

  /**
   * Obtém a categoria do filtro pai de um subfiltro
   * @param subFilterId ID do subfiltro
   * @returns Categoria do filtro pai ou null se não encontrado
   */
  async getParentFilterCategory(subFilterId: string): Promise<FilterCategory | null> {
    try {
      const subFilter = await this.getSubFilterById(subFilterId);
      if (subFilter && subFilter.filterId) {
        const parentFilter = await this.filterService.getFilterById(subFilter.filterId);
        return parentFilter ? parentFilter.category : null;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao obter categoria do filtro pai:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao obter categoria do filtro pai', 500);
    }
  }
} 