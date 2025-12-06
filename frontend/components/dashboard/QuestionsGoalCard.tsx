'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useUserGoals } from '@/hooks/useUserGoals';

export default function QuestionsGoalCard() {
  const { goals, todayStats, loading } = useUserGoals();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const current = todayStats?.questions_answered || 0;
  const goal = goals?.daily_questions_goal || 50;

  const percentComplete = goal > 0 ? Math.round((current / goal) * 100) : 0;

  const backgroundData = [{ value: goal }, { value: 0 }];
  const progressData = [{ value: Math.min(current, goal) }, { value: Math.max(0, goal - current) }];

  const progressColor = '#0891b2';
  const bgColor = '#E5E7EB';

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-40 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-5 md:p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">
          Meta de Questões
        </h2>
        <a
          href="/revisoes"
          className="group px-3 py-1.5 rounded-lg text-sm font-display font-medium 
                     bg-primary/10 dark:bg-primary/20 text-primary 
                     hover:bg-primary hover:text-white
                     border border-primary/20 hover:border-primary
                     shadow-sm hover:shadow-md hover:shadow-primary/20
                     transition-all duration-300 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          Ajustar
        </a>
      </div>

      {/* Chart - altura responsiva para tablets */}
      <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px]">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Background */}
              <Pie
                data={backgroundData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={100}
                outerRadius={150}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
                animationDuration={800}
              >
                <Cell fill={bgColor} opacity={0.3} />
                <Cell fill="transparent" />
              </Pie>

              {/* Progress */}
              <Pie
                data={progressData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={100}
                outerRadius={150}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={200}
              >
                <Cell fill={progressColor} />
                <Cell fill="transparent" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Center text */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {current} <span className="text-sm sm:text-base md:text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">questões</span>
          </div>
          <div className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary font-medium mt-0.5 sm:mt-1">
            {percentComplete}% da meta
          </div>
        </div>
      </div>

      {/* Range Labels */}
      <div className="flex justify-between px-6 sm:px-8 md:px-12">
        <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium text-xs sm:text-sm">0</span>
        <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium text-xs sm:text-sm">{goal} questões</span>
      </div>
    </div>
  );
}
