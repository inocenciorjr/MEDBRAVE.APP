'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UniversityAnswer } from './types';
import { universityPanelVariants, universityStudentVariants } from './animations';

interface UniversityPanelProps {
  answers: UniversityAnswer[];
  onClose: () => void;
}

const optionLetters = ['A', 'B', 'C', 'D'];

const confidenceLabels = {
  alta: { text: 'Tenho certeza!', color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
  media: { text: 'Acho que é...', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' },
  baixa: { text: 'Não tenho certeza...', color: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
};

export function UniversityPanel({ answers, onClose }: UniversityPanelProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [isThinking, setIsThinking] = useState(true);

  useEffect(() => {
    const thinkingTimer = setTimeout(() => {
      setIsThinking(false);
    }, 1500);

    return () => clearTimeout(thinkingTimer);
  }, []);

  useEffect(() => {
    if (!isThinking && revealedCount < answers.length) {
      const revealTimer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, 800);

      return () => clearTimeout(revealTimer);
    }
  }, [isThinking, revealedCount, answers.length]);

  const allRevealed = revealedCount >= answers.length;

  return (
    <motion.div
      variants={universityPanelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && allRevealed) {
          onClose();
        }
      }}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(30,10,60,0.95) 0%, rgba(20,5,40,0.98) 100%)',
          border: '2px solid rgba(59,130,246,0.5)',
          boxShadow: '0 0 40px rgba(59,130,246,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - RESPONSIVO */}
        <div className="text-center mb-4 sm:mb-6">
          <div 
            className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-2 sm:mb-3"
            style={{
              background: 'linear-gradient(180deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.3) 100%)',
              border: '2px solid rgba(59,130,246,0.4)',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            }}
          >
            <span className="text-2xl sm:text-4xl">🎓</span>
          </div>
          <h2 
            className="text-lg sm:text-xl font-bold mb-1"
            style={{ color: '#e9d5ff', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}
          >
            Universitários
          </h2>
          <p className="text-sm sm:text-base" style={{ color: 'rgba(168,85,247,0.7)' }}>
            {isThinking 
              ? 'Os universitários estão pensando...' 
              : allRevealed 
                ? 'Veja o que eles responderam!'
                : 'Revelando respostas...'
            }
          </p>
        </div>

        {/* Lista de universitários - RESPONSIVO */}
        <div className="space-y-2 sm:space-y-4">
          {answers.map((student, index) => {
            const isRevealed = index < revealedCount;
            const confidence = confidenceLabels[student.confidence];

            return (
              <motion.div
                key={student.id}
                variants={universityStudentVariants}
                animate={isThinking ? 'thinking' : isRevealed ? 'answered' : 'visible'}
                className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-500"
                style={{
                  background: isRevealed 
                    ? 'linear-gradient(90deg, rgba(40,20,70,0.6) 0%, rgba(30,10,60,0.8) 100%)'
                    : 'rgba(40,20,70,0.3)',
                  border: isRevealed 
                    ? '1px solid rgba(168,85,247,0.4)'
                    : '1px solid rgba(168,85,247,0.2)',
                }}
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Avatar - RESPONSIVO */}
                  <div 
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-3xl transition-all duration-300 flex-shrink-0"
                    style={{
                      background: isRevealed 
                        ? 'linear-gradient(180deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.3) 100%)'
                        : 'rgba(60,30,90,0.5)',
                      border: isRevealed ? '2px solid rgba(59,130,246,0.4)' : '2px solid rgba(100,50,150,0.3)',
                    }}
                  >
                    {student.avatar}
                  </div>

                  {/* Info - RESPONSIVO */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base truncate" style={{ color: '#e9d5ff' }}>{student.name}</h3>
                    
                    {isThinking ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="flex gap-1"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ background: '#60a5fa' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#60a5fa' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#60a5fa' }} />
                        </motion.div>
                        <span className="text-sm" style={{ color: 'rgba(168,85,247,0.5)' }}>Pensando...</span>
                      </div>
                    ) : isRevealed ? (
                      <div className="space-y-1">
                        {/* Resposta */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: 'rgba(168,85,247,0.6)' }}>Resposta:</span>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="px-3 py-1 rounded-lg font-bold"
                            style={{
                              background: 'linear-gradient(180deg, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.3) 100%)',
                              border: '1px solid rgba(168,85,247,0.4)',
                              color: '#c4b5fd',
                            }}
                          >
                            {optionLetters[student.selectedOption]}
                          </motion.span>
                        </div>
                        
                        {/* Confiança */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: confidence.bg,
                            border: `1px solid ${confidence.border}`,
                            color: confidence.color,
                          }}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {student.confidence === 'alta' ? 'verified' : student.confidence === 'media' ? 'help' : 'warning'}
                          </span>
                          {confidence.text}
                        </motion.div>
                      </div>
                    ) : (
                      <div className="h-10 flex items-center">
                        <span className="text-sm" style={{ color: 'rgba(168,85,247,0.4)' }}>Aguardando...</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Resumo das respostas - RESPONSIVO */}
        <AnimatePresence>
          {allRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl"
              style={{
                background: 'rgba(40,20,70,0.5)',
                border: '1px solid rgba(168,85,247,0.3)',
              }}
            >
              <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'rgba(168,85,247,0.6)' }}>Resumo das respostas:</h4>
              <div className="flex justify-center gap-2 sm:gap-4">
                {[0, 1, 2, 3].map((optionIndex) => {
                  const count = answers.filter(a => a.selectedOption === optionIndex).length;
                  return (
                    <div
                      key={optionIndex}
                      className="flex flex-col items-center p-2 sm:p-3 rounded-lg sm:rounded-xl"
                      style={{
                        background: count > 0 ? 'rgba(168,85,247,0.1)' : 'rgba(40,20,70,0.3)',
                        border: count > 0 ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(100,50,150,0.2)',
                      }}
                    >
                      <span 
                        className="text-sm sm:text-lg font-bold"
                        style={{ color: count > 0 ? '#c4b5fd' : 'rgba(168,85,247,0.3)' }}
                      >
                        {optionLetters[optionIndex]}
                      </span>
                      <span 
                        className="text-xl sm:text-2xl font-bold"
                        style={{ color: count > 0 ? '#e9d5ff' : 'rgba(168,85,247,0.3)' }}
                      >
                        {count}
                      </span>
                      <span className="text-[10px] sm:text-xs" style={{ color: 'rgba(168,85,247,0.5)' }}>
                        {count === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão de fechar - RESPONSIVO */}
        <AnimatePresence>
          {allRevealed && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-colors"
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                border: '2px solid #a855f7',
                color: '#fff',
                boxShadow: '0 0 15px rgba(168,85,247,0.4)',
              }}
            >
              <span className="hidden sm:inline">Entendi, voltar ao jogo</span>
              <span className="sm:hidden">Voltar ao jogo</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
