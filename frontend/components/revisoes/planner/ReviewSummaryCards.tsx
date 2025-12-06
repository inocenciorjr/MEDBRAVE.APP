'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ReviewSummary {
  total_items: number;
  today_items: number;
  flashcards: number;
  questions: number;
  error_notes: number;
  estimated_time_minutes: number;
}

interface ReviewCardProps {
  title: string;
  subtitle: string;
  icon: string;
  count: number;
  unit: string;
  color: 'blue' | 'purple' | 'red';
  onStart: () => void;
}

function ReviewCard({ title, subtitle, icon, count, unit, color, onStart }: ReviewCardProps) {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-100/50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      chartFill: '#3b82f6',
      chartBg: '#dbeafe',
    },
    purple: {
      bg: 'bg-purple-100/50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      chartFill: '#a855f7',
      chartBg: '#f3e8ff',
    },
    red: {
      bg: 'bg-red-100/50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      chartFill: '#ef4444',
      chartBg: '#fee2e2',
    },
  };

  const config = colorConfig[color];
  const hasItems = count > 0;
  const percentComplete = hasItems ? 100 : 0;
  const data = [
    { value: percentComplete },
    { value: 100 - percentComplete },
  ];

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-lg sm:rounded-xl overflow-hidden flex flex-col 
                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                    transition-all duration-300 border border-border-light dark:border-border-dark">
      {/* Progresso Circular no topo */}
      <div className="relative h-28 sm:h-32 lg:h-40 flex items-center justify-center p-3 sm:p-4">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32">
          <div className={`absolute inset-0 rounded-full border-[3px] sm:border-[4px] ${config.border} scale-90`}></div>
          
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="80%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={8}
                paddingAngle={0}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                <Cell key="cell-0" fill={config.chartFill} />
                <Cell key="cell-1" fill={config.chartBg} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`material-symbols-outlined ${config.text} mb-0.5 sm:mb-1 text-xl sm:text-2xl lg:text-3xl`}>
              {icon}
            </span>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {count}
            </div>
            <div className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {unit}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-3 sm:p-4 flex-grow">
        <h4 className="font-bold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {subtitle}
        </p>
        <div className="flex justify-between text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2 sm:mt-4">
          <span>revisão espaçada</span>
        </div>
      </div>

      {/* Footer com botões */}
      <div className="p-3 sm:p-4 border-t border-border-light dark:border-border-dark flex justify-end space-x-2 sm:space-x-4">
        <button
          onClick={onStart}
          className="text-primary font-bold text-xs sm:text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          disabled={!hasItems}
        >
          Iniciar Revisão
        </button>
        <button className="text-text-light-secondary dark:text-text-dark-secondary font-bold text-xs sm:text-sm hover:underline transition-all">
          Resumo
        </button>
      </div>
    </div>
  );
}

export function ReviewSummaryCards() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTitles, setShowTitles] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      // Buscar revisões de hoje usando o endpoint do planner
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const response = await fetch(`/api/unified-reviews/planner?limit=200&startDate=${today}&endDate=${today}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Pegar apenas os dados de hoje do agrupamento
        const todayData = result.data.grouped[today];

        if (!todayData) {
          // Não há revisões para hoje
          setSummary({
            total_items: 0,
            today_items: 0,
            flashcards: 0,
            questions: 0,
            error_notes: 0,
            estimated_time_minutes: 0,
          });
          return;
        }

        // Contar por tipo
        const flashcards = todayData.FLASHCARD?.count || 0;
        const questions = todayData.QUESTION?.count || 0;
        const error_notes = todayData.ERROR_NOTEBOOK?.count || 0;
        const total = flashcards + questions + error_notes;

        setSummary({
          total_items: total,
          today_items: total,
          flashcards,
          questions,
          error_notes,
          estimated_time_minutes: total * 2, // Estimativa de 2 min por item
        });
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const totalItems = (summary?.questions || 0) + (summary?.flashcards || 0) + (summary?.error_notes || 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-text-light-primary dark:text-text-dark-primary capitalize">
            {today}
          </h3>
          <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Agenda de revisão com questões programadas
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
              omitir títulos
            </span>
            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                checked={!showTitles}
                onChange={(e) => setShowTitles(!e.target.checked)}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-400 border-4 appearance-none cursor-pointer border-gray-300 dark:border-gray-500"
              />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer" />
            </div>
          </div>
          <span className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {totalItems} atividades
          </span>
        </div>
      </div>

      {/* Cards Grid com Progresso Circular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Card de Questões */}
        <ReviewCard
          title="Questões"
          subtitle="Questões de provas e exercícios"
          icon="quiz"
          count={summary?.questions || 0}
          unit="questões"
          color="blue"
          onStart={() => window.location.href = '/revisoes/questoes/sessao'}
        />

        {/* Card de Flashcards */}
        <ReviewCard
          title="Flashcards"
          subtitle="Cards de memorização ativa"
          icon="style"
          count={summary?.flashcards || 0}
          unit="flashcards"
          color="purple"
          onStart={() => window.location.href = '/revisoes/flashcards/sessao'}
        />

        {/* Card de Caderno de Erros */}
        <ReviewCard
          title="Caderno de Erros"
          subtitle="Questões que você errou"
          icon="error"
          count={summary?.error_notes || 0}
          unit="anotações"
          color="red"
          onStart={() => window.location.href = '/revisoes/caderno-erros/sessao'}
        />
      </div>



      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #7C3AED;
          background-color: #7C3AED;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #A78BFA;
        }
      `}</style>
    </div>
  );
}
