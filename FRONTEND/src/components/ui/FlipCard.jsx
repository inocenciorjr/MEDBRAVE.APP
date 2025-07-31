import React, { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Componente FlipCard - Carta com animação de virar
 * Suporta temas claro e escuro
 */
const FlipCard = ({ 
  front, 
  back, 
  isFlipped = false, 
  onFlip, 
  className = '',
  disabled = false,
  height = 'h-64',
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!disabled && onFlip) {
      onFlip();
    }
  };

  return (
    <div 
      className={cn(
        'relative w-full cursor-pointer perspective-1000',
        height,
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Container da carta com animação 3D */}
      <div 
        className={cn(
          'relative w-full h-full transition-transform duration-700 transform-style-preserve-3d',
          isFlipped && 'rotate-y-180'
        )}
      >
        {/* Frente da carta */}
        <div className={cn(
          'absolute inset-0 w-full h-full backface-hidden',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'rounded-xl shadow-lg',
          'flex flex-col justify-center items-center p-6',
          'transition-all duration-300',
          isHovered && !isFlipped && 'shadow-xl',
          'hover:border-blue-300 dark:hover:border-blue-600'
        )}>
          {/* Indicador visual de que pode ser virada */}
          {!isFlipped && (
            <div className="absolute top-3 right-3 opacity-60">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          )}
          
          <div className="text-center w-full">
            {front}
          </div>
        </div>

        {/* Verso da carta */}
        <div className={cn(
          'absolute inset-0 w-full h-full backface-hidden rotate-y-180',
          'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          'border border-blue-200 dark:border-blue-700',
          'rounded-xl shadow-lg',
          'flex flex-col justify-center items-center p-6',
          'transition-all duration-300',
          isHovered && isFlipped && 'shadow-xl'
        )}>
          {/* Indicador visual de que pode ser virada de volta */}
          {isFlipped && (
            <div className="absolute top-3 right-3 opacity-60">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20v-5h-.582m-15.356-2A8.001 8.001 0 0119.418 15m0 0H15m-11-11v5h.581m0 0a8.003 8.003 0 0115.357 2M4.582 9H9" />
                </svg>
              </div>
            </div>
          )}
          
          <div className="text-center w-full">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;

// Estilos CSS necessários (adicionar ao arquivo CSS global ou usar Tailwind plugin)
// .perspective-1000 { perspective: 1000px; }
// .transform-style-preserve-3d { transform-style: preserve-3d; }
// .backface-hidden { backface-visibility: hidden; }
// .rotate-y-180 { transform: rotateY(180deg); }