'use client';

import { Task } from '@/types';

interface TaskListProps {
  tasks: Task[];
  onCreateTask?: () => void;
}

export default function TaskList({ tasks, onCreateTask }: TaskListProps) {
  const priorityTasks = tasks.filter(task => task.priority === 'high');
  const normalTasks = tasks.filter(task => task.priority === 'normal');

  const handleCreateTask = () => {
    if (onCreateTask) {
      onCreateTask();
    } else {
      console.log('Criar nova tarefa');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
          Tarefas de hoje
        </h2>
        <button className="flex items-center gap-1 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors">
          Todas as tarefas
          <span className="material-symbols-outlined text-base">expand_more</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Priority Section */}
        <p className="font-semibold text-text-light-secondary dark:text-text-dark-secondary">
          Prioridade
        </p>
        
        {priorityTasks.map((task) => (
          <div
            key={task.id}
            className="bg-purple-50 dark:bg-purple-900/50 p-3 rounded-lg flex items-start justify-between gap-3 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-shadow cursor-pointer"
          >
            <div>
              <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                {task.title}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {task.time}
              </p>
            </div>
            <span className="material-symbols-outlined text-primary text-lg">
              notifications_active
            </span>
          </div>
        ))}

        {/* Normal Tasks Section */}
        <p className="font-semibold text-text-light-secondary dark:text-text-dark-secondary pt-2">
          Outros
        </p>
        
        {normalTasks.map((task) => (
          <div
            key={task.id}
            className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex items-start justify-between gap-3 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-shadow cursor-pointer"
          >
            <div>
              <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                {task.title}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {task.time}
              </p>
            </div>
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-lg">
              more_horiz
            </span>
          </div>
        ))}
      </div>

      {/* Create Task Button */}
      <button
        onClick={handleCreateTask}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg mt-6 hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
      >
        Criar Nova Tarefa
      </button>
    </div>
  );
}
