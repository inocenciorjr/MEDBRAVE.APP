'use client';

import { TaskCategory } from '@/types';

interface TasksChartProps {
  tasks: TaskCategory[];
  total: number;
}

export default function TasksChart({ tasks, total }: TasksChartProps) {
  // Calculate percentages and cumulative offsets for donut chart
  const segments = tasks.map((task, index) => {
    const percentage = (task.count / total) * 100;
    const previousPercentage = tasks
      .slice(0, index)
      .reduce((sum, t) => sum + (t.count / total) * 100, 0);
    
    return {
      ...task,
      percentage,
      offset: -previousPercentage,
    };
  });

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
      <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">
        Tarefas Concluídas
      </h2>
      
      {/* Donut Chart */}
      <div className="flex justify-center items-center my-6">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              className="stroke-current text-gray-200 dark:text-gray-600"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              strokeWidth="3"
            />
            
            {/* Colored segments */}
            {segments.map((segment, index) => (
              <path
                key={index}
                className={`stroke-current ${segment.color}`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeDasharray={`${segment.percentage}, 100`}
                strokeDashoffset={segment.offset}
                strokeLinecap="round"
                strokeWidth="4"
              />
            ))}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {total}
            </span>
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Tarefas
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${task.color.replace('text-', 'bg-')}`}></span>
            {task.name}
          </div>
        ))}
      </div>
    </div>
  );
}
