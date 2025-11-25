import {
  FilterCategory,
  FilterStatus,
  SubFilter,
  SubFilterCreatePayload,
  SubFilterListOptions,
  SubFilterListResult,
  SubFilterUpdatePayload,
} from '../../../domain/filters/types';
import { SupabaseSubFilterRepository } from '../../../domain/filters/repositories/SupabaseSubFilterRepository';
import { ISubFilterRepository } from '../../../domain/filters/repositories/ISubFilterRepository';
import { FilterService } from './filterService';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';

/**
 * Serviço para gerenciar subfiltros no Supabase
 */
export class SubFilterService {
  private subFilterRepository: ISubFilterRepository;
  private filterService: FilterService;

  constructor(
    subFilterRepository?: ISubFilterRepository,
    filterService?: FilterService,
  ) {
    this.subFilterRepository =
      subFilterRepository || new SupabaseSubFilterRepository();
    this.filterService = filterService || new FilterService();
  }

  /**
   * Cria um novo subfiltro
   * @param data Dados do subfiltro
   * @returns Subfiltro criado
   */
  async createSubFilter(data: SubFilterCreatePayload): Promise<SubFilter> {
    try {
      if (!data.filter_id) {
        throw new AppError(
          'O ID do filtro pai é obrigatório para criar um subfiltro.',
          400,
        );
      }

      if (!data.name) {
        throw new AppError(
          'O nome é obrigatório para criar um subfiltro.',
          400,
        );
      }

      // Verificar se o filtro pai existe
      const parentFilter = await this.filterService.getFilterById(
        data.filter_id,
      );
      if (!parentFilter) {
        throw new AppError(
          `Filtro pai com ID ${data.filter_id} não encontrado.`,
          404,
        );
      }

      // Se parentId for fornecido, verificar se o subfiltro pai existe
      if (data.parent_id) {
        const parentSubFilter = await this.subFilterRepository.getById(
          data.parent_id,
        );
        if (!parentSubFilter) {
          throw new AppError(
            `Subfiltro pai com ID ${data.parent_id} não encontrado.`,
            404,
          );
        }

        // Verificar se o subfiltro pai pertence ao mesmo filtro
        if (parentSubFilter.filter_id !== data.filter_id) {
          throw new AppError(
            'O subfiltro pai deve pertencer ao mesmo filtro.',
            400,
          );
        }
      }

      const subFilterData: SubFilterCreatePayload = {
        ...data,
        is_active: typeof (data as any).is_active === 'boolean' ? (data as any).is_active : true,
        status: data.status || FilterStatus.ACTIVE,
      };

      const newSubFilter = await this.subFilterRepository.create(subFilterData);

      logger.info(`Subfiltro criado com sucesso: ${newSubFilter.id}`);
      return newSubFilter;
    } catch (error) {
      logger.error('Erro ao criar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao criar subfiltro', 500);
    }
  }

  /**
   * Busca um subfiltro por ID
   * @param subFilterId ID do subfiltro
   * @returns Subfiltro encontrado ou null
   */
  async getSubFilterById(subFilterId: string): Promise<SubFilter | null> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }

      const subFilter = await this.subFilterRepository.getById(subFilterId);

      if (!subFilter) {
        logger.warn(`Subfiltro não encontrado: ${subFilterId}`);
        return null;
      }

      return subFilter;
    } catch (error) {
      logger.error('Erro ao buscar subfiltro por ID:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao buscar subfiltro', 500);
    }
  }

  /**
   * Atualiza um subfiltro
   * @param subFilterId ID do subfiltro
   * @param updateData Dados para atualização
   * @returns Subfiltro atualizado ou null
   */
  async updateSubFilter(
    subFilterId: string,
    updateData: SubFilterUpdatePayload,
  ): Promise<SubFilter | null> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }

      // Verificar se o subfiltro existe
      const existingSubFilter =
        await this.subFilterRepository.getById(subFilterId);
      if (!existingSubFilter) {
        throw new AppError('Subfiltro não encontrado', 404);
      }

      // Se filterId for fornecido, verificar se o filtro existe
      if ((updateData as any).filter_id) {
        const parentFilter = await this.filterService.getFilterById(
          (updateData as any).filter_id,
        );
        if (!parentFilter) {
          throw new AppError(
            `Filtro pai com ID ${(updateData as any).filter_id} não encontrado.`,
            404,
          );
        }
      }

      // Se parentId for fornecido, verificar se o subfiltro pai existe
      if ((updateData as any).parent_id) {
        const parentSubFilter = await this.subFilterRepository.getById(
          (updateData as any).parent_id,
        );
        if (!parentSubFilter) {
          throw new AppError(
            `Subfiltro pai com ID ${(updateData as any).parent_id} não encontrado.`,
            404,
          );
        }

        // Verificar se o subfiltro pai pertence ao mesmo filtro
        const targetFilterId =
          (updateData as any).filter_id || existingSubFilter.filter_id;
        if (parentSubFilter.filter_id !== targetFilterId) {
          throw new AppError(
            'O subfiltro pai deve pertencer ao mesmo filtro.',
            400,
          );
        }
      }

      // Validar status se fornecido
      if (
        updateData.status &&
        !Object.values(FilterStatus).includes(updateData.status)
      ) {
        throw new AppError(
          `Valor inválido para status: ${updateData.status}. Valores permitidos são: ${Object.values(FilterStatus).join(', ')}.`,
          400,
        );
      }

      const updatedSubFilter = await this.subFilterRepository.update(
        subFilterId,
        updateData,
      );

      if (!updatedSubFilter) {
        throw new AppError('Subfiltro não encontrado após atualização', 404);
      }

      logger.info(`Subfiltro atualizado com sucesso: ${subFilterId}`);
      return updatedSubFilter;
    } catch (error) {
      logger.error('Erro ao atualizar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Erro interno do servidor ao atualizar subfiltro',
        500,
      );
    }
  }

  /**
   * Deleta um subfiltro e todos os seus subfiltros filhos
   * @param subFilterId ID do subfiltro
   */
  async deleteSubFilter(subFilterId: string): Promise<void> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }

      // Verificar se o subfiltro existe
      const existingSubFilter =
        await this.subFilterRepository.getById(subFilterId);
      if (!existingSubFilter) {
        throw new AppError('Subfiltro não encontrado', 404);
      }

      await this.subFilterRepository.delete(subFilterId);

      logger.info(`Subfiltro deletado com sucesso: ${subFilterId}`);
    } catch (error) {
      logger.error('Erro ao deletar subfiltro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao deletar subfiltro', 500);
    }
  }

  /**
   * Lista subfiltros por ID do filtro
   * @param filterId ID do filtro
   * @param options Opções de listagem
   * @returns Resultado da listagem de subfiltros
   */
  async listSubFiltersByFilterId(
    filterId: string,
    options?: SubFilterListOptions,
  ): Promise<SubFilterListResult> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }

      // Verificar se o filtro existe
      const parentFilter = await this.filterService.getFilterById(filterId);
      if (!parentFilter) {
        throw new AppError(`Filtro com ID ${filterId} não encontrado.`, 404);
      }

      const result = await this.subFilterRepository.listByFilterId(
        filterId,
        options,
      );

      logger.info(
        `${result.sub_filters.length} subfiltros encontrados para o filtro ${filterId}`,
      );
      return result;
    } catch (error) {
      logger.error('Erro ao listar subfiltros por filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao listar subfiltros', 500);
    }
  }

  /**
   * Obtém a categoria do filtro pai de um subfiltro
   * @param subFilterId ID do subfiltro
   * @returns Categoria do filtro pai ou null
   */
  async getParentFilterCategory(
    subFilterId: string,
  ): Promise<FilterCategory | null> {
    try {
      if (!subFilterId) {
        throw new AppError('ID do subfiltro é obrigatório', 400);
      }

      const category =
        await this.subFilterRepository.getParentFilterCategory(subFilterId);

      if (!category) {
        logger.warn(
          `Categoria do filtro pai não encontrada para o subfiltro: ${subFilterId}`,
        );
        return null;
      }

      return category;
    } catch (error) {
      logger.error('Erro ao buscar categoria do filtro pai:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Erro interno do servidor ao buscar categoria do filtro pai',
        500,
      );
    }
  }
}
