'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlannerItem } from './types';
import { BookOpen, Brain, AlertCircle, Clock, GripVertical, Trash2, Edit2, Check } from 'lucide-react';

interface TaskCardProps {
  task: PlannerItem;
  onDelete: () => void;
  onEdit: () => void;
}

export function TaskCard({ task, onDelete, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    if (task.type === 'review') {
      switch (task.content_type) {
        case 'QUESTION':
          return <BookOpen className="h-4 w-4" />;
        case 'FLASHCARD':
          return <Brain className="h-4 w-4" />;
        case 'ERROR_NOTEBOOK':
          return <AlertCircle className="h-4 w-4" />;
      }
    }
    return <Check className="h-4 w-4" />;
  };

  const getColorClasses = () => {
    // Safelist para Tailwind: border-blue-500 bg-blue-50 dark:bg-blue-900/20 border-green-500 bg-green-50 dark:bg-green-900/20 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-orange-500 bg-orange-50 dark:bg-orange-900/20 border-pink-500 bg-pink-50 dark:bg-pink-900/20 border-gray-500 bg-gray-50 dark:bg-gray-900/20
    const baseClasses = 'border-l-4';
    
    console.log('[TaskCard] Cor recebida:', task.color);
    
    switch (task.color) {
      case 'blue':
        return `${baseClasses} border-blue-500 bg-blue-50 dark:bg-blue-900/20`;
      case 'purple':
        return `${baseClasses} border-purple-500 bg-purple-50 dark:bg-purple-900/20`;
      case 'red':
        return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-900/20`;
      case 'green':
        return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20`;
      case 'yellow':
        return `${baseClasses} border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20`;
      case 'orange':
        return `${baseClasses} border-orange-500 bg-orange-50 dark:bg-orange-900/20`;
      case 'pink':
        return `${baseClasses} border-pink-500 bg-pink-50 dark:bg-pink-900/20`;
      case 'gray':
        return `${baseClasses} border-gray-500 bg-gray-50 dark:bg-gray-900/20`;
      default:
        console.log('[TaskCard] Cor não mapeada, usando cinza');
        return `${baseClasses} border-gray-500 bg-gray-50 dark:bg-gray-900/20`;
    }
  };

  const getTextColorClass = () => {
    switch (task.color) {
      case 'blue':
        return 'text-blue-700 dark:text-blue-300';
      case 'purple':
        return 'text-purple-700 dark:text-purple-300';
      case 'red':
        return 'text-red-700 dark:text-red-300';
      case 'green':
        return 'text-green-700 dark:text-green-300';
      case 'yellow':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'orange':
        return 'text-orange-700 dark:text-orange-300';
      case 'pink':
        return 'text-pink-700 dark:text-pink-300';
      case 'indigo':
        return 'text-indigo-700 dark:text-indigo-300';
      case 'teal':
        return 'text-teal-700 dark:text-teal-300';
      case 'lime':
        return 'text-lime-700 dark:text-lime-300';
      case 'amber':
        return 'text-amber-700 dark:text-amber-300';
      case 'emerald':
        return 'text-emerald-700 dark:text-emerald-300';
      case 'sky':
        return 'text-sky-700 dark:text-sky-300';
      case 'rose':
        return 'text-rose-700 dark:text-rose-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move ${getColorClasses()}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={getTextColorClass()}>
              {getIcon()}
            </div>
            <h4 className={`font-semibold text-sm truncate ${getTextColorClass()}`}>
              {task.title}
            </h4>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            >
              <Edit2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            >
              <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        {/* Subtitle */}
        {task.type === 'review' && task.subtitle && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
            {task.subtitle}
          </p>
        )}

        {/* Description for tasks */}
        {task.type === 'task' && task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
            {task.description}
          </p>
        )}

        {/* Time and Duration */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.time && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.time}</span>
            </div>
          )}
          <span>{task.duration} min</span>
        </div>

        {/* Completed checkbox for tasks */}
        {task.type === 'task' && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(e) => {
                // TODO: Handle completion
                e.stopPropagation();
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {task.completed ? 'Concluída' : 'Pendente'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
