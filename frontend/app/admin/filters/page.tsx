'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { Filter, SubFilter } from '@/types/admin/filter';
import { useToast } from '@/lib/contexts/ToastContext';
import { SearchInput } from '@/components/flashcards/SearchInput';
import {
  getAllFilters,
  createFilter,
  updateFilter,
  deleteFilter,
  createSubFilter,
  updateSubFilter,
  deleteSubFilter,
  sortFilters,
  countSubFilters
} from '@/services/admin/filterService';

export default function FiltersPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSubFilter, setIsSubFilter] = useState(false);
  const [parentId, setParentId] = useState<string | undefined>();
  const [rootFilterId, setRootFilterId] = useState<string | undefined>();
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllFilters();
      console.log('[loadFilters] Dados recebidos:', data);
      console.log('[loadFilters] Primeiro filtro:', data[0]);
      setFilters(sortFilters(data));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar filtros');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalFilters: filters.length,
    totalSubFilters: filters.reduce((acc, f) => acc + countSubFilters(f), 0),
    activeFilters: filters.filter(f => f.status === 'ACTIVE').length
  };

  const toggleNode = (id: string, event?: React.MouseEvent) => {
    // Prevenir scroll para o topo
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Salvar posição atual do scroll
    const scrollPosition = window.scrollY;

    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    // Restaurar posição do scroll após o React atualizar o DOM
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  const openCreateModal = (parentFilterId?: string, isSubFilterCreate = false, rootFilterId?: string) => {
    console.log('[openCreateModal] Params:', { parentFilterId, isSubFilterCreate, rootFilterId });

    setModalMode('create');
    setIsSubFilter(isSubFilterCreate);
    setParentId(parentFilterId);
    setCurrentItem({
      name: '',
      description: '',
      category: 'MEDICAL_SPECIALTY',
      status: 'ACTIVE',
      rootFilterId: rootFilterId || parentFilterId, // Armazena o ID do filtro raiz
      parentId: parentFilterId // Também armazena o parentId no currentItem
    });
    setShowModal(true);
  };

  const openEditModal = (item: Filter | SubFilter, isSub: boolean) => {
    setModalMode('edit');
    setIsSubFilter(isSub);
    setCurrentItem(item);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentItem?.name?.trim()) {
      toast.warning('Campo obrigatório', 'Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        if (isSubFilter && parentId) {
          // Buscar o filtro raiz correto
          const rootFilterId = currentItem.rootFilterId || parentId;
          // Usar o parentId do currentItem se existir, senão usar o state parentId
          const actualParentId = currentItem.parentId || parentId;

          console.log('[handleSave] Criando subfiltro:', {
            filterId: rootFilterId,
            parentId: actualParentId,
            name: currentItem.name,
            debug: {
              currentItemRootFilterId: currentItem.rootFilterId,
              currentItemParentId: currentItem.parentId,
              stateParentId: parentId
            }
          });

          await createSubFilter({
            filterId: rootFilterId, // Sempre usa o ID do filtro raiz
            parentId: actualParentId, // Sempre envia o parentId (pode ser o filtro raiz ou outro subfiltro)
            name: currentItem.name,
            order: 0,
            isActive: currentItem.status === 'ACTIVE',
            status: currentItem.status
          });
        } else {
          console.log('[handleSave] Criando filtro:', {
            name: currentItem.name
          });

          await createFilter({
            name: currentItem.name,
            description: currentItem.description,
            category: currentItem.category,
            status: currentItem.status,
            isGlobal: false,
            filterType: 'CONTENT'
          });
        }
      } else {
        if (isSubFilter) {
          await updateSubFilter(currentItem.id, currentItem);
        } else {
          await updateFilter(currentItem.id, currentItem);
        }
      }
      setShowModal(false);
      await loadFilters();
      toast.success('Salvo!', 'Item salvo com sucesso');
    } catch (err: any) {
      toast.error('Erro ao salvar', err.message || 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, isSub: boolean) => {
    console.log('[handleDelete] ID recebido:', id, 'isSub:', isSub);

    if (!id) {
      toast.error('Erro', 'ID inválido para exclusão');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir?')) return;

    try {
      if (isSub) {
        await deleteSubFilter(id);
      } else {
        await deleteFilter(id);
      }
      await loadFilters();
      toast.success('Excluído!', 'Item excluído com sucesso');
    } catch (err: any) {
      console.error('[handleDelete] Erro:', err);
      toast.error('Erro ao excluir', err.message || 'Não foi possível excluir');
    }
  };

  const renderSubFilters = (subFilters: SubFilter[], level = 0, rootFilterId?: string) => {
    return sortFilters(subFilters).map(sub => {
      // Usar o filterId do subfiltro ou o rootFilterId passado
      const currentRootFilterId = (sub as any).filterId || rootFilterId;

      return (
        <div key={sub.id} style={{ marginLeft: `${level * 1.5}rem` }} className="mt-2">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {sub.children && sub.children.length > 0 && (
                  <button onClick={(e) => toggleNode(sub.id, e)} className="text-text-light-secondary dark:text-text-dark-secondary">
                    <span className="material-symbols-outlined text-sm">
                      {expandedNodes.has(sub.id) ? 'expand_more' : 'chevron_right'}
                    </span>
                  </button>
                )}
                <span className="material-symbols-outlined text-orange-600">label</span>
                <div>
                  <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">{highlightText(sub.name, search)}</h4>
                  {sub.description && <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{highlightText(sub.description, search)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AdminBadge label={sub.status} variant={sub.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" />
                <AdminButton size="sm" variant="outline" onClick={() => openCreateModal(sub.id, true, currentRootFilterId)}>
                  <span className="material-symbols-outlined text-xs">add</span>
                </AdminButton>
                <AdminButton size="sm" variant="outline" onClick={() => openEditModal(sub, true)}>
                  <span className="material-symbols-outlined text-xs">edit</span>
                </AdminButton>
                <AdminButton size="sm" variant="outline" onClick={() => handleDelete(sub.id, true)}>
                  <span className="material-symbols-outlined text-xs">delete</span>
                </AdminButton>
              </div>
            </div>
          </div>
          {expandedNodes.has(sub.id) && sub.children && sub.children.length > 0 && (
            <div className="mt-2">{renderSubFilters(sub.children, level + 1, currentRootFilterId)}</div>
          )}
        </div>
      );
    });
  };

  // Função recursiva para buscar em toda a hierarquia
  const searchInHierarchy = (item: Filter | SubFilter, searchTerm: string): boolean => {
    const term = searchTerm.toLowerCase();

    // Verificar se o item atual corresponde
    if (item.name.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term)) {
      return true;
    }

    // Verificar recursivamente nos filhos
    if (item.children && item.children.length > 0) {
      return item.children.some(child => searchInHierarchy(child, searchTerm));
    }

    return false;
  };

  // Expandir automaticamente nós que contêm resultados de busca
  useEffect(() => {
    if (search !== '') {
      const nodesToExpand = new Set<string>();

      const expandMatchingNodes = (item: Filter | SubFilter, parentIds: string[] = []) => {
        const matches = searchInHierarchy(item, search);

        if (matches) {
          // Expandir todos os pais
          parentIds.forEach(id => nodesToExpand.add(id));
          nodesToExpand.add(item.id);
        }

        if (item.children && item.children.length > 0) {
          item.children.forEach(child => {
            expandMatchingNodes(child, [...parentIds, item.id]);
          });
        }
      };

      filters.forEach(filter => expandMatchingNodes(filter));
      setExpandedNodes(nodesToExpand);
    }
  }, [search, filters]);

  const filteredFilters = filters.filter(f => search === '' || searchInHierarchy(f, search));

  // Função para destacar texto de busca
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return text;
    }

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Filtros', icon: 'filter_alt', href: '/admin/filters' }
        ]}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Gestão de Filtros</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Organize e gerencie filtros e subfiltros do sistema</p>
          </div>
          <AdminButton onClick={() => openCreateModal()}>
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Novo Filtro
          </AdminButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminStats title="Total de Filtros" value={stats.totalFilters} icon="filter_alt" color="blue" />
          <AdminStats title="Subfiltros" value={stats.totalSubFilters} icon="label" color="green" />
          <AdminStats title="Filtros Ativos" value={stats.activeFilters} icon="check_circle" color="purple" />
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
          <SearchInput
            placeholder="Buscar filtros..."
            value={search}
            onChange={setSearch}
            fullWidth
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredFilters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-light-secondary dark:text-text-dark-secondary">Nenhum filtro encontrado</p>
            </div>
          ) : (
            sortFilters(filteredFilters).map(filter => {
              console.log('[Render] Filter:', filter.name, 'ID:', filter.id);
              return (
                <div key={filter.id} className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {filter.children && filter.children.length > 0 && (
                        <button onClick={(e) => toggleNode(filter.id, e)}>
                          <span className="material-symbols-outlined">{expandedNodes.has(filter.id) ? 'expand_more' : 'chevron_right'}</span>
                        </button>
                      )}
                      <span className="material-symbols-outlined text-primary">filter_alt</span>
                      <div>
                        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">{highlightText(filter.name, search)}</h3>
                        {filter.description && <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">{highlightText(filter.description, search)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminBadge label={`${countSubFilters(filter)} sub`} variant="neutral" size="sm" />
                      <AdminBadge label={filter.status} variant={filter.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" />
                      <AdminButton size="sm" variant="outline" onClick={() => openCreateModal(filter.id, true)}>
                        <span className="material-symbols-outlined text-sm">add</span>
                      </AdminButton>
                      <AdminButton size="sm" variant="outline" onClick={() => openEditModal(filter, false)}>
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </AdminButton>
                      <AdminButton size="sm" variant="outline" onClick={() => handleDelete(filter.id, false)}>
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </AdminButton>
                    </div>
                  </div>
                  {expandedNodes.has(filter.id) && filter.children && filter.children.length > 0 && (
                    <div className="ml-6">{renderSubFilters(filter.children, 0, filter.id)}</div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <AdminModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={modalMode === 'create' ? (isSubFilter ? 'Novo Subfiltro' : 'Novo Filtro') : 'Editar'}
          size="md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <AdminButton variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</AdminButton>
              <AdminButton onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</AdminButton>
            </div>
          }
        >
          <div className="space-y-4">
            <AdminInput
              label="Nome *"
              value={currentItem?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentItem({ ...currentItem, name: e.target.value })}
              required
            />
            <AdminTextarea
              label="Descrição"
              value={currentItem?.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentItem({ ...currentItem, description: e.target.value })}
              rows={3}
            />
            {!isSubFilter && (
              <AdminSelect
                label="Categoria"
                value={currentItem?.category || 'MEDICAL_SPECIALTY'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentItem({ ...currentItem, category: e.target.value })}
                options={[
                  { value: 'INSTITUTIONAL', label: 'Institucional' },
                  { value: 'EDUCATIONAL', label: 'Educacional' },
                  { value: 'MEDICAL_SPECIALTY', label: 'Especialidade Médica' }
                ]}
              />
            )}
            <AdminSelect
              label="Status"
              value={currentItem?.status || 'ACTIVE'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentItem({ ...currentItem, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'INACTIVE', label: 'Inativo' }
              ]}
            />
          </div>
        </AdminModal>
      </div>
    </>
  );
}
