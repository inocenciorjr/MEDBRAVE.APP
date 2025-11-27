'use client';

import React, { useState, useEffect } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import Checkbox from '@/components/ui/Checkbox';

interface Filter {
  id: string;
  name: string;
  children?: SubFilter[];
}

interface SubFilter {
  id: string;
  name: string;
  children?: SubFilter[];
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  filters: Filter[];
  onSave: (changes: BulkEditChanges) => Promise<void>;
}

export interface BulkEditChanges {
  addFilterIds: string[];
  removeFilterIds: string[];
  addSubFilterIds: string[];
  removeSubFilterIds: string[];
  removeAllFilters: boolean;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  filters,
  onSave
}) => {
  const [saving, setSaving] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [selectedSubFilters, setSelectedSubFilters] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'add' | 'remove'>('add');

  const toggleFilter = (filterId: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const toggleFilterSelection = (filterId: string) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const toggleSubFilterSelection = (subFilterId: string) => {
    setSelectedSubFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subFilterId)) {
        newSet.delete(subFilterId);
      } else {
        newSet.add(subFilterId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    const changes: BulkEditChanges = {
      addFilterIds: action === 'add' ? Array.from(selectedFilters) : [],
      removeFilterIds: action === 'remove' ? Array.from(selectedFilters) : [],
      addSubFilterIds: action === 'add' ? Array.from(selectedSubFilters) : [],
      removeSubFilterIds: action === 'remove' ? Array.from(selectedSubFilters) : [],
      removeAllFilters: false
    };

    setSaving(true);
    try {
      await onSave(changes);
      setSelectedFilters(new Set());
      setSelectedSubFilters(new Set());
      onClose();
    } catch (error) {
      console.error('Error saving bulk changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAll = async () => {
    if (!confirm('Tem certeza que deseja remover TODOS os filtros das questões selecionadas?')) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        addFilterIds: [],
        removeFilterIds: [],
        addSubFilterIds: [],
        removeSubFilterIds: [],
        removeAllFilters: true
      });
      onClose();
    } catch (error) {
      console.error('Error removing all filters:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderSubFilters = (subFilters: SubFilter[], level = 0) => {
    return subFilters.map(subFilter => (
      <div key={subFilter.id} style={{ marginLeft: `${level * 1.5}rem` }}>
        <label className="flex items-center gap-2 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded cursor-pointer">
          <Checkbox
            checked={selectedSubFilters.has(subFilter.id)}
            onChange={() => toggleSubFilterSelection(subFilter.id)}
          />
          <span className="material-symbols-outlined text-sm text-orange-600">label</span>
          <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
            {subFilter.name}
          </span>
        </label>
        {subFilter.children && subFilter.children.length > 0 && (
          <div className="ml-4">
            {renderSubFilters(subFilter.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const footer = (
    <div className="flex justify-between items-center w-full">
      <AdminButton
        variant="outline"
        onClick={handleRemoveAll}
        disabled={saving}
        className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
      >
        <span className="material-symbols-outlined text-sm mr-2">delete_sweep</span>
        Remover Todos os Filtros
      </AdminButton>
      <div className="flex gap-3">
        <AdminButton variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </AdminButton>
        <AdminButton onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Aplicar Alterações'}
        </AdminButton>
      </div>
    </div>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Filtros em Lote"
      subtitle={`${selectedCount} questão(ões) selecionada(s)`}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Ação */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
            Ação
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <input
                type="radio"
                name="action"
                value="add"
                checked={action === 'add'}
                onChange={() => setAction('add')}
                className="sr-only"
              />
              <div className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${action === 'add' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }
              `}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-green-600">add_circle</span>
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    Adicionar Filtros
                  </span>
                </div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Adiciona os filtros selecionados às questões
                </p>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="action"
                value="remove"
                checked={action === 'remove'}
                onChange={() => setAction('remove')}
                className="sr-only"
              />
              <div className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${action === 'remove' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }
              `}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-red-600">remove_circle</span>
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    Remover Filtros
                  </span>
                </div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Remove os filtros selecionados das questões
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Seleção de Filtros */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
            Selecione os Filtros
          </label>
          <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 max-h-96 overflow-y-auto border border-border-light dark:border-border-dark">
            {filters.length === 0 ? (
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center py-4">
                Nenhum filtro disponível
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map(filter => (
                  <div key={filter.id}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFilter(filter.id)}
                        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {expandedFilters.has(filter.id) ? 'expand_more' : 'chevron_right'}
                        </span>
                      </button>
                      <label className="flex items-center gap-2 flex-1 p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded cursor-pointer">
                        <Checkbox
                          checked={selectedFilters.has(filter.id)}
                          onChange={() => toggleFilterSelection(filter.id)}
                        />
                        <span className="material-symbols-outlined text-sm text-primary">filter_alt</span>
                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                          {filter.name}
                        </span>
                        {filter.children && filter.children.length > 0 && (
                          <AdminBadge
                            label={`${filter.children.length}`}
                            variant="neutral"
                            size="sm"
                          />
                        )}
                      </label>
                    </div>
                    {expandedFilters.has(filter.id) && filter.children && filter.children.length > 0 && (
                      <div className="ml-6 mt-1">
                        {renderSubFilters(filter.children)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo da Seleção */}
        {(selectedFilters.size > 0 || selectedSubFilters.size > 0) && (
          <div className="bg-primary/5 rounded-lg p-4">
            <h4 className="font-semibold text-primary mb-2">Resumo da Seleção</h4>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
              <p>• {selectedFilters.size} filtro(s) selecionado(s)</p>
              <p>• {selectedSubFilters.size} subfiltro(s) selecionado(s)</p>
              <p className="mt-2 font-medium text-text-light-primary dark:text-text-dark-primary">
                Ação: {action === 'add' ? 'Adicionar' : 'Remover'} em {selectedCount} questão(ões)
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default BulkEditModal;
