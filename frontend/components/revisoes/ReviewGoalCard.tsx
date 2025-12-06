import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReviewGoalCardProps {
  title: string;
  icon?: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  bgColor: string;
  chartFill: string;
  chartBgPattern: string;
  onConfigClick?: () => void;
  subtitle?: string;
  goalMarker?: number;
}

const ReviewGoalCard: React.FC<ReviewGoalCardProps> = ({
  title,
  current,
  goal,
  unit,
  chartFill,
  chartBgPattern,
  onConfigClick,
  subtitle,
  goalMarker
}) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // Garantir que o componente está montado antes de renderizar o gráfico
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const percentComplete = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const hasGoalMarker = goalMarker !== undefined;

  // Dados para cada camada
  const backgroundData = [
    { value: goal },
    { value: 0 }
  ];

  const goalData = hasGoalMarker && goalMarker ? [
    { value: goalMarker },
    { value: goal - goalMarker }
  ] : null;

  const progressData = [
    { value: current },
    { value: goal - current }
  ];

  // Mapear cores do design system
  const getColorValue = (colorName: string) => {
    const colorMap: Record<string, string> = {
      'progress-bar-cyan': '#0891b2',
      'progress-bar-purple': '#9333ea',
      'border-light': '#E5E7EB',
    };
    return colorMap[colorName] || colorName;
  };

  const progressColor = getColorValue(chartFill);
  const bgColor = getColorValue(chartBgPattern);

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl
                    shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                    transition-all duration-300 border border-border-light dark:border-border-dark">
      {/* Header */}
      <div className="bg-background-light dark:bg-background-dark px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b border-border-light dark:border-border-dark rounded-t-xl flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-display font-bold text-text-light-primary dark:text-text-dark-primary">
          {title}
        </h2>
        {onConfigClick && (
          <button
            onClick={onConfigClick}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-primary/10 transition-all duration-200 group/btn
                       hover:scale-110 active:scale-95"
            title="Configurar meta"
          >
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                           group-hover/btn:text-primary group-hover/btn:rotate-90 transition-all duration-300 text-base sm:text-lg">
              settings
            </span>
          </button>
        )}
      </div>

      {/* Chart Section */}
      <div className="p-4 sm:p-5 md:p-6 lg:p-8">
        {/* Chart Container */}
        <div className="relative w-full" style={{ height: '160px', minHeight: '160px' }}>
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Padrão listrado para a meta */}
                <pattern id={`stripes-${title.replace(/\s/g, '-')}`} patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="12" stroke={progressColor} strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                </pattern>
              </defs>
              
              {/* Camada 1: Fundo completo (cinza claro) - sem hover */}
              <Pie
                data={backgroundData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={110}
                outerRadius={160}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
                animationDuration={800}
              >
                <Cell fill={bgColor} opacity={0.3} />
                <Cell fill="transparent" />
              </Pie>

              {/* Camada 2: Meta (cor intermediária com listras) - apenas se tiver goalMarker */}
              {goalData && (
                <Pie
                  data={goalData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={110}
                  outerRadius={160}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={200}
                >
                  <Cell fill={`url(#stripes-${title.replace(/\s/g, '-')})`} stroke="none" />
                  <Cell fill="transparent" stroke="none" />
                </Pie>
              )}

              {/* Camada 3: Progresso atual (cor principal) - renderizar por último para ficar por cima */}
              <Pie
                data={progressData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={110}
                outerRadius={160}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={400}
              >
                <Cell fill={progressColor} stroke="none" />
                <Cell fill="transparent" stroke="none" />
              </Pie>
            </PieChart>
            </ResponsiveContainer>
          )}

          {/* Text content inside the arc */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap pointer-events-none">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {current} <span className="text-base sm:text-lg md:text-xl font-medium text-text-light-secondary dark:text-text-dark-secondary">{unit}</span>
            </div>
            <div className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary font-medium mt-1 sm:mt-2">
              {subtitle || `${percentComplete}% da meta`}
            </div>
          </div>
        </div>

        {/* Range Labels */}
        <div className="flex justify-between mt-1 px-8 sm:px-12 md:px-16 lg:px-20">
          <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium text-xs sm:text-sm">0</span>
          <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium text-xs sm:text-sm">{goal} {unit}</span>
        </div>

        {/* Legenda das camadas (apenas se tiver goalMarker) */}
        {goalMarker && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" 
                   style={{ backgroundColor: progressColor }}></div>
              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">
                Você: {current}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm relative overflow-hidden" 
                   style={{ 
                     background: `repeating-linear-gradient(
                       45deg,
                       ${progressColor}CC,
                       ${progressColor}CC 4px,
                       ${progressColor}40 4px,
                       ${progressColor}40 8px
                     )`
                   }}>
              </div>
              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">
                Meta: {goalMarker}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewGoalCard;