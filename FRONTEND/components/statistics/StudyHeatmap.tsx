'use client';

import React, { useState } from 'react';

interface HeatmapData {
  date: string;
  minutesStudied: number;
  questionsAnswered: number;
  accuracy: number;
}

interface StudyHeatmapProps {
  data: HeatmapData[];
  loading?: boolean;
}

export function StudyHeatmap({ data, loading = false }: StudyHeatmapProps) {
  const [selectedDate, setSelectedDate] = useState<HeatmapData | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-48 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  // Organizar dados por semana
  const getWeeksData = () => {
    const weeks: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = [];

    // Últimos 90 dias
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = data.find((d) => d.date === dateStr) || {
        date: dateStr,
        minutesStudied: 0,
        questionsAnswered: 0,
        accuracy: 0,
      };

      currentWeek.push(dayData);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getIntensityColor = (minutes: number) => {
    if (minutes === 0) return 'bg-border-light dark:bg-border-dark';
    if (minutes < 30) return 'bg-primary/20';
    if (minutes < 60) return 'bg-primary/40';
    if (minutes < 120) return 'bg-primary/60';
    return 'bg-primary';
  };

  const weeks = getWeeksData();
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatDate = (dateStr: string) => {
    // Parse da data no formato YYYY-MM-DD sem conversão de timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark relative">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Calendário de Estudos
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Últimos 90 dias de atividade
        </p>
      </div>

      {/* Tooltip com detalhes - Abaixo do título */}
      {(hoveredDate || selectedDate) && (
        <div className="absolute top-24 left-6 right-6 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg shadow-lg z-10 backdrop-blur-sm">
          {(() => {
            const dayData =
              data.find((d) => d.date === (hoveredDate || selectedDate?.date)) ||
              selectedDate;
            if (!dayData) return null;

            return (
              <div className="space-y-2">
                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {formatDate(dayData.date)}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">
                      Tempo
                    </p>
                    <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {dayData.minutesStudied} min
                    </p>
                  </div>
                  <div>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">
                      Questões
                    </p>
                    <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {dayData.questionsAnswered}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">
                      Acertos
                    </p>
                    <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {dayData.accuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex gap-2">
          {/* Labels dos dias */}
          <div className="flex flex-col gap-2 mr-3">
            <div className="h-6"></div>
            {dayLabels.map((day) => (
              <div
                key={day}
                className="h-5 flex items-center text-xs text-text-light-secondary dark:text-text-dark-secondary w-10"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de semanas */}
          {weeks.map((week, weekIndex) => {
            // Parse da data no formato YYYY-MM-DD sem conversão de timezone
            const [year, month, day] = week[0].date.split('-').map(Number);
            const weekDate = new Date(year, month - 1, day);
            const isFirstWeekOfMonth = weekDate.getDate() <= 7;
            const monthName = weekDate.toLocaleDateString('pt-BR', { month: 'short' });
            
            return (
              <div key={weekIndex} className="flex flex-col gap-2">
                {/* Mês label - mostrar apenas na primeira semana do mês */}
                <div className="h-6 text-xs text-text-light-secondary dark:text-text-dark-secondary font-medium">
                  {isFirstWeekOfMonth && monthName}
                </div>

                {/* Dias da semana */}
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-5 h-5 rounded cursor-pointer transition-all duration-200 ${getIntensityColor(
                      day.minutesStudied
                    )} hover:ring-2 hover:ring-primary hover:scale-110`}
                    onMouseEnter={() => setHoveredDate(day.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => setSelectedDate(day)}
                    title={`${formatDate(day.date)}: ${day.minutesStudied} min`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-3 mt-6 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        <span>Menos</span>
        <div className="flex gap-1.5">
          <div className="w-5 h-5 rounded bg-border-light dark:bg-border-dark"></div>
          <div className="w-5 h-5 rounded bg-primary/20"></div>
          <div className="w-5 h-5 rounded bg-primary/40"></div>
          <div className="w-5 h-5 rounded bg-primary/60"></div>
          <div className="w-5 h-5 rounded bg-primary"></div>
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
