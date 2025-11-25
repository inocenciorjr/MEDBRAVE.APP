import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../../config/supabase';
import {
  Filter,
  FilterCreatePayload,
  FilterListOptions,
  FilterUpdatePayload,
} from '../types';
import { IFilterRepository } from './IFilterRepository';

const FILTERS_TABLE = 'filters';

export class SupabaseFilterRepository implements IFilterRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async create(data: FilterCreatePayload): Promise<Filter> {

    
    // Gerar ID seguindo o padrão: remover acentos, manter primeira letra maiúscula de cada palavra
    const id = data.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .split(/\s+/) // Divide por espaços
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza cada palavra
      .join('') // Junta sem espaços
      || `filter_${Date.now()}`;
    
    const now = new Date();

    // Mapear camelCase para snake_case para o banco
    const newFilter = {
      id,
      name: data.name,
      description: (data as any).description || null,
      category: data.category,
      is_global: (data as any).isGlobal ?? data.is_global ?? false,
      filter_type: (data as any).filterType || data.filter_type || 'CONTENT',
      status: data.status || 'active',
      created_at: now,
      updated_at: now,
    };



    const { data: result, error } = await this.client
      .from(FILTERS_TABLE)
      .insert(newFilter)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseFilterRepository] create() - Erro:', error);
      throw new Error(`Erro ao criar filtro: ${error.message}`);
    }


    return this.mapFromDatabase(result);
  }

  async getById(id: string): Promise<Filter | null> {
    const { data, error } = await this.client
      .from(FILTERS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar filtro: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async list(options?: FilterListOptions): Promise<Filter[]> {
    // Buscar filtros
    let query = this.client.from(FILTERS_TABLE).select('*');

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (typeof options?.is_global === 'boolean') {
      query = query.eq('is_global', options.is_global);
    }

    if (options?.filter_type) {
      query = query.eq('filter_type', options.filter_type);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
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

    // console.log('[SupabaseFilterRepository] Executando query...');
    const { data: filters, error } = await query;

    if (error) {
      console.error('[SupabaseFilterRepository] Erro na query:', error);
      throw new Error(`Erro ao listar filtros: ${error.message}`);
    }

    // console.log('[SupabaseFilterRepository] Filtros retornados:', filters?.length || 0);

    // Construir filtros com subfiltros
    // console.log('[SupabaseFilterRepository] Iniciando busca de subfiltros para cada filtro...');
    const filtersWithSubfilters = await Promise.all(
      filters.map(async (filter) => {
        // console.log(`[SupabaseFilterRepository] Buscando subfiltros para ${filter.name} (${filter.id})...`);
        
        // Buscar TODOS os subfiltros relacionados a este filtro
        // Isso inclui subfiltros de todos os níveis
        const allSubfilters = await this.getAllSubfiltersForFilter(filter.id);
        
        // console.log(`[SupabaseFilterRepository] Subfiltros encontrados para ${filter.name}:`, allSubfilters.length);
        
        // Construir hierarquia
        const hierarchicalSubfilters = this.buildSubfilterHierarchy(allSubfilters);
        
        // Hierarquia construída

        return {
          ...filter,
          subfilters: hierarchicalSubfilters,
        };
      })
    );

    const mappedFilters = filtersWithSubfilters.map((item) => this.mapFromDatabase(item));
    return mappedFilters;
  }

  /**
   * Busca todos os subfiltros relacionados a um filtro, incluindo subfiltros aninhados
   * Busca recursivamente todos os níveis da hierarquia
   */
  private async getAllSubfiltersForFilter(filterId: string): Promise<any[]> {
    // Buscar subfiltros de primeiro nível (que têm filter_id)
    const { data: rootSubfilters, error } = await this.client
      .from('sub_filters')
      .select('*')
      .eq('filter_id', filterId)
      .order('order', { ascending: true });

    if (error) {
      console.error('[SupabaseFilterRepository] Erro ao buscar subfiltros raiz:', error);
      return [];
    }

    if (!rootSubfilters || rootSubfilters.length === 0) {
      return [];
    }

    // Coletar todos os subfiltros (incluindo aninhados)
    const allSubfilters: any[] = [...rootSubfilters];
    const processedIds = new Set<string>();
    
    // Função recursiva para buscar filhos
    const fetchChildren = async (parentIds: string[]): Promise<void> => {
      if (parentIds.length === 0) return;
      
      // Buscar subfiltros que têm esses IDs como parent_id
      const { data: children } = await this.client
        .from('sub_filters')
        .select('*')
        .in('parent_id', parentIds)
        .order('order', { ascending: true });

      if (children && children.length > 0) {
        const newChildIds: string[] = [];
        
        children.forEach(child => {
          if (!processedIds.has(child.id)) {
            allSubfilters.push(child);
            processedIds.add(child.id);
            newChildIds.push(child.id);
          }
        });
        
        // Buscar recursivamente os filhos dos filhos
        if (newChildIds.length > 0) {
          await fetchChildren(newChildIds);
        }
      }
    };

    // Marcar subfiltros raiz como processados
    rootSubfilters.forEach(sub => processedIds.add(sub.id));
    
    // Buscar todos os filhos recursivamente
    const rootIds = rootSubfilters.map(sub => sub.id);
    await fetchChildren(rootIds);

    return allSubfilters;
  }

  /**
   * Constrói hierarquia de subfiltros a partir de uma lista plana
   * Baseado na lógica do frontend-temp/AdminQuestionsBulkCreatePage.tsx
   */
  private buildSubfilterHierarchy(subfilters: any[]): any[] {
    if (!subfilters || subfilters.length === 0) {
      return [];
    }

    // Criar mapa de todos os subfiltros por ID
    const nodeMap: { [key: string]: any } = {};
    
    // Primeiro passo: criar todos os nós com array de children vazio
    subfilters.forEach(sub => {
      nodeMap[sub.id] = { 
        ...sub, 
        children: [] 
      };
    });

    // Segundo passo: construir a hierarquia conectando filhos aos pais
    const rootSubfilters: any[] = [];
    
    subfilters.forEach(sub => {
      const node = nodeMap[sub.id];
      
      // Se tem parent_id e o parent existe no mapa, adicionar como filho
      if (sub.parent_id && nodeMap[sub.parent_id]) {
        nodeMap[sub.parent_id].children.push(node);
      } else {
        // É raiz apenas se:
        // 1. parent_id é igual ao filter_id (ex: parent_id="ClinicaMedica", filter_id="ClinicaMedica")
        // 2. OU parent_id é null e tem filter_id
        const isRoot = (sub.parent_id === sub.filter_id) || (!sub.parent_id && sub.filter_id);
        
        if (isRoot) {
          rootSubfilters.push(node);
        }
        // Se não é raiz e o parent não existe no mapa, é órfão - não adicionar
      }
    });

    // Log para debug: verificar se os children foram adicionados corretamente
    // Debug removido

    return rootSubfilters;
  }

  async update(id: string, data: FilterUpdatePayload): Promise<Filter | null> {
    const updateData = {
      ...data,
      updated_at: new Date(),
    };

    const { data: result, error } = await this.client
      .from(FILTERS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao atualizar filtro: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  async delete(id: string): Promise<void> {
    // Primeiro, deletar todos os subfiltros relacionados
    const { error: subFiltersError } = await this.client
      .from('sub_filters')
      .delete()
      .eq('filter_id', id);

    if (subFiltersError) {
      throw new Error(`Erro ao deletar subfiltros: ${subFiltersError.message}`);
    }

    // Depois, deletar o filtro
    const { error } = await this.client
      .from(FILTERS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar filtro: ${error.message}`);
    }
  }

  private mapFromDatabase(data: any): Filter {
    const filter: Filter = {
      id: data.id,
      name: data.name,
      category: data.category,
      is_global: data.is_global,
      filter_type: data.filter_type,
      status: data.status,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };

    // Incluir subfiltros se existirem - mapear para 'children' para compatibilidade com frontend
    if (data.subfilters && Array.isArray(data.subfilters)) {
      const mappedChildren = this.mapSubfiltersToChildren(data.subfilters);
      (filter as any).children = mappedChildren;
    }

    return filter;
  }

  /**
   * Mapeia subfiltros recursivamente para o formato do frontend
   */
  private mapSubfiltersToChildren(subfilters: any[]): any[] {
    return subfilters.map((sub: any) => {
      // Validar e converter datas
      const createdAt = sub.created_at ? new Date(sub.created_at) : new Date();
      const updatedAt = sub.updated_at ? new Date(sub.updated_at) : new Date();
      
      const hasChildren = sub.children && Array.isArray(sub.children) && sub.children.length > 0;
      
      if (hasChildren) {
        // console.log(`[SupabaseFilterRepository] Mapeando subfiltro ${sub.name} com ${sub.children.length} children`);
      }
      
      return {
        id: sub.id,
        filterId: sub.filter_id,  // camelCase para frontend
        parentId: sub.parent_id,  // camelCase para frontend
        name: sub.name,
        order: sub.order,
        isActive: sub.is_active,  // camelCase para frontend
        status: sub.status,
        createdAt: !isNaN(createdAt.getTime()) ? createdAt.toISOString() : new Date().toISOString(),
        updatedAt: !isNaN(updatedAt.getTime()) ? updatedAt.toISOString() : new Date().toISOString(),
        children: hasChildren
          ? this.mapSubfiltersToChildren(sub.children)  // Recursivo
          : [],
      };
    });
  }
}
