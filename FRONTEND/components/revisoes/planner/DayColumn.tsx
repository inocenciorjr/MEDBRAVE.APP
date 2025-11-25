'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlannerItem } from './types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface DayColumnProps {
  date: Date;
  tasks: PlannerItem[];
  isToday: boolean;
  onAddTask: () => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: PlannerItem) => void;
}

export function DayColumn({ date, tasks, isToday: isTodayFlag, onAddTask, onDeleteTask, onEditTask }: DayColumnProps) {
  const dateKey = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
  });

  const dayName = format(date, 'EEE', { locale: ptBR });
  const dayNumber = format(date, 'd');

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-[600px] rounded-xl border-2 transition-all ${
        isTodayFlag
          ? 'bg-primary/5 border-primary'
          : isOver
          ? 'bg-primary/10 border-primary border-dashed'
          : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
      }`}
    >
      {/* Header do Dia */}
      <div className={`p-4 border-b-2 ${
        isTodayFlag 
          ? 'border-primary' 
          : 'border-border-light dark:border-border-dark'
      }`}>
        <div className="text-center">
          <p className={`text-sm font-medium uppercase ${
            isTodayFlag 
              ? 'text-primary' 
              : 'text-text-light-secondary dark:text-text-dark-secondary'
          }`}>
            {dayName}
          </p>
          <p className={`text-2xl font-bold ${
            isTodayFlag
              ? 'text-primary'
              : 'text-text-light-primary dark:text-text-dark-primary'
          }`}>
            {dayNumber}
          </p>
        </div>
        
        {tasks.length > 0 && (
          <div className="mt-2 text-center">
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {tasks.length} {tasks.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}
      </div>

      {/* Lista de Tarefas/Revisões */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={() => onEditTask(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-light-secondary dark:text-text-dark-secondary text-sm">
            Nenhuma atividade
          </div>
        )}
      </div>

      {/* Botão de Adicionar */}
      <div className="p-2 border-t-2 border-border-light dark:border-border-dark">
        <button
          onClick={onAddTask}
          className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark
                   hover:border-primary hover:bg-primary/5 transition-all
                   text-text-light-secondary dark:text-text-dark-secondary hover:text-primary
                   flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>
    </div>
  );
}
