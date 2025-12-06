'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { useTheme } from '@/app/providers';
import {
  GameConfigComponent,
  GameBoard,
  GameConfig,
  PRIZE_LEVELS,
  HowToPlayModal,
  RankingPanel,
  useGameSounds,
  SoundToggle,
  SoundProvider,
} from '@/components/playground/show-do-milhao';

type GamePhase = 'landing' | 'config' | 'playing' | 'ranking';

function ShowDoMilhaoContent() {
  const [phase, setPhase] = useState<GamePhase>('landing');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const { playGameStart, stopCurrentAudio, isMuted, toggleMute } = useGameSounds();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (phase === 'landing') {
      // Tocar intro quando entrar na landing (primeira vez ou ao voltar)
      const timer = setTimeout(() => {
        playGameStart(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, playGameStart]);

  const handleStartConfig = () => {
    setPhase('config');
  };

  const handleStartGame = (config: GameConfig) => {
    stopCurrentAudio();
    setGameConfig(config);
    setPhase('playing');
  };

  const handleExit = () => {
    setPhase('landing');
    setGameConfig(null);
  };

  const handleBackToLanding = () => {
    setPhase('landing');
  };

  // DEBUG: Iniciar direto no modo Fatality
  const handleStartFatalityDebug = () => {
    stopCurrentAudio();
    setGameConfig({
      selectedSubjects: [],
      selectedInstitutions: [],
      questionCount: 16,
      unansweredFilter: 'all',
      startInFatality: true, // Flag para iniciar no modo Fatality
    } as GameConfig & { startInFatality: boolean });
    setPhase('playing');
  };

  const handleOpenRanking = () => {
    setPhase('ranking');
  };

  if (phase === 'playing' && gameConfig) {
    return <GameBoard config={gameConfig} onExit={handleExit} />;
  }

  if (phase === 'ranking') {
    return (
      <RankingWrapper onBack={handleBackToLanding} isDark={isDark} />
    );
  }

  if (phase === 'config') {
    return (
      <GameConfigComponent 
        onStartGame={handleStartGame} 
        onBack={handleBackToLanding}
        onStartFatalityDebug={handleStartFatalityDebug}
      />
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden transition-colors duration-500"
      style={{
        // Tema claro: roxo escuro mais suave | Tema escuro: quase preto
        background: isDark 
          ? 'linear-gradient(180deg, #050010 0%, #0d0420 50%, #050010 100%)'
          : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
      }}
    >
      
      {/* ===== CENÁRIO DE ESTÚDIO DE TV ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        
        {/* Paredes de LED curvas - fundo tecnológico */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 150% 80% at 50% 20%, rgba(88,28,135,0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 60% at 20% 80%, rgba(6,182,212,0.1) 0%, transparent 40%),
              radial-gradient(ellipse 100% 60% at 80% 80%, rgba(219,39,119,0.1) 0%, transparent 40%)
            `,
          }}
        />
        
        {/* Linhas digitais nas paredes (textura tech) */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 49%, rgba(168,85,247,0.3) 50%, transparent 51%),
              linear-gradient(90deg, transparent 49%, rgba(168,85,247,0.2) 50%, transparent 51%)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Arquibancada/Plateia - silhuetas de pessoas - RESPONSIVO (simplificado em mobile) */}
        <div className="absolute top-[2%] left-0 right-0 h-[80px] sm:h-[100px] md:h-[120px] overflow-hidden">
          {/* Fundo da arquibancada */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(15,5,30,0.95) 0%, rgba(25,10,50,0.8) 50%, transparent 100%)',
            }}
          />
          
          {/* Fileira de trás (mais alta) - menos pessoas em mobile */}
          <div className="absolute top-[8px] sm:top-[10px] left-[8%] right-[8%] h-[25px] sm:h-[35px] flex justify-center gap-[2px] sm:gap-[3px]">
            {[...Array(20)].map((_, i) => (
              <div
                key={`back-${i}`}
                className="relative hidden sm:block"
                style={{
                  width: '12px',
                  height: '28px',
                }}
              >
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[8px] h-[8px] rounded-full"
                  style={{
                    background: `rgba(${60 + Math.random() * 40}, ${40 + Math.random() * 30}, ${80 + Math.random() * 40}, 0.7)`,
                  }}
                />
                <div 
                  className="absolute top-[9px] left-1/2 -translate-x-1/2 w-[10px] h-[18px] rounded-t-full"
                  style={{
                    background: `rgba(${50 + Math.random() * 50}, ${30 + Math.random() * 40}, ${70 + Math.random() * 50}, 0.6)`,
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Fileira do meio - menos pessoas em mobile */}
          <div className="absolute top-[20px] sm:top-[40px] left-[5%] right-[5%] h-[30px] sm:h-[40px] flex justify-center gap-[3px] sm:gap-[4px]">
            {[...Array(18)].map((_, i) => (
              <div
                key={`mid-${i}`}
                className="relative"
                style={{
                  width: '10px',
                  height: '24px',
                }}
              >
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[7px] sm:w-[10px] h-[7px] sm:h-[10px] rounded-full"
                  style={{
                    background: `rgba(${70 + Math.random() * 50}, ${50 + Math.random() * 40}, ${90 + Math.random() * 50}, 0.75)`,
                  }}
                />
                <div 
                  className="absolute top-[8px] sm:top-[11px] left-1/2 -translate-x-1/2 w-[9px] sm:w-[12px] h-[15px] sm:h-[20px] rounded-t-full"
                  style={{
                    background: `rgba(${60 + Math.random() * 60}, ${40 + Math.random() * 50}, ${80 + Math.random() * 60}, 0.65)`,
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Fileira da frente - menos pessoas em mobile */}
          <div className="absolute top-[50px] sm:top-[75px] left-[3%] right-[3%] h-[30px] sm:h-[45px] flex justify-center gap-[4px] sm:gap-[5px]">
            {[...Array(15)].map((_, i) => (
              <div
                key={`front-${i}`}
                className="relative"
                style={{
                  width: '12px',
                  height: '28px',
                }}
              >
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[9px] sm:w-[12px] h-[9px] sm:h-[12px] rounded-full"
                  style={{
                    background: `rgba(${80 + Math.random() * 60}, ${60 + Math.random() * 50}, ${100 + Math.random() * 60}, 0.8)`,
                  }}
                />
                <div 
                  className="absolute top-[10px] sm:top-[13px] left-1/2 -translate-x-1/2 w-[11px] sm:w-[14px] h-[17px] sm:h-[24px] rounded-t-full"
                  style={{
                    background: `rgba(${70 + Math.random() * 70}, ${50 + Math.random() * 60}, ${90 + Math.random() * 70}, 0.7)`,
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Brilhos ocasionais (celulares/flashes) - menos em mobile */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`flash-${i}`}
              className="absolute w-1 h-1 rounded-full bg-white hidden sm:block"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 0.5 + Math.random() * 1,
                repeat: Infinity,
                delay: Math.random() * 5,
                repeatDelay: 3 + Math.random() * 5,
              }}
            />
          ))}
        </div>
        
        {/* Treliças de iluminação (Trusses) no teto */}
        <div className="absolute top-0 left-0 right-0 h-[80px]">
          {/* Barra horizontal principal */}
          <div 
            className="absolute top-[20px] left-[10%] right-[10%] h-[8px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(100,100,120,0.4), rgba(100,100,120,0.6), rgba(100,100,120,0.4), transparent)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          />
          {/* Spots de luz (moving heads) */}
          {[15, 30, 50, 70, 85].map((pos, i) => (
            <div 
              key={i}
              className="absolute top-[28px] w-[12px] h-[20px]"
              style={{
                left: `${pos}%`,
                background: 'linear-gradient(180deg, rgba(80,80,100,0.8) 0%, rgba(60,60,80,0.6) 100%)',
                borderRadius: '2px 2px 50% 50%',
                boxShadow: '0 5px 15px rgba(168,85,247,0.3)',
              }}
            />
          ))}
        </div>
        
        {/* Feixes de luz volumétricos (Light Beams) */}
        <div 
          className="absolute top-0 left-[15%] w-[200px] h-[70%] opacity-15"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0.3) 30%, transparent 100%)',
            transform: 'rotate(-12deg) translateY(-10%)',
            filter: 'blur(30px)',
            transformOrigin: 'top center',
          }}
        />
        <div 
          className="absolute top-0 right-[15%] w-[200px] h-[70%] opacity-15"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0.3) 30%, transparent 100%)',
            transform: 'rotate(12deg) translateY(-10%)',
            filter: 'blur(30px)',
            transformOrigin: 'top center',
          }}
        />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[60%] opacity-20"
          style={{
            background: 'linear-gradient(180deg, rgba(139,92,246,0.8) 0%, rgba(139,92,246,0.2) 40%, transparent 100%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Feixes ciano/magenta laterais */}
        <div 
          className="absolute top-[10%] left-[5%] w-[150px] h-[50%] opacity-10"
          style={{
            background: 'linear-gradient(180deg, rgba(6,182,212,0.8) 0%, transparent 100%)',
            transform: 'rotate(-20deg)',
            filter: 'blur(25px)',
          }}
        />
        <div 
          className="absolute top-[10%] right-[5%] w-[150px] h-[50%] opacity-10"
          style={{
            background: 'linear-gradient(180deg, rgba(219,39,119,0.8) 0%, transparent 100%)',
            transform: 'rotate(20deg)',
            filter: 'blur(25px)',
          }}
        />
        
        {/* Halo/Anel dourado e roxo atrás do logo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-25"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(251,191,36,0.4) 10%, transparent 20%, rgba(168,85,247,0.4) 30%, transparent 40%, rgba(251,191,36,0.3) 50%, transparent 60%, rgba(168,85,247,0.3) 70%, transparent 80%, rgba(251,191,36,0.2) 90%, transparent 100%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
        {/* Anel interno */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] opacity-20"
          style={{
            border: '2px solid rgba(251,191,36,0.3)',
            borderRadius: '50%',
            boxShadow: '0 0 30px rgba(251,191,36,0.2), inset 0 0 30px rgba(168,85,247,0.2)',
          }}
        />
        
        {/* Chão do palco reflexivo */}
        <div className="absolute bottom-0 left-0 right-0 h-[35%]">
          {/* Superfície reflexiva */}
          <div 
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, transparent 0%, rgba(10,5,25,0.95) 30%, rgba(5,0,15,1) 100%)'
                : 'linear-gradient(180deg, transparent 0%, rgba(26,10,46,0.95) 30%, rgba(26,10,46,1) 100%)',
            }}
          />
          {/* Reflexo do cenário */}
          <div 
            className="absolute top-0 left-0 right-0 h-[60%] opacity-20"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, transparent 100%)',
              transform: 'scaleY(-1)',
              filter: 'blur(10px)',
            }}
          />
          {/* Linhas de LED concêntricas no chão */}
          <div 
            className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[120%] h-[150px]"
            style={{
              background: `
                radial-gradient(ellipse 80% 100% at 50% 100%, transparent 30%, rgba(168,85,247,0.15) 31%, transparent 32%),
                radial-gradient(ellipse 60% 80% at 50% 100%, transparent 30%, rgba(168,85,247,0.2) 31%, transparent 32%),
                radial-gradient(ellipse 40% 60% at 50% 100%, transparent 30%, rgba(168,85,247,0.25) 31%, transparent 32%),
                radial-gradient(ellipse 20% 40% at 50% 100%, transparent 30%, rgba(251,191,36,0.3) 31%, transparent 32%)
              `,
            }}
          />
          {/* Faixas de LED retas */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[3px] opacity-40"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.8) 20%, rgba(251,191,36,0.8) 50%, rgba(168,85,247,0.8) 80%, transparent 100%)',
              boxShadow: '0 0 10px rgba(168,85,247,0.5)',
            }}
          />
        </div>
        
        {/* Neblina de palco (haze) */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 100% 50% at 50% 30%, rgba(88,28,135,0.2) 0%, transparent 70%)',
          }}
        />
        
        {/* Partículas de luz flutuantes */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              background: i % 3 === 0 ? 'rgba(251,191,36,0.6)' : 'rgba(168,85,247,0.6)',
              boxShadow: i % 3 === 0 ? '0 0 6px rgba(251,191,36,0.8)' : '0 0 6px rgba(168,85,247,0.8)',
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header - RESPONSIVO */}
      <header className="relative z-10 w-full p-2 sm:p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/playground" className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-white/10">
            <span className="material-symbols-outlined text-white text-xl sm:text-2xl">arrow_back</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-white/10"
              title="Como jogar"
            >
              <span className="material-symbols-outlined text-white text-xl sm:text-2xl">help_outline</span>
            </button>
            <SoundToggle isMuted={isMuted} onToggle={toggleMute} />
            <button
              onClick={handleOpenRanking}
              className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-white/10"
              title="Ranking"
            >
              <span className="material-symbols-outlined text-white text-xl sm:text-2xl">leaderboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal - RESPONSIVO */}
      <main className="relative z-10 flex-grow flex flex-col justify-center items-center px-3 sm:px-4 pb-4 sm:pb-8 pt-2 sm:pt-4">
        <div className="text-center max-w-2xl mx-auto w-full">
          
          {/* Logo com moldura geométrica flutuante - RESPONSIVO */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6 sm:mb-10 relative"
          >
            {/* Glow externo da moldura */}
            <div 
              className="absolute inset-0 -m-2 sm:-m-4"
              style={{
                clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
                background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.2) 100%)',
                filter: 'blur(20px)',
              }}
            />
            
            {/* Moldura trapezoide estilo vidro holográfico - RESPONSIVO */}
            <div 
              className="relative px-4 sm:px-8 md:px-10 py-4 sm:py-6 md:py-8 mx-auto"
              style={{
                background: 'linear-gradient(180deg, rgba(88,28,135,0.7) 0%, rgba(30,10,60,0.9) 50%, rgba(20,5,40,0.95) 100%)',
                clipPath: 'polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
              }}
            >
              {/* Borda neon superior */}
              <div 
                className="absolute top-0 left-[6%] right-[6%] h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, #d8b4fe, #a855f7, #d8b4fe, transparent)',
                  boxShadow: '0 0 10px #a855f7, 0 0 20px #a855f7',
                }}
              />
              {/* Bordas laterais neon */}
              <div 
                className="absolute top-0 bottom-0 left-0 w-[2px]"
                style={{
                  background: 'linear-gradient(180deg, #d8b4fe, #a855f7)',
                  transform: 'skewY(-5deg)',
                  transformOrigin: 'top',
                  boxShadow: '0 0 10px #a855f7',
                }}
              />
              <div 
                className="absolute top-0 bottom-0 right-0 w-[2px]"
                style={{
                  background: 'linear-gradient(180deg, #d8b4fe, #a855f7)',
                  transform: 'skewY(5deg)',
                  transformOrigin: 'top',
                  boxShadow: '0 0 10px #a855f7',
                }}
              />
              {/* Borda neon inferior */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #a855f7, #fbbf24, #a855f7)',
                  boxShadow: '0 0 15px #a855f7, 0 0 30px rgba(251,191,36,0.5)',
                }}
              />
              
              {/* Texto SHOW - Roxo com contorno branco brilhante - RESPONSIVO */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-wider relative"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  color: '#7c3aed',
                  textShadow: `
                    0 0 2px #fff,
                    0 0 5px #fff,
                    0 0 10px rgba(255,255,255,0.8),
                    0 0 20px rgba(255,255,255,0.5),
                    0 0 30px #a855f7,
                    0 0 50px #a855f7
                  `,
                  WebkitTextStroke: '1px rgba(255,255,255,0.9)',
                }}
              >
                SHOW
              </motion.h1>
              
              {/* Container DO + MEDBRAVE - RESPONSIVO */}
              <div className="relative -mt-0.5 sm:-mt-1 mb-1 sm:mb-2">
                {/* Texto DO - Pequeno e metálico brilhante */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="block text-sm sm:text-lg md:text-xl font-bold tracking-[0.3em] sm:tracking-[0.4em]"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 50%, #808080 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))',
                  }}
                >
                  DO
                </motion.span>
                
                {/* ===== PLACA MEDBRAVE - Sobre o DO ===== */}
                <motion.div
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    rotate: -45,
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    rotate: -10,
                  }}
                  transition={{ 
                    delay: 1.2,
                    duration: 0.6,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  {/* Glow da barra */}
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(251,191,36,0.5), 0 0 20px rgba(251,191,36,0.3)',
                        '0 0 15px rgba(251,191,36,0.7), 0 0 30px rgba(251,191,36,0.5)',
                        '0 0 10px rgba(251,191,36,0.5), 0 0 20px rgba(251,191,36,0.3)',
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    {/* Barra de ouro principal - RESPONSIVO */}
                    <div 
                      className="relative px-2 sm:px-3 py-0.5 sm:py-1"
                      style={{
                        background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 10%, #fcd34d 25%, #fbbf24 40%, #f59e0b 55%, #d97706 70%, #b45309 85%, #92400e 100%)',
                        borderRadius: '3px',
                        boxShadow: `
                          inset 0 1px 2px rgba(255,255,255,0.5),
                          inset 0 -1px 2px rgba(0,0,0,0.3),
                          0 2px 4px rgba(0,0,0,0.4)
                        `,
                        border: '1px solid #b45309',
                      }}
                    >
                      {/* Reflexo superior */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-[40%] opacity-40"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                      
                      {/* Texto MEDBRAVE - RESPONSIVO */}
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 0.3 }}
                        className="relative block text-[8px] sm:text-[10px] md:text-xs font-black tracking-[0.05em] sm:tracking-[0.1em]"
                        style={{
                          fontFamily: '"Azonix", "Orbitron", "Rajdhani", system-ui, sans-serif',
                          color: '#78350f',
                          textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                        }}
                      >
                        MEDBRAVE
                      </motion.span>
                      
                      {/* Brilho passando */}
                      <motion.div
                        className="absolute inset-0 overflow-hidden rounded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8 }}
                      >
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            repeatDelay: 3,
                            delay: 2,
                          }}
                          className="absolute inset-y-0 w-[50%]"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  {/* Partículas de brilho ao aparecer */}
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-[8px]"
                      style={{
                        left: `${10 + i * 25}%`,
                        top: `${20 + (i % 2) * 60}%`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0],
                      }}
                      transition={{
                        delay: 1.3 + i * 0.1,
                        duration: 0.4,
                      }}
                    >
                      <span className="text-yellow-300">✦</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              
              {/* Texto MILHÃO - Ouro 3D volumétrico - RESPONSIVO */}
              <motion.h2
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-wide relative"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 15%, #fcd34d 30%, #fbbf24 50%, #d97706 70%, #92400e 90%, #78350f 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(1px 1px 0px #fbbf24) drop-shadow(2px 2px 0px #b45309) drop-shadow(3px 3px 0px #78350f) drop-shadow(4px 4px 2px rgba(0,0,0,0.5))',
                }}
              >
                MILHÃO
                {/* Reflexo especular */}
                <span 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 40%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  MILHÃO
                </span>
              </motion.h2>
              
            </div>
            
            {/* Reflexo da moldura no chão */}
            <div 
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-[40px] opacity-20"
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.5) 0%, transparent 100%)',
                filter: 'blur(10px)',
                transform: 'translateX(-50%) scaleY(-0.5)',
              }}
            />
          </motion.div>

          {/* Subtítulo com glow - RESPONSIVO */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-purple-200/90 text-sm sm:text-lg md:text-xl mb-6 sm:mb-10 font-medium px-2"
            style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}
          >
            Estudar questões nunca valeu tanto!
          </motion.p>

          {/* Prêmios preview - estilo painel holográfico - RESPONSIVO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative mb-8 sm:mb-12"
          >
            {/* Glow externo do painel */}
            <div 
              className="absolute -inset-2 rounded-3xl opacity-50"
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(251,191,36,0.2) 100%)',
                filter: 'blur(15px)',
              }}
            />
            
            {/* Container principal com borda neon - RESPONSIVO */}
            <div 
              className="relative px-4 sm:px-6 md:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl mx-auto max-w-lg"
              style={{
                background: 'linear-gradient(180deg, rgba(30,10,60,0.9) 0%, rgba(20,5,40,0.95) 100%)',
                border: '2px solid rgba(168,85,247,0.5)',
                boxShadow: '0 0 30px rgba(168,85,247,0.3), inset 0 0 40px rgba(88,28,135,0.4), 0 10px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Borda superior dourada */}
              <div 
                className="absolute top-0 left-[10%] right-[10%] h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, #fbbf24, #fcd34d, #fbbf24, transparent)',
                  boxShadow: '0 0 10px rgba(251,191,36,0.5)',
                }}
              />
              
              <p className="text-purple-300/80 text-xs sm:text-sm mb-3 sm:mb-4 tracking-[0.15em] sm:tracking-[0.2em] font-semibold">✦ CHECKPOINTS ✦</p>
              
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {PRIZE_LEVELS.filter(p => p.checkpoint).map((prize, i) => (
                  <motion.div
                    key={prize.level}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className={`px-3 sm:px-4 md:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-bold relative overflow-hidden ${
                      prize.level === 16 ? 'text-amber-900' : 'text-amber-200'
                    }`}
                    style={{
                      background: prize.level === 16 
                        ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 20%, #fcd34d 40%, #fbbf24 60%, #d97706 80%, #b45309 100%)'
                        : 'linear-gradient(180deg, rgba(88,28,135,0.7) 0%, rgba(60,20,100,0.9) 100%)',
                      border: prize.level === 16 
                        ? '2px sm:3px solid #fbbf24' 
                        : '1px sm:2px solid rgba(251,191,36,0.4)',
                      boxShadow: prize.level === 16 
                        ? '0 0 25px rgba(251,191,36,0.7), 0 0 50px rgba(251,191,36,0.4), inset 0 2px 10px rgba(255,255,255,0.3)' 
                        : '0 0 15px rgba(168,85,247,0.3), inset 0 1px 5px rgba(255,255,255,0.1)',
                      minWidth: prize.level === 16 ? '100px' : 'auto',
                    }}
                  >
                    {prize.level === 16 && (
                      <motion.div
                        className="absolute inset-0 opacity-60"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                        }}
                      />
                    )}
                    <span className="relative flex items-center justify-center gap-1">
                      {prize.level === 16 && <span>🏆</span>}
                      {prize.label}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              {/* Borda inferior */}
              <div 
                className="absolute bottom-0 left-[5%] right-[5%] h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.6), transparent)',
                }}
              />
            </div>
          </motion.div>

          {/* Botão de jogar - estilo pílula retroiluminada - RESPONSIVO */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1 }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px #a855f7, 0 0 60px #c084fc' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartConfig}
            className="relative px-8 sm:px-10 md:px-14 py-3 sm:py-4 md:py-5 rounded-full font-bold text-base sm:text-lg md:text-xl text-white overflow-hidden group -mt-2 sm:-mt-4"
            style={{
              background: 'linear-gradient(180deg, rgba(139,92,246,0.9) 0%, rgba(88,28,135,1) 100%)',
              border: '2px solid rgba(216,180,254,0.8)',
              boxShadow: '0 0 15px #a855f7, 0 0 30px rgba(168,85,247,0.5), inset 0 2px 10px rgba(255,255,255,0.1)',
            }}
          >
            {/* Efeito de brilho passando */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              }}
            />
            {/* Glow externo pulsante */}
            <motion.div 
              className="absolute -inset-1 rounded-full pointer-events-none"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                border: '2px solid #a855f7',
                filter: 'blur(4px)',
              }}
            />
            <span className="relative flex items-center gap-2 sm:gap-3">
              <span className="material-symbols-outlined text-xl sm:text-2xl">play_arrow</span>
              Jogar Agora
            </span>
          </motion.button>
        </div>
      </main>

      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      <footer className="relative z-10 w-full p-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p 
            className="text-xs text-purple-500/40 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(168,85,247,0.2)' }}
          >
            Inspirado no clássico programa de TV • Versão MedBrave
          </p>
        </div>
      </footer>
    </div>
  );
}

// Wrapper do Ranking com cenário do jogo
function RankingWrapper({ onBack, isDark }: { onBack: () => void; isDark: boolean }) {
  return (
    <div 
      className="min-h-screen relative overflow-hidden transition-colors duration-500"
      style={{
        background: isDark 
          ? 'linear-gradient(180deg, #050010 0%, #0d0420 50%, #050010 100%)'
          : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
      }}
    >
      {/* Cenário de estúdio de TV */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 150% 80% at 50% 20%, rgba(88,28,135,0.3) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 20% 80%, rgba(6,182,212,0.1) 0%, transparent 40%),
            radial-gradient(ellipse 100% 60% at 80% 80%, rgba(219,39,119,0.1) 0%, transparent 40%)
          `,
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 49%, rgba(168,85,247,0.3) 50%, transparent 51%),
            linear-gradient(90deg, transparent 49%, rgba(168,85,247,0.2) 50%, transparent 51%)
          `,
          backgroundSize: '60px 60px',
        }} />
        {/* Plateia */}
        <div className="absolute top-[2%] left-0 right-0 h-[100px] overflow-hidden">
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(15,5,30,0.95) 0%, rgba(25,10,50,0.8) 50%, transparent 100%)',
          }} />
          <div className="absolute top-[15px] left-[10%] right-[10%] h-[30px] flex justify-center gap-[4px]">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="relative" style={{ width: '12px', height: '24px' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[8px] h-[8px] rounded-full"
                  style={{ background: `rgba(${60 + Math.random() * 40}, ${40 + Math.random() * 30}, ${80 + Math.random() * 40}, 0.7)` }} />
                <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-[10px] h-[14px] rounded-t-full"
                  style={{ background: `rgba(${50 + Math.random() * 50}, ${30 + Math.random() * 40}, ${70 + Math.random() * 50}, 0.6)` }} />
              </div>
            ))}
          </div>
        </div>
        {/* Feixes de luz */}
        <div className="absolute top-0 left-[15%] w-[200px] h-[70%] opacity-15" style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0.3) 30%, transparent 100%)',
          transform: 'rotate(-12deg) translateY(-10%)',
          filter: 'blur(30px)',
        }} />
        <div className="absolute top-0 right-[15%] w-[200px] h-[70%] opacity-15" style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0.3) 30%, transparent 100%)',
          transform: 'rotate(12deg) translateY(-10%)',
          filter: 'blur(30px)',
        }} />
        {/* Chão reflexivo */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%]">
          <div className="absolute inset-0" style={{
            background: isDark
              ? 'linear-gradient(180deg, transparent 0%, rgba(10,5,25,0.95) 30%, rgba(5,0,15,1) 100%)'
              : 'linear-gradient(180deg, transparent 0%, rgba(26,10,46,0.95) 30%, rgba(26,10,46,1) 100%)',
          }} />
        </div>
        {/* Partículas */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              background: i % 3 === 0 ? 'rgba(251,191,36,0.6)' : 'rgba(168,85,247,0.6)',
              boxShadow: i % 3 === 0 ? '0 0 6px rgba(251,191,36,0.8)' : '0 0 6px rgba(168,85,247,0.8)',
            }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      {/* Conteúdo do Ranking */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center py-8">
        <RankingPanel onBack={onBack} />
      </div>
    </div>
  );
}

export default function ShowDoMilhaoPage() {
  return (
    <PagePlanGuard>
      <SoundProvider>
        <ShowDoMilhaoContent />
      </SoundProvider>
    </PagePlanGuard>
  );
}
