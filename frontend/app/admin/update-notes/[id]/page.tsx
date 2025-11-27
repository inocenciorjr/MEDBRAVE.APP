'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getUpdateNoteById,
  updateUpdateNote,
  getQuestionsForNote,
} from '@/lib/api/updateNotes';
import { getFilters, getSubFilters } from '@/lib/services/filterService';
import { useToast } from '@/lib/contexts/ToastContext';

interface Filter {
  id: string;
  name: string;
  category: string;
}

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id: string | null;
  level: number;
}

export default function EditUpdateNotePage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSubFilters, setSelectedSubFilters] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [subFilters, setSubFilters] = useState<SubFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [questionCount, setQuestionCount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [noteId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [note, filtersData, subFiltersData] = await Promise.all([
        getUpdateNoteById(noteId),
        getFilters(),
        getSubFilters(),
      ]);

      setTitle(note.title);
      setContent(note.content);
      setSelectedFilters(note.filter_ids || []);
      setSelectedSubFilters(note.sub_filter_ids || []);
      setFilters(filtersData);
      setSubFilters(subFiltersData);

      // Carregar contagem de questões
      const questions = await getQuestionsForNote(noteId);
      setQuestionCount(questions.length);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar nota');
      router.push('/admin/update-notes');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleSubFilterToggle = (subFilterId: string) => {
    setSelectedSubFilters((prev) =>
      prev.includes(subFilterId)
        ? prev.filter((id) => id !== subFilterId)
        : [...prev, subFilterId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.warning('Título e conteúdo são obrigatórios');
      return;
    }

    if (selectedFilters.length === 0 && selectedSubFilters.length === 0) {
      toast.warning('Selecione pelo menos um filtro ou subfiltro');
      return;
    }

    try {
      setLoading(true);
      await updateUpdateNote(noteId, {
        title,
        content,
        filter_ids: selectedFilters,
        sub_filter_ids: selectedSubFilters,
        last_updated_date: new Date().toISOString(),
      });
      toast.success('Nota atualizada com sucesso!');
      router.push('/admin/update-notes');
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      toast.error('Erro ao atualizar nota');
    } finally {
      setLoading(false);
    }
  };

  const groupedSubFilters = subFilters.reduce((acc, subFilter) => {
    if (!acc[subFilter.filter_id]) {
      acc[subFilter.filter_id] = [];
    }
    acc[subFilter.filter_id].push(subFilter);
    return acc;
  }, {} as Record<string, SubFilter[]>);

  if (loadingData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-all hover:scale-105 active:scale-95 mb-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
            Editar Nota de Atualização
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Esta nota está aplicada a {questionCount} questões
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Título da Nota *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atualização sobre Abordagem inicial (ABCDE)"
              className="w-full px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Conteúdo */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Conteúdo da Nota *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva a atualização de diretriz ou protocolo..."
              className="w-full px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows={8}
              required
            />
          </div>

          {/* Filtros */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Filtros e Subfiltros *
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Selecione os filtros e subfiltros. A nota será exibida em questões que tenham pelo menos um dos filtros/subfiltros selecionados.
            </p>

            <div className="space-y-6">
              {filters.map((filter) => (
                <div key={filter.id} className="border border-border-light dark:border-border-dark rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                  <label className="flex items-center space-x-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(filter.id)}
                      onChange={() => handleFilterToggle(filter.id)}
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {filter.name}
                    </span>
                  </label>

                  {/* Subfiltros */}
                  {groupedSubFilters[filter.id] && groupedSubFilters[filter.id].length > 0 && (
                    <div className="ml-8 space-y-2">
                      {groupedSubFilters[filter.id].map((subFilter) => (
                        <label
                          key={subFilter.id}
                          className="flex items-center space-x-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubFilters.includes(subFilter.id)}
                            onChange={() => handleSubFilterToggle(subFilter.id)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {subFilter.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(selectedFilters.length > 0 || selectedSubFilters.length > 0) && (
              <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <strong>Selecionados:</strong> {selectedFilters.length} filtros e {selectedSubFilters.length} subfiltros
                </p>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-all hover:scale-105 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim() || (selectedFilters.length === 0 && selectedSubFilters.length === 0)}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                'Salvando...'
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
