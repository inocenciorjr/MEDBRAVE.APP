'use client';

import { motion } from 'framer-motion';
import { PRIZE_LEVELS, formatPrize } from './types';
import { prizeBarVariants, prizeLevelVariants, prizeUpdateVariants } from './animations';

interface PrizeBarProps {
  currentLevel: number;
  guaranteedPrize: number;
}

export function PrizeBar({ currentLevel, guaranteedPrize }: PrizeBarProps) {
  const visibleLevels = PRIZE_LEVELS.slice().reverse();

  return (
    <motion.div
      variants={prizeBarVariants}
      initial="hidden"
      animate="visible"
      className="backdrop-blur-md rounded-xl lg:rounded-2xl p-2 lg:p-3 shadow-2xl w-full"
      style={{
        background: 'linear-gradient(180deg, rgba(30,10,60,0.9) 0%, rgba(20,5,40,0.95) 100%)',
        border: '2px solid rgba(168,85,247,0.4)',
        boxShadow: '0 0 30px rgba(168,85,247,0.2), inset 0 0 40px rgba(88,28,135,0.3)',
      }}
    >
      {/* Header - RESPONSIVO */}
      <div 
        className="text-center mb-1.5 lg:mb-2 pb-1.5 lg:pb-2"
        style={{ borderBottom: '1px solid rgba(168,85,247,0.3)' }}
      >
        <h3 className="text-[9px] lg:text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(168,85,247,0.7)' }}>
          Prêmio Atual
        </h3>
        <motion.div
          key={currentLevel}
          variants={prizeUpdateVariants}
          initial="initial"
          animate="update"
          className="text-lg lg:text-xl font-bold"
          style={{
            background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(251,191,36,0.3)',
          }}
        >
          {currentLevel > 0 ? formatPrize(PRIZE_LEVELS[currentLevel - 1].prize) : 'R$ 0'}
        </motion.div>
        {guaranteedPrize > 0 && (
          <p className="text-[9px] lg:text-[10px] mt-0.5" style={{ color: '#fbbf24' }}>
            Garantido: {formatPrize(guaranteedPrize)}
          </p>
        )}
      </div>

      {/* Referência ao Modo Fatality - aparece no topo - RESPONSIVO */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-1.5 lg:mb-2 p-1.5 lg:p-2 rounded-lg text-center"
        style={{
          background: 'linear-gradient(90deg, rgba(127,29,29,0.3) 0%, rgba(185,28,28,0.2) 50%, rgba(127,29,29,0.3) 100%)',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className="text-sm lg:text-base">💀</span>
            <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wider" style={{ color: '#fca5a5' }}>
              FATALITY
            </span>
          </div>
          <span className="text-[8px] lg:text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(252,165,165,0.7)' }}>
            BONUS MODE
          </span>
        </div>
      </motion.div>

      {/* Lista de prêmios - sem scroll, todos visíveis - RESPONSIVO */}
      <div className="space-y-0.5 lg:space-y-1">
        {visibleLevels.map((level) => {
          const isActive = level.level === currentLevel + 1;
          const isPassed = level.level <= currentLevel;
          const isCheckpoint = level.checkpoint;
          const isGuaranteed = level.prize === guaranteedPrize && guaranteedPrize > 0;
          const isMillion = level.level === 16;

          return (
            <motion.div
              key={level.level}
              variants={prizeLevelVariants}
              animate={isActive ? 'active' : isPassed ? 'passed' : 'visible'}
              className="relative flex items-center justify-between px-1.5 lg:px-2 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-xs font-medium transition-all duration-300"
              style={{
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(168,85,247,0.4) 0%, rgba(88,28,135,0.6) 100%)'
                  : isPassed
                    ? 'linear-gradient(90deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)'
                    : isCheckpoint
                      ? 'linear-gradient(90deg, rgba(251,191,36,0.1) 0%, rgba(180,83,9,0.15) 100%)'
                      : 'rgba(40,20,70,0.2)',
                border: isActive 
                  ? '2px solid #a855f7'
                  : isPassed
                    ? '1px solid rgba(16,185,129,0.4)'
                    : isCheckpoint
                      ? '1px solid rgba(251,191,36,0.3)'
                      : '1px solid rgba(168,85,247,0.15)',
                boxShadow: isActive ? '0 0 15px rgba(168,85,247,0.4)' : 'none',
                color: isActive 
                  ? '#e9d5ff' 
                  : isPassed 
                    ? '#6ee7b7' 
                    : isCheckpoint 
                      ? '#fbbf24' 
                      : '#a78bfa',
              }}
            >
              {/* Checkmark para níveis passados - RESPONSIVO */}
              {isPassed && (
                <div className="absolute -left-1 lg:-left-1.5 top-1/2 -translate-y-1/2">
                  <div 
                    className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                    }}
                  >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '8px' }}>check</span>
                  </div>
                </div>
              )}

              {/* Indicador de checkpoint (apenas para não passados) */}
              {isCheckpoint && !isActive && !isPassed && (
                <div 
                  className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }}
                />
              )}

              {/* Indicador de garantido */}
              {isGuaranteed && !isPassed && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#fbbf24' }}>verified</span>
                </div>
              )}

              {/* Número do nível - RESPONSIVO */}
              <span 
                className={`w-5 lg:w-6 text-center font-bold ${isPassed ? 'ml-1.5 lg:ml-2' : ''}`}
                style={{ 
                  color: isActive ? '#e9d5ff' : isPassed ? '#6ee7b7' : 'rgba(168,85,247,0.5)' 
                }}
              >
                {level.level}
              </span>

              {/* Valor do prêmio - RESPONSIVO */}
              <span 
                className={`flex-1 text-right ${isMillion ? 'text-[11px] lg:text-sm font-bold' : ''}`}
                style={isMillion && !isPassed ? {
                  background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                } : isPassed ? {
                  color: '#6ee7b7',
                } : {}}
              >
                {level.label}
              </span>

              {/* Ícone de checkpoint - RESPONSIVO */}
              {isCheckpoint && !isPassed && (
                <span 
                  className="ml-0.5 lg:ml-1 material-symbols-outlined"
                  style={{ 
                    fontSize: '12px',
                    color: isActive ? '#e9d5ff' : '#fbbf24' 
                  }}
                >
                  workspace_premium
                </span>
              )}

              {/* Indicador de renovação de ajudas no checkpoint de 50 mil - RESPONSIVO */}
              {level.prize === 50000 && !isPassed && (
                <span 
                  className="ml-0.5 material-symbols-outlined"
                  style={{ 
                    fontSize: '10px',
                    color: '#10b981' 
                  }}
                  title="Ajudas renovadas!"
                >
                  autorenew
                </span>
              )}

              {/* Indicador de nível atual - RESPONSIVO */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1.5 lg:-right-2 top-1/2 -translate-y-1/2"
                >
                  <div 
                    className="w-3 h-3 lg:w-4 lg:h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#e9d5ff', boxShadow: '0 0 10px rgba(168,85,247,0.5)' }}
                  >
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full" style={{ background: '#a855f7' }} />
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legenda - RESPONSIVO */}
      <div 
        className="mt-2 lg:mt-3 pt-1.5 lg:pt-2 flex flex-col items-center gap-1 lg:gap-1.5 text-[9px] lg:text-[10px]"
        style={{ borderTop: '1px solid rgba(168,85,247,0.3)', color: 'rgba(168,85,247,0.6)' }}
      >
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-0.5 lg:gap-1">
            <div 
              className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full flex items-center justify-center"
              style={{ background: '#10b981' }}
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: '7px' }}>check</span>
            </div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-0.5 lg:gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: '#fbbf24' }}>workspace_premium</span>
            <span>Checkpoint</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 lg:gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: '10px', color: '#10b981' }}>autorenew</span>
          <span>Renova ajudas</span>
        </div>
      </div>
    </motion.div>
  );
}
