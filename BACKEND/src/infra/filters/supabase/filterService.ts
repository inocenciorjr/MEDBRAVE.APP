import {
  Filter,
  FilterCategory,
  FilterCreatePayload,
  FilterListOptions,
  FilterStatus,
  FilterType,
  FilterUpdatePayload,
} from '../../../domain/filters/types';
import { SupabaseFilterRepository } from '../../../domain/filters/repositories/SupabaseFilterRepository';
import { IFilterRepository } from '../../../domain/filters/repositories/IFilterRepository';
import logger from '../../../utils/logger';
import AppError from '../../../utils/AppError';

/**
 * Serviço para gerenciar filtros no Supabase
 */
export class FilterService {
  private filterRepository: IFilterRepository;

  constructor(filterRepository?: IFilterRepository) {
    this.filterRepository = filterRepository || new SupabaseFilterRepository();
  }

  /**
   * Cria um novo filtro
   * @param data Dados do filtro
   * @returns Filtro criado
   */
  async createFilter(data: FilterCreatePayload): Promise<Filter> {
    try {
      if (
        data.category &&
        !Object.values(FilterCategory).includes(data.category)
      ) {
        throw new AppError(
          `Valor inválido para category: ${data.category}. Valores permitidos são: ${Object.values(FilterCategory).join(', ')}.`,
          400,
        );
      }

      const filterData: FilterCreatePayload = {
        ...data,
        is_global: typeof (data as any).is_global === 'boolean' ? (data as any).is_global : false,
        filter_type: (data as any).filter_type || FilterType.CONTENT,
        status: data.status || FilterStatus.ACTIVE,
      };

      const newFilter = await this.filterRepository.create(filterData);

      logger.info(`Filtro criado com sucesso: ${newFilter.id}`);
      return newFilter;
    } catch (error) {
      logger.error('Erro ao criar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao criar filtro', 500);
    }
  }

  /**
   * Busca um filtro por ID
   * @param filterId ID do filtro
   * @returns Filtro encontrado ou null
   */
  async getFilterById(filterId: string): Promise<Filter | null> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }

      const filter = await this.filterRepository.getById(filterId);

      if (!filter) {
        logger.warn(`Filtro não encontrado: ${filterId}`);
        return null;
      }

      return filter;
    } catch (error) {
      logger.error('Erro ao buscar filtro por ID:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao buscar filtro', 500);
    }
  }

  /**
   * Lista filtros com opções de filtro
   * @param options Opções de filtro
   * @returns Lista de filtros
   */
  async listFilters(options?: FilterListOptions): Promise<Filter[]> {
    try {
      const filters = await this.filterRepository.list(options);

      logger.info(`${filters.length} filtros encontrados`);
      return filters;
    } catch (error) {
      logger.error('Erro ao listar filtros:', error);
      throw new AppError('Erro interno do servidor ao listar filtros', 500);
    }
  }

  /**
   * Atualiza um filtro
   * @param filterId ID do filtro
   * @param updateDataInput Dados para atualização
   * @returns Filtro atualizado ou null
   */
  async updateFilter(
    filterId: string,
    updateDataInput: FilterUpdatePayload,
  ): Promise<Filter | null> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }

      // Verificar se o filtro existe
      const existingFilter = await this.filterRepository.getById(filterId);
      if (!existingFilter) {
        throw new AppError('Filtro não encontrado', 404);
      }

      // Validar filter_type se fornecido
      if (
        (updateDataInput as any).filter_type &&
        !Object.values(FilterType).includes((updateDataInput as any).filter_type)
      ) {
        throw new AppError(
          `Valor inválido para filter_type: ${(updateDataInput as any).filter_type}. Valores permitidos são: ${Object.values(FilterType).join(', ')}.`,
          400,
        );
      }

      // Validar status se fornecido
      if (
        updateDataInput.status &&
        !Object.values(FilterStatus).includes(updateDataInput.status)
      ) {
        throw new AppError(
          `Valor inválido para status: ${updateDataInput.status}. Valores permitidos são: ${Object.values(FilterStatus).join(', ')}.`,
          400,
        );
      }

      const updatedFilter = await this.filterRepository.update(
        filterId,
        updateDataInput,
      );

      if (!updatedFilter) {
        throw new AppError('Filtro não encontrado após atualização', 404);
      }

      logger.info(`Filtro atualizado com sucesso: ${filterId}`);
      return updatedFilter;
    } catch (error) {
      logger.error('Erro ao atualizar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao atualizar filtro', 500);
    }
  }

  /**
   * Deleta um filtro e todos os seus subfiltros
   * @param filterId ID do filtro
   */
  async deleteFilter(filterId: string): Promise<void> {
    try {
      if (!filterId) {
        throw new AppError('ID do filtro é obrigatório', 400);
      }

      // Verificar se o filtro existe
      const existingFilter = await this.filterRepository.getById(filterId);
      if (!existingFilter) {
        throw new AppError('Filtro não encontrado', 404);
      }

      await this.filterRepository.delete(filterId);

      logger.info(`Filtro deletado com sucesso: ${filterId}`);
    } catch (error) {
      logger.error('Erro ao deletar filtro:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro interno do servidor ao deletar filtro', 500);
    }
  }
}

export {};
