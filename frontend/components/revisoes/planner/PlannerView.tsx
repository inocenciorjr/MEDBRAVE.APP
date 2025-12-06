'use client';

import { useState } from 'react';
import { DailyPlannerNative } from './DailyPlannerNative';
import { MonthlyPlanner } from './MonthlyPlanner';
import './fullcalendar-custom.css';
import { format, addDays, subDays, addMonths, subMonths, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip } from './Tooltip';

interface PlannerViewProps {
  viewMode: 'daily' | 'monthly';
  onViewModeChange: (mode: 'daily' | 'monthly') => void;
}

export function PlannerView({ viewMode, onViewModeChange }: PlannerViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Limites: 6 meses atrás, 12 meses à frente
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() - 6);
  minDate.setDate(1);
  
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 12);
  maxDate.setDate(1);

  const canGoPrevious = () => {
    if (viewMode === 'daily') {
      const prevWeek = subDays(currentDate, 7);
      return prevWeek >= minDate;
    } else {
      const prevMonth = subMonths(currentDate, 1);
      return prevMonth >= minDate;
    }
  };

  const canGoNext = () => {
    if (viewMode === 'daily') {
      const nextWeek = addDays(currentDate, 7);
      return nextWeek <= maxDate;
    } else {
      const nextMonth = addMonths(currentDate, 1);
      return nextMonth <= maxDate;
    }
  };

  const handlePrevious = () => {
    if (!canGoPrevious()) return;
    
    if (viewMode === 'daily') {
      setCurrentDate(subDays(currentDate, 7));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    
    if (viewMode === 'daily') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = () => {
    if (viewMode === 'daily') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Segunda-feira
      const weekEnd = addDays(weekStart, 6); // Domingo
      return `${format(weekStart, 'd MMM', { locale: ptBR })} - ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
  };

  const isCurrentPeriod = () => {
    const today = new Date();
    if (viewMode === 'daily') {
      const weekStart = currentDate;
      const weekEnd = addDays(currentDate, 6);
      return today >= weekStart && today <= weekEnd;
    } else {
      return today.getMonth() === currentDate.getMonth() && 
             today.getFullYear() === currentDate.getFullYear();
    }
  };

  const getDistanceFromToday = () => {
    const today = new Date();
    const diffMonths = Math.abs(
      (currentDate.getFullYear() - today.getFullYear()) * 12 + 
      (currentDate.getMonth() - today.getMonth())
    );
    
    if (diffMonths >= 3) {
      return currentDate < today ? 'passado' : 'futuro';
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg p-3 sm:p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
        {/* Linha superior: Navegação + Título (mobile) ou Navegação + Título + Controles (desktop) */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Botões de navegação */}
          <div className="flex items-center space-x-1 sm:space-x-2 p-0.5 sm:p-1 bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark rounded-lg shadow-lg dark:shadow-dark-lg flex-shrink-0">
            <button 
              onClick={handlePrevious}
              disabled={!canGoPrevious()}
              className={`p-1.5 sm:p-2 rounded-lg group relative ${
                canGoPrevious() 
                  ? 'hover:bg-background-light dark:hover:bg-background-dark cursor-pointer' 
                  : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl text-primary">
                chevron_left
              </span>
              {!canGoPrevious() && <Tooltip text="Limite de navegação atingido (6 meses atrás)" position="bottom" />}
            </button>
            <button 
              onClick={handleNext}
              disabled={!canGoNext()}
              className={`p-1.5 sm:p-2 rounded-lg group relative ${
                canGoNext() 
                  ? 'hover:bg-background-light dark:hover:bg-background-dark cursor-pointer' 
                  : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl text-primary">
                chevron_right
              </span>
              {!canGoNext() && <Tooltip text="Limite de navegação atingido (12 meses à frente)" position="bottom" />}
            </button>
          </div>

          {/* Título centralizado */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <h1 className="text-sm sm:text-xl md:text-2xl lg:text-4xl text-gray-400 dark:text-gray-500 truncate text-center">
              <span className="font-bold">{getDateRangeText().split(' ')[0]}</span>{' '}
              <span className="font-normal hidden xs:inline">{getDateRangeText().split(' ')[1]}</span>{' '}
              <span className="font-normal">-</span>{' '}
              <span className="font-bold">{getDateRangeText().split(' ')[3]}</span>{' '}
              <span className="font-normal hidden xs:inline">{getDateRangeText().split(' ')[4]}</span>{' '}
              <span className="font-normal hidden sm:inline">{getDateRangeText().split(' ')[5]}</span>
            </h1>
            {getDistanceFromToday() && (
              <div className={`text-[10px] sm:text-xs mt-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                getDistanceFromToday() === 'passado' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
                {getDistanceFromToday() === 'passado' ? '⏪ Passado' : '⏩ Futuro'}
              </div>
            )}
          </div>

          {/* Controles - Desktop */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Toggle Semana/Mês */}
            <div className="flex items-center border-2 border-border-light dark:border-border-dark rounded-lg text-xs lg:text-sm font-semibold shadow-lg dark:shadow-dark-lg bg-surface-light dark:bg-surface-dark">
              <button 
                onClick={() => onViewModeChange('daily')}
                className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-l-lg ${
                  viewMode === 'daily' 
                    ? 'bg-primary text-white' 
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                Semana
              </button>
              <button 
                onClick={() => onViewModeChange('monthly')}
                className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-r-lg ${
                  viewMode === 'monthly' 
                    ? 'bg-primary text-white' 
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                Mês
              </button>
            </div>

            {/* Botão Hoje */}
            <button 
              onClick={handleToday}
              disabled={isCurrentPeriod()}
              className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg shadow-lg dark:shadow-dark-lg font-semibold border-2 text-xs lg:text-sm ${
                isCurrentPeriod()
                  ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary opacity-50 cursor-not-allowed'
                  : 'bg-primary text-white border-primary hover:bg-primary/90'
              }`}
            >
              <span className="material-symbols-outlined text-lg lg:text-xl">today</span>
              <span>Hoje</span>
            </button>
          </div>
        </div>

        {/* Controles - Mobile */}
        <div className="flex md:hidden items-center justify-center gap-2">
          {/* Toggle Semana/Mês */}
          <div className="flex items-center border-2 border-border-light dark:border-border-dark rounded-lg text-xs font-semibold shadow-lg dark:shadow-dark-lg bg-surface-light dark:bg-surface-dark">
            <button 
              onClick={() => onViewModeChange('daily')}
              className={`px-3 py-1.5 rounded-l-lg ${
                viewMode === 'daily' 
                  ? 'bg-primary text-white' 
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
              }`}
            >
              Semana
            </button>
            <button 
              onClick={() => onViewModeChange('monthly')}
              className={`px-3 py-1.5 rounded-r-lg ${
                viewMode === 'monthly' 
                  ? 'bg-primary text-white' 
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
              }`}
            >
              Mês
            </button>
          </div>

          {/* Botão Hoje */}
          <button 
            onClick={handleToday}
            disabled={isCurrentPeriod()}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg shadow-lg dark:shadow-dark-lg font-semibold border-2 text-xs ${
              isCurrentPeriod()
                ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary opacity-50 cursor-not-allowed'
                : 'bg-primary text-white border-primary hover:bg-primary/90'
            }`}
          >
            <span className="material-symbols-outlined text-base">today</span>
            <span>Hoje</span>
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      {viewMode === 'daily' ? (
        <DailyPlannerNative currentDate={currentDate} />
      ) : (
        <MonthlyPlanner currentDate={currentDate} />
      )}
    </div>
  );
}
