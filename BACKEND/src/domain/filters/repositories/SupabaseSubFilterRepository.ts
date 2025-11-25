import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabase';
import {
  SubFilter,
  SubFilterCreatePayload,
  SubFilterListOptions,
  SubFilterListResult,
  FilterCategory,
} from '../types';
import { ISubFilterRepository } from './ISubFilterRepository';

const SUBFILTERS_TABLE = 'sub_filters';
const FILTERS_TABLE = 'filters';

export class SupabaseSubFilterRepository implements ISubFilterRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async create(data: SubFilterCreatePayload): Promise<SubFilter> {
    if (!data.filter_id) {
      throw new Error(
        'O ID do filtro pai é obrigatório para criar um subfiltro.',
      );
    }

    // Verificar se o filtro pai existe
    const { data: filterExists, error: filterError } = await this.client
      .from(FILTERS_TABLE)
      .select('id')
      .eq('id', data.filter_id)
      .single();

    if (filterError || !filterExists) {
      throw new Error(`Filtro pai com ID ${data.filter_id} não encontrado.`);
    }

    console.log('[SupabaseSubFilterRepository] create() - Dados recebidos:', data);
    
    // Validar que parent_id não seja null ou undefined
    if (!data.parent_id) {
      throw new Error('parent_id é obrigatório para criar subfiltro');
    }
    
    // Gerar nome do subfiltro seguindo o padrão: remover acentos, capitalizar palavras
    const nameId = data.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .split(/\s+/) // Divide por espaços
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza cada palavra
      .join('') // Junta sem espaços
      || `sub_${Date.now()}`;
    
    // Gerar ID composto: parentId_nome
    const id = `${data.parent_id}_${nameId}`;
    
    const now = new Date();

    const newSubFilter = {
      ...data,
      id,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now,
    };

    console.log('[SupabaseSubFilterRepository] create() - Dados a inserir:', newSubFilter);

    const { data: result, error } = await this.client
      .from(SUBFILTERS_TABLE)
      .insert(newSubFilter)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseSubFilterRepository] create() - Erro:', error);
      throw new Error(`Erro ao criar subfiltro: ${error.message}`);
    }

    console.log('[SupabaseSubFilterRepository] create() - Resultado:', result);
    return this.mapFromDatabase(result);
  }

  async getById(id: string): Promise<SubFilter | null> {
    const { data, error } = await this.client
      .from(SUBFILTERS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar subfiltro: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async listByFilterId(
    filter_id: string,
    options?: SubFilterListOptions,
  ): Promise<SubFilterListResult> {
    if (!filter_id) {
      throw new Error('O ID do filtro é obrigatório para listar subfiltros.');
    }

    let query = this.client
      .from(SUBFILTERS_TABLE)
      .select('*')
      .eq('filter_id', filter_id);

    if (typeof options?.is_active === 'boolean') {
      query = query.eq('is_active', options.is_active);
    }



    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    // Ordenação
    query = query.order('order', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar subfiltros: ${error.message}`);
    }

    return {
      sub_filters: data.map((item) => this.mapFromDatabase(item)),
    };
  }

  async update(
    id: string,
    data: Partial<Omit<SubFilter, 'id' | 'created_at' | 'updated_at' | 'filter_id'>>,
  ): Promise<SubFilter | null> {
    if (!id) {
      throw new Error('O ID do subfiltro é obrigatório para atualização.');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: result, error } = await this.client
      .from(SUBFILTERS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao atualizar subfiltro: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error('O ID do subfiltro é obrigatório para exclusão.');
    }

    // Primeiro, deletar todos os subfiltros filhos
    const { error: childrenError } = await this.client
      .from(SUBFILTERS_TABLE)
      .delete()
      .eq('parent_id', id);

    if (childrenError) {
      throw new Error(
        `Erro ao deletar subfiltros filhos: ${childrenError.message}`,
      );
    }

    // Depois, deletar o subfiltro
    const { error } = await this.client
      .from(SUBFILTERS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar subfiltro: ${error.message}`);
    }
  }

  async getParentFilterCategory(subFilterId: string): Promise<FilterCategory | null> {
    if (!subFilterId) {
      throw new Error('O ID do subfiltro é obrigatório.');
    }

    const { data, error } = await this.client
      .from(SUBFILTERS_TABLE)
      .select('filter:filter_id(category)')
      .eq('id', subFilterId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar categoria do filtro pai: ${error.message}`);
    }

    return data?.filter?.[0]?.category || null;
  }



  private mapFromDatabase(data: any): SubFilter {
    return {
      id: data.id,
      filter_id: data.filter_id,
      name: data.name,
      order: data.order,
      is_active: data.is_active,
      parent_id: data.parent_id,
      status: data.status,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}
