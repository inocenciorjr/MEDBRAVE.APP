'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { PRIZE_LEVELS, MAX_SKIPS } from './types';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
          />

          {/* Modal - Slide do lado direito */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[10000] shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(30,10,60,0.98) 0%, rgba(20,5,40,1) 100%)',
              borderLeft: '2px solid rgba(168,85,247,0.5)',
              boxShadow: '-10px 0 50px rgba(168,85,247,0.3)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(168,85,247,0.3)' }}
            >
              <h2 
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: '#e9d5ff', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}
              >
                <span className="material-symbols-outlined" style={{ color: '#a855f7' }}>help</span>
                Como Jogar
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-purple-500/20"
                style={{ background: 'rgba(40,20,70,0.5)' }}
              >
                <span className="material-symbols-outlined" style={{ color: '#a78bfa' }}>close</span>
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Objetivo */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: '#e9d5ff' }}>
                  <span className="material-symbols-outlined" style={{ color: '#a855f7' }}>target</span>
                  Objetivo
                </h3>
                <p className="text-sm" style={{ color: 'rgba(168,85,247,0.7)' }}>
                  Responda corretamente às perguntas de medicina e acumule prêmios virtuais. 
                  Quanto mais você acertar, maior o prêmio! Chegue ao milhão respondendo todas as 16 perguntas.
                </p>
              </section>

              {/* Prêmios */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: '#e9d5ff' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>payments</span>
                  Checkpoints
                </h3>
                <p className="text-sm mb-3" style={{ color: 'rgba(168,85,247,0.7)' }}>
                  Os checkpoints garantem um valor mínimo caso você erre depois de alcançá-los.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PRIZE_LEVELS.filter(p => p.checkpoint).map((prize) => (
                    <div
                      key={prize.level}
                      className="p-2 rounded-lg text-center"
                      style={{
                        background: 'linear-gradient(180deg, rgba(251,191,36,0.1) 0%, rgba(180,83,9,0.15) 100%)',
                        border: '1px solid rgba(251,191,36,0.3)',
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>{prize.label}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(168,85,247,0.5)' }}>Pergunta {prize.level}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ajudas */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: '#e9d5ff' }}>
                  <span className="material-symbols-outlined" style={{ color: '#a855f7' }}>support</span>
                  Ajudas
                </h3>
                <div className="space-y-3">
                  {/* Cartas */}
                  <div 
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(40,20,70,0.5)', border: '1px solid rgba(168,85,247,0.2)' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.4) 100%)',
                        border: '1px solid rgba(168,85,247,0.4)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#a855f7', fontSize: '20px' }}>playing_cards</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#e9d5ff' }}>Cartas</p>
                      <p className="text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>
                        Sorteie uma carta que elimina 1, 2 ou 3 alternativas erradas. Pode usar apenas 1 vez.
                      </p>
                    </div>
                  </div>

                  {/* Universitários */}
                  <div 
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(40,20,70,0.5)', border: '1px solid rgba(168,85,247,0.2)' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.4) 100%)',
                        border: '1px solid rgba(168,85,247,0.4)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#a855f7', fontSize: '20px' }}>school</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#e9d5ff' }}>Universitários</p>
                      <p className="text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>
                        3 estudantes de medicina dão suas opiniões. Atenção: nem sempre todos acertam! Pode usar apenas 1 vez.
                      </p>
                    </div>
                  </div>

                  {/* Opinião MedBrave */}
                  <div 
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(40,20,70,0.5)', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.4) 100%)',
                        border: '1px solid rgba(16,185,129,0.4)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>psychology</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#6ee7b7' }}>Opinião MedBrave</p>
                      <p className="text-xs" style={{ color: 'rgba(16,185,129,0.7)' }}>
                        Veja o comentário do professor com a resposta correta antes de responder. Pode usar apenas 1 vez.
                      </p>
                    </div>
                  </div>

                  {/* Pular */}
                  <div 
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(40,20,70,0.5)', border: '1px solid rgba(168,85,247,0.2)' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.4) 100%)',
                        border: '1px solid rgba(168,85,247,0.4)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#a855f7', fontSize: '20px' }}>skateboarding</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#e9d5ff' }}>Pular</p>
                      <p className="text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>
                        Pule uma pergunta difícil e vá para a próxima. Você tem {MAX_SKIPS} pulos disponíveis.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Renovação de ajudas */}
                <div 
                  className="mt-3 p-3 rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, rgba(251,191,36,0.1) 0%, rgba(180,83,9,0.15) 100%)',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}
                >
                  <p className="text-xs flex items-start gap-2" style={{ color: '#fbbf24' }}>
                    <span className="material-symbols-outlined text-sm flex-shrink-0">autorenew</span>
                    <span>
                      <strong>Checkpoint R$ 50.000:</strong> Ao alcançar este checkpoint, todas as suas ajudas são renovadas!
                    </span>
                  </p>
                </div>
              </section>

              {/* Parar */}
              <section>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: '#e9d5ff' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>front_hand</span>
                  Parar
                </h3>
                <p className="text-sm" style={{ color: 'rgba(168,85,247,0.7)' }}>
                  A qualquer momento você pode parar e levar o prêmio acumulado. 
                  Se errar, você leva apenas o valor do último checkpoint alcançado.
                </p>
              </section>

              {/* Modo Fatality */}
              <section 
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(127,29,29,0.3) 0%, rgba(69,10,10,0.4) 100%)',
                  border: '1px solid rgba(239,68,68,0.4)',
                }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#fca5a5' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>skull</span>
                  Modo Fatality
                </h3>
                <p className="text-sm mb-3" style={{ color: 'rgba(252,165,165,0.8)' }}>
                  Desbloqueado após ganhar o milhão! Um modo especial de alto risco:
                </p>
                <ul className="space-y-2 text-sm" style={{ color: 'rgba(252,165,165,0.7)' }}>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: '#ef4444' }}>close</span>
                    Sem ajudas disponíveis
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: '#ef4444' }}>close</span>
                    Errou uma vez, perdeu tudo
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: '#10b981' }}>check</span>
                    Multiplicador aumenta a cada acerto (1x, 2x, 3x...)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: '#10b981' }}>check</span>
                    Glória eterna no ranking!
                  </li>
                </ul>
              </section>

              {/* Dica */}
              <section 
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(90deg, rgba(168,85,247,0.1) 0%, rgba(88,28,135,0.15) 100%)',
                  border: '1px solid rgba(168,85,247,0.3)',
                }}
              >
                <p className="text-sm flex items-start gap-2" style={{ color: '#c4b5fd' }}>
                  <span className="material-symbols-outlined text-lg flex-shrink-0">lightbulb</span>
                  <span>
                    <strong>Dica:</strong> Use as ajudas estrategicamente! Guarde-as para as perguntas mais difíceis, 
                    especialmente próximo aos checkpoints.
                  </span>
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(168,85,247,0.3)' }}>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                  border: '2px solid #a855f7',
                  color: '#fff',
                  boxShadow: '0 0 15px rgba(168,85,247,0.4)',
                }}
              >
                Entendi!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
