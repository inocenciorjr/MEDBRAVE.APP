'use client';

import { ActivityData } from '@/types';

interface ActivityChartProps {
  weekData: ActivityData[];
  weeklyIncrease: number;
}

export default function ActivityChart({ weekData, weeklyIncrease }: ActivityChartProps) {
  const maxHours = Math.max(...weekData.map(d => d.hours + d.minutes / 60));
  
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-5 md:p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">
          Atividade por Horas
        </h2>
        <button className="flex items-center gap-1 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors">
          Semanal
          <span className="material-symbols-outlined text-base">expand_more</span>
        </button>
      </div>

      {/* Weekly Increase Indicator */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="material-symbols-outlined text-purple-400 dark:text-purple-400 text-lg sm:text-xl">
            trending_up
          </span>
          <span className="font-bold text-sm sm:text-base text-purple-400 dark:text-purple-400">
            +{weeklyIncrease} horas
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary">
          a mais que semana passada
        </p>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between h-32 sm:h-36 md:h-40 text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary">
        {weekData.map((data, index) => {
          const totalHours = data.hours + data.minutes / 60;
          const heightPercent = (totalHours / maxHours) * 100;
          const isActive = data.day === 'Qui'; // Thursday is active in the design

          return (
            <div key={index} className="flex flex-col items-center gap-2 relative">
              {/* Tooltip for active day */}
              {isActive && (
                <div className="absolute -top-14 bg-text-light-primary dark:bg-text-dark-primary text-white dark:text-black text-xs px-2 py-1 rounded-md shadow-lg z-10">
                  <p>{data.hours}h {data.minutes}min</p>
                  <p className="font-light">{data.date}</p>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-text-light-primary dark:border-t-text-dark-primary -mb-1"></div>
                </div>
              )}
              
              {/* Bar */}
              <div
                className={`w-4 rounded-t-full transition-all duration-500 ${
                  isActive
                    ? 'bg-primary'
                    : 'bg-purple-200 dark:bg-purple-800'
                }`}
                style={{ height: `${heightPercent}%` }}
              ></div>
              
              {/* Day label */}
              <span>{data.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
