'use client';

import React, { useState, useEffect } from 'react';
import { studySessionService } from '@/services/studySessionService';

interface WeeklyStudyTimeCardProps {
  className?: string;
}

export function WeeklyStudyTimeCard({ className = '' }: WeeklyStudyTimeCardProps) {
  const [data, setData] = useState<{
    totalHours: number;
    totalMinutes: number;
    sessionsCount: number;
    weekStart: string;
    weekEnd: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyData();
    
    // Atualizar a cada 1 minuto
    const interval = setInterval(loadWeeklyData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadWeeklyData = async () => {
    try {
      const result = await studySessionService.getWeeklyStudyTime();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar tempo semanal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-border-light dark:bg-border-dark rounded w-1/2 mb-4"></div>
          <div className="h-10 bg-border-light dark:bg-border-dark rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const formatWeekRange = () => {
    if (!data) return '';
    const start = new Date(data.weekStart);
    const end = new Date(data.weekEnd);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.toLocaleDateString('pt-BR', { month: 'short' });
    
    return `${startDay}-${endDay} ${month}`;
  };

  return (
    <div className={`bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-xl p-6 border border-primary/20 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">
            calendar_view_week
          </span>
          <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
            Horas Semanais
          </span>
        </div>
        <div className="px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-md">
          <span className="text-xs font-semibold text-primary">
            {formatWeekRange()}
          </span>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {data?.totalHours.toFixed(1)}
          </span>
          <span className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
            horas
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{data?.totalMinutes || 0} minutos</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">event</span>
          <span>{data?.sessionsCount || 0} sessões</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-sm text-green-500">info</span>
          <span>Reseta toda segunda-feira às 00:00</span>
        </div>
      </div>
    </div>
  );
}
