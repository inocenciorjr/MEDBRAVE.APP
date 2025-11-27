'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import QuestionFilters, { QuestionFilterValues } from '@/components/admin/questions/QuestionFilters';
import QuestionTable from '@/components/admin/questions/QuestionTable';
import QuestionModal from '@/components/admin/questions/QuestionModal';
import BulkEditModal from '@/components/admin/questions/BulkEditModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { Question } from '@/types/admin/question';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  getQuestions,
  updateQuestion,
  deleteQuestion,
  bulkEditFilters,
  bulkDeleteQuestions,
  getQuestionStats
} from '@/services/admin/questionService';

type SortField = 'id' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

export default function QuestionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtro
  const [filters, setFilters] = useState<QuestionFilterValues>({
    search: '',
    status: 'all',
    difficulty: 'all'
  });

  // Estados de ordenação
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estados de seleção
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  // Estados dos modais
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Estados de estatísticas
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0
  });

  // Carregar questões e estatísticas
  useEffect(() => {
    loadQuestions();
    loadStats();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getQuestions({ page: 1, limit: 100 });
      setQuestions(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar questões');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getQuestionStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Filtrar e ordenar questões
  const filteredAndSortedQuestions = useMemo(() => {
    let filtered = questions.filter(question => {
      const matchesSearch =
        filters.search === '' ||
        question.statement.toLowerCase().includes(filters.search.toLowerCase()) ||
        question.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()));

      const matchesStatus = filters.status === 'all' || question.status === filters.status;
      const matchesDifficulty = filters.difficulty === 'all' || question.difficulty === filters.difficulty;

      return matchesSearch && matchesStatus && matchesDifficulty;
    });

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'status':
          aVal = a.status || 'DRAFT';
          bVal = b.status || 'DRAFT';
          break;
        case 'date':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [questions, filters, sortField, sortDirection]);

  // Handlers
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleFilterChange = (newFilters: QuestionFilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      difficulty: 'all'
    });
  };

  const handleRowClick = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (questionId: string, updates: Partial<Question>) => {
    try {
      await updateQuestion(questionId, updates);
      await loadQuestions();
      await loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar questão');
      throw err;
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      await loadQuestions();
      await loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar questão');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deletar ${selectedQuestions.size} questões? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await bulkDeleteQuestions(Array.from(selectedQuestions));
      setSelectedQuestions(new Set());
      await loadQuestions();
      await loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar questões');
    }
  };

  const handleBulkEditSave = async (changes: any) => {
    try {
      await bulkEditFilters({
        questionIds: Array.from(selectedQuestions),
        ...changes
      });
      setSelectedQuestions(new Set());
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao editar filtros');
      throw err;
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Questões', icon: 'quiz', href: '/admin/questions' }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Gestão de Questões
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Gerencie questões do banco de questões da plataforma
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton onClick={loadQuestions} disabled={loading} variant="outline">
            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
            Recarregar
          </AdminButton>
          <AdminButton onClick={() => router.push('/admin/questions/bulk')} variant="outline">
            <span className="material-symbols-outlined text-sm mr-2">upload_file</span>
            Criar em Massa
          </AdminButton>
          <AdminButton onClick={() => router.push('/admin/questions/create')}>
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Nova Questão
          </AdminButton>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats
          title="Total de Questões"
          value={stats.total}
          icon="quiz"
          color="blue"
        />
        <AdminStats
          title="Publicadas"
          value={stats.published}
          icon="check_circle"
          color="green"
        />
        <AdminStats
          title="Rascunhos"
          value={stats.draft}
          icon="edit_note"
          color="orange"
        />
        <AdminStats
          title="Arquivadas"
          value={stats.archived}
          icon="archive"
          color="purple"
        />
      </div>

      {/* Filtros */}
      <QuestionFilters
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Bulk Actions */}
      {selectedQuestions.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-primary font-medium flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                {selectedQuestions.size} questão(ões) selecionada(s)
              </span>
              <div className="flex gap-2">
                <AdminButton
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkEditModal(true)}
                  className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                >
                  <span className="material-symbols-outlined text-sm mr-1">edit</span>
                  Editar Filtros
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                >
                  <span className="material-symbols-outlined text-sm mr-1">delete</span>
                  Deletar
                </AdminButton>
              </div>
            </div>
            <button
              onClick={() => setSelectedQuestions(new Set())}
              className="text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Cancelar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            <span className="text-red-700 dark:text-red-400 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Lista de Questões ({filteredAndSortedQuestions.length})
          </h2>
        </div>

        <QuestionTable
          questions={filteredAndSortedQuestions}
          loading={loading}
          selectedQuestions={selectedQuestions}
          onSelectionChange={setSelectedQuestions}
          onRowClick={handleRowClick}
          onSort={handleSort}
          onDelete={handleDeleteQuestion}
        />
      </div>

      {/* Modais */}
      <QuestionModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setSelectedQuestion(null);
        }}
        question={selectedQuestion}
        onSave={handleSaveQuestion}
      />

      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        selectedCount={selectedQuestions.size}
        filters={[]}
        onSave={handleBulkEditSave}
      />
      </div>
    </>
  );
}
