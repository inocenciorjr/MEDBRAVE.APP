'use client';

import React from 'react';
import { AdminTable, ColumnDef } from '@/components/admin/ui/AdminTable';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { Question } from '@/types/admin/question';

interface QuestionTableProps {
  questions: Question[];
  loading?: boolean;
  selectedQuestions: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onRowClick: (question: Question) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onDelete: (questionId: string) => void;
}

const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  loading,
  selectedQuestions,
  onSelectionChange,
  onRowClick,
  onSort,
  onDelete
}) => {
  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'PUBLISHED': return 'success';
      case 'DRAFT': return 'warning';
      case 'ARCHIVED': return 'neutral';
      default: return 'neutral';
    }
  };

  const getDifficultyBadgeVariant = (difficulty: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (difficulty) {
      case 'EASY': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HARD': return 'error';
      default: return 'neutral';
    }
  };

  const columns: ColumnDef<Question>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: 'w-32',
      render: (_, question) => (
        <div className="text-sm font-mono text-text-light-secondary dark:text-text-dark-secondary">
          #{question.id.slice(-8)}
        </div>
      )
    },
    {
      key: 'statement',
      label: 'Questão',
      sortable: false,
      render: (_, question) => (
        <div className="max-w-md">
          <div className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-2">
            {question.statement}
          </div>
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {question.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded"
                >
                  {tag}
                </span>
              ))}
              {question.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  +{question.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'filters',
      label: 'Especialidade',
      sortable: false,
      render: (_, question) => (
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {question.filterIds?.length || 0} filtro(s)
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, question) => (
        <div className="flex flex-col gap-1">
          <AdminBadge
            label={question.status || 'DRAFT'}
            variant={getStatusBadgeVariant(question.status || 'DRAFT')}
            size="sm"
          />
          {question.isAnnulled && (
            <AdminBadge
              label="Anulada"
              variant="error"
              size="sm"
              icon="block"
            />
          )}
          {question.isOutdated && (
            <AdminBadge
              label="Desatualizada"
              variant="warning"
              size="sm"
              icon="schedule"
            />
          )}
        </div>
      )
    },
    {
      key: 'difficulty',
      label: 'Dificuldade',
      sortable: false,
      render: (_, question) => (
        <AdminBadge
          label={question.difficulty || 'MEDIUM'}
          variant={getDifficultyBadgeVariant(question.difficulty || 'MEDIUM')}
          size="sm"
        />
      )
    },
    {
      key: 'createdAt',
      label: 'Data',
      sortable: true,
      render: (_, question) => (
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {new Date(question.createdAt).toLocaleDateString('pt-BR')}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, question) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(question);
            }}
            className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Tem certeza que deseja excluir esta questão?')) {
                onDelete(question.id);
              }
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Excluir
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminTable
      data={questions}
      columns={columns}
      loading={loading}
      onSort={onSort}
      onRowClick={onRowClick}
      selectable
      selectedRows={selectedQuestions}
      onSelectionChange={onSelectionChange}
      emptyMessage="Nenhuma questão encontrada"
    />
  );
};

export default QuestionTable;
