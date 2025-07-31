import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ExternalLink, Check, Trash2, Clock, Target, BookOpen, Brain, User, Move } from 'lucide-react';

const statusColors = {
  PENDING: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300',
  COMPLETED: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300',
  SKIPPED: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800/20 dark:border-gray-600 dark:text-gray-400',
  POSTPONED: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
};

const typeConfig = {
  FSRS_REVIEW: { label: 'Revisão FSRS', icon: Brain, color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700' },
  RECOMMENDATION: { label: 'Recomendação', icon: Target, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700' },
  SIMULADO: { label: 'Simulado', icon: BookOpen, color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700' },
  MANUAL: { label: 'Manual', icon: User, color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700' },
};

const manualTypeLabels = {
  LISTA_QUESTOES: 'Lista de Questões',
  SIMULADO: 'Simulado',
  PROVA_INTEGRA: 'Prova na Íntegra',
  FLASHCARDS: 'Flashcards',
  OUTRO: 'Outro',
};

export default function TaskItem({ task, onComplete, onDelete, onOpenLink }) {
  const typeInfo = typeConfig[task.type] || { label: task.type, icon: Clock, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  const TypeIcon = typeInfo.icon;
  const isCompleted = task.status === 'COMPLETED';
  const isManual = task.type === 'MANUAL';
  
  return (
    <TooltipProvider>
      <div className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        isCompleted 
          ? 'bg-muted/30 border-muted-foreground/20 opacity-75' 
          : 'bg-card border-border hover:border-primary/30 hover:bg-accent/5'
      }`}>
        {/* Indicador de drag para tarefas manuais */}
        {isManual && !isCompleted && (
          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Move className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          {/* Status indicator */}
          <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${
            statusColors[task.status] || statusColors.PENDING
          }`}>
            {isCompleted && <Check className="h-3 w-3" />}
          </div>
          
          {/* Type badge with icon */}
          <Badge variant="outline" className={`flex items-center gap-1.5 px-2.5 py-1 ${typeInfo.color}`}>
            <TypeIcon className="h-3 w-3" />
            <span className="text-xs font-medium">{typeInfo.label}</span>
          </Badge>
          
          {/* Task title */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm truncate ${
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {task.description}
              </p>
            )}
          </div>
          
          {/* Manual type badge */}
          {task.manualType && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {manualTypeLabels[task.manualType] || task.manualType}
            </Badge>
          )}
          
          {/* Priority indicator */}
          {task.priority && task.priority !== 'MEDIUM' && (
            <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs px-2 py-0.5">
              {task.priority === 'HIGH' ? 'Alta' : task.priority === 'LOW' ? 'Baixa' : task.priority}
            </Badge>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {task.targetUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950"
                  onClick={() => onOpenLink(task)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ir para atividade</TooltipContent>
            </Tooltip>
          )}
          
          {!isCompleted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950"
                  onClick={() => onComplete(task)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Marcar como concluída</TooltipContent>
            </Tooltip>
          )}
          
          {isManual && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950"
                  onClick={() => onDelete(task)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deletar tarefa</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}