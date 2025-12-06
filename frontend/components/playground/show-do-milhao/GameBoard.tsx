'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GameState, 
  INITIAL_GAME_STATE, 
  PRIZE_LEVELS,
  formatPrize,
  AnimationPhase,
  GameConfig,
} from './types';
import { 
  questionContainerVariants, 
  questionTextVariants,
  optionsContainerVariants,
  pageTransitionVariants,
} from './animations';
import { OptionButton } from './OptionButton';
import { PrizeBar } from './PrizeBar';
import { HelpButtons } from './HelpButtons';
import { UniversityPanel } from './UniversityPanel';
import { CardsPanel } from './CardsPanel';
import { ResultModal } from './ResultModal';
import { CommentModal } from './CommentModal';
import { useGameSounds } from './SoundContext';
import { useTheme } from '@/app/providers';
import * as showDoMilhaoService from '@/services/showDoMilhaoService';

interface GameBoardProps {
  config: GameConfig;
  onExit: () => void;
}

const QUESTION_TIME_LIMIT = 120; // 2:00 em segundos (suspense tem 1:20, toca 2x)

export function GameBoard({ config, onExit }: GameBoardProps) {
  // Estado do jogo (vindo do backend)
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    ...INITIAL_GAME_STATE,
    status: 'playing',
    startTime: Date.now(),
  });
  
  // Estado da questão atual
  const [currentQuestion, setCurrentQuestion] = useState<showDoMilhaoService.IQuestion | null>(null);
  
  // Estados de UI
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [showUniversityPanel, setShowUniversityPanel] = useState(false);
  const [showCardsPanel, setShowCardsPanel] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [universityAnswers, setUniversityAnswers] = useState<showDoMilhaoService.IUniversityAnswer[] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [answerResult, setAnswerResult] = useState<showDoMilhaoService.IAnswerResult | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [usedHelpOnCurrentQuestion, setUsedHelpOnCurrentQuestion] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [pendingNextQuestionResult, setPendingNextQuestionResult] = useState<showDoMilhaoService.IAnswerResult | null>(null);
  const [isSkipMode, setIsSkipMode] = useState(false); // Modo skip - força avançar ao fechar modal
  const [usedMedbraveOnCurrentQuestion, setUsedMedbraveOnCurrentQuestion] = useState(false); // Se usou MedBrave nesta questão
  const [isMedbraveMode, setIsMedbraveMode] = useState(false); // Modo MedBrave - mostra comentário antes de responder
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const suspenseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const handleTimeUpRef = useRef<() => void>(() => {});
  const timeUpCalledRef = useRef<boolean>(false);

  // Hook de sons e tema
  const sounds = useGameSounds();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Função para limpar todos os timers
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (suspenseTimeoutRef.current) {
      clearTimeout(suspenseTimeoutRef.current);
      suspenseTimeoutRef.current = null;
    }
  }, []);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      clearAllTimers();
      sounds.stopCurrentAudio();
    };
  }, [clearAllTimers]);

  // Iniciar jogo no backend
  useEffect(() => {
    const initGame = async () => {
      try {
        setIsLoading(true);

        // Iniciar jogo no backend
        // Separar filterIds (sem underscore) de subFilterIds (com underscore)
        const filterIds = config.selectedSubjects.filter(id => !id.includes('_'));
        const subFilterIds = config.selectedSubjects.filter(id => id.includes('_'));
        
        const game = await showDoMilhaoService.startGame({
          filterIds,
          subFilterIds,
          institutionIds: config.selectedInstitutions,
          unansweredFilter: config.unansweredFilter,
        });

        setGameId(game.id);
        
        // DEBUG: Verificar se deve iniciar no modo Fatality
        const startInFatality = (config as any).startInFatality === true;
        
        if (startInFatality) {
          // Iniciar direto no modo Fatality
          setGameState(prev => ({
            ...prev,
            status: 'fatality',
            currentQuestionIndex: game.currentQuestionIndex,
            currentPrizeLevel: 16, // Já passou do milhão
            currentPrize: 1000000, // Simular que já ganhou 1 milhão
            guaranteedPrize: 1000000,
            fatalityMode: true,
            fatalityMultiplier: 1,
            fatalityCorrect: 0,
            usedHelps: {
              cards: true,
              university: true,
              skipsRemaining: 0,
              medbrave: true,
            },
            totalCorrect: 16,
          }));
          
          // Tocar áudio do Fatality
          sounds.playFatality(async () => {
            await loadQuestion(game.id, true); // true = modo Fatality
            setIsLoading(false);
          });
        } else {
          // Modo normal
          setGameState(prev => ({
            ...prev,
            status: 'playing',
            currentQuestionIndex: game.currentQuestionIndex,
            currentPrizeLevel: 0, // Começa no nível 0
            currentPrize: game.currentPrize,
            guaranteedPrize: game.guaranteedPrize,
            usedHelps: {
              cards: game.cardsUsed,
              university: game.universityUsed,
              skipsRemaining: game.skipsRemaining,
              medbrave: false,
            },
            totalCorrect: game.totalCorrect,
          }));

          // Buscar primeira questão
          await loadQuestion(game.id);
          
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Erro ao iniciar jogo:', error);
        setIsLoading(false);
        // Mostrar erro e voltar
        alert(error.message || 'Erro ao iniciar jogo');
        onExit();
      }
    };

    initGame();
  }, [config]);

  // Carregar questão atual
  const loadQuestion = async (gId: string, forceFatalityMode?: boolean) => {
    try {
      const question = await showDoMilhaoService.getCurrentQuestion(gId);
      setCurrentQuestion(question);
      setSelectedOption(null);
      setEliminatedOptions([]);
      setUniversityAnswers(null);
      setIsRevealing(false);
      setAnswerResult(null);
      setTimeRemaining(QUESTION_TIME_LIMIT);
      questionStartTimeRef.current = Date.now();
      timeUpCalledRef.current = false; // Resetar flag para nova questão
      setUsedHelpOnCurrentQuestion(false); // Resetar flag de ajuda usada
      setWaitingForNextQuestion(false);
      setPendingNextQuestionResult(null);
      setIsSkipMode(false); // Resetar modo skip
      setUsedMedbraveOnCurrentQuestion(false); // Resetar flag de MedBrave
      setIsMedbraveMode(false); // Resetar modo MedBrave
      
      // Atualizar currentPrizeLevel do estado com o valor retornado pelo backend
      setGameState(prev => ({
        ...prev,
        currentPrizeLevel: question.currentPrizeLevel ?? prev.currentPrizeLevel,
      }));
      
      // Iniciar animação da pergunta
      setAnimationPhase('question-entering');
      
      // Tocar áudio da pergunta valendo X reais
      // No modo Fatality, sempre tocar o áudio do milhão
      const isFatality = forceFatalityMode ?? gameState.fatalityMode;
      setTimeout(() => {
        const prizeForAudio = isFatality ? 1000000 : question.prizeLevel.prize;
        sounds.playQuestionPrize(prizeForAudio, () => {
          setAnimationPhase('options-entering');
          setTimeout(() => {
            setAnimationPhase('waiting-answer');
            startTimer();
            // Tocar suspense 2 vezes (1:20 cada = 2:40 total, mas timer é 2:00)
            // Quando o primeiro terminar, toca o segundo
            sounds.playSuspense(() => {
              // Primeiro suspense terminou, tocar o segundo
              sounds.playSuspense();
            });
          }, 800);
        });
      }, 500);
    } catch (error: any) {
      console.error('Erro ao carregar questão:', error);
    }
  };

  // Timer da pergunta
  const startTimer = () => {
    clearAllTimers();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearAllTimers();
          // Usar ref para garantir que a versão mais recente de handleTimeUp seja chamada
          handleTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Tempo acabou
  const handleTimeUp = useCallback(async () => {
    // Evitar execução dupla
    if (timeUpCalledRef.current) {
      console.log('⏰ handleTimeUp já foi chamado, ignorando...');
      return;
    }
    timeUpCalledRef.current = true;
    
    if (!gameId || !currentQuestion) {
      timeUpCalledRef.current = false;
      return;
    }
    
    console.log('⏰ Tempo acabou! Iniciando sequência...');
    
    // Parar qualquer áudio atual
    sounds.stopCurrentAudio();
    
    // Se o usuário tem uma opção selecionada, confirmar essa resposta automaticamente
    if (selectedOption) {
      console.log('✅ Opção selecionada encontrada, confirmando resposta automaticamente:', selectedOption);
      
      // Tocar áudio de tempo acabou
      sounds.playTimeUp();
      
      setAnimationPhase('suspense');
      
      // Calcular tempo gasto
      const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      
      try {
        // Enviar resposta para o backend
        const result = await showDoMilhaoService.answerQuestion(
          gameId,
          selectedOption,
          timeSpent
        );
        
        // Pequeno delay antes de revelar resultado
        setTimeout(() => {
          handleAnswerResult(result, result.isCorrect);
        }, 2000); // Delay um pouco maior para dar tempo do áudio "tempo acabou" tocar
      } catch (error: any) {
        console.error('Erro ao responder:', error);
        setAnimationPhase('waiting-answer');
        timeUpCalledRef.current = false;
      }
      return;
    }
    
    // Nenhuma opção selecionada - finalizar jogo
    console.log('❌ Nenhuma opção selecionada, finalizando jogo...');
    setAnimationPhase('revealing');
    
    // Flag para evitar execução dupla
    let timeUpCompleted = false;
    let goodbyePlayed = false;
    
    const finishGame = async () => {
      console.log('🎮 Finalizando jogo...');
      // Considerar como erro (não respondeu)
      try {
        const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        // Enviar resposta vazia para registrar timeout
        const result = await showDoMilhaoService.answerQuestion(
          gameId,
          '', // Resposta vazia = timeout
          timeSpent
        );
        
        setGameState(prev => ({
          ...prev,
          status: 'lost',
          currentPrize: result.guaranteedPrize,
          endTime: Date.now(),
        }));
      } catch {
        setGameState(prev => ({
          ...prev,
          status: 'lost',
          endTime: Date.now(),
        }));
      }
      
      setAnimationPhase('game-over');
      
      // Tocar "tchau" apenas uma vez após o áudio de tempo acabou
      if (!goodbyePlayed) {
        goodbyePlayed = true;
        console.log('👋 Tocando tchau...');
        sounds.playGoodbye();
      }
    };
    
    const onTimeUpComplete = () => {
      if (timeUpCompleted) return;
      timeUpCompleted = true;
      console.log('✅ Áudio de tempo acabou terminou, finalizando...');
      finishGame();
    };
    
    // Pequeno delay para garantir que o áudio anterior parou
    setTimeout(() => {
      console.log('🔊 Tocando áudio: seu_tempo_acabou_responda_agora');
      sounds.playTimeUp(onTimeUpComplete);
    }, 100);
    
    // Timeout de segurança (áudio de tempo acabou tem ~7 segundos)
    setTimeout(onTimeUpComplete, 8000);
  }, [gameId, currentQuestion, sounds, selectedOption]);

  // Manter a ref atualizada com a versão mais recente de handleTimeUp
  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  // Selecionar opção
  const handleSelectOption = useCallback((optionId: string) => {
    // Permitir selecionar/mudar opção enquanto aguarda resposta ou já tem opção selecionada
    if ((animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected') || eliminatedOptions.includes(optionId)) {
      return;
    }
    
    // Se clicar na mesma opção, desselecionar
    if (selectedOption === optionId) {
      setSelectedOption(null);
      setAnimationPhase('waiting-answer');
    } else {
      setSelectedOption(optionId);
      setAnimationPhase('option-selected');
    }
  }, [animationPhase, eliminatedOptions, selectedOption]);

  // Confirmar resposta
  const handleConfirmAnswer = useCallback(async () => {
    if (!selectedOption || !gameId || !currentQuestion) return;

    // Parar timer, suspense timeout e áudio atual
    clearAllTimers();
    sounds.stopCurrentAudio();

    setAnimationPhase('suspense');

    // Calcular tempo gasto
    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    try {
      // Enviar resposta para o backend
      const result = await showDoMilhaoService.answerQuestion(
        gameId,
        selectedOption,
        timeSpent
      );

      // Pequeno suspense antes de revelar
      setTimeout(() => {
        handleAnswerResult(result, result.isCorrect);
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao responder:', error);
      setAnimationPhase('waiting-answer');
    }
  }, [selectedOption, gameId, currentQuestion, sounds]);

  // Processar resultado da resposta
  const handleAnswerResult = (result: showDoMilhaoService.IAnswerResult, isCorrect: boolean) => {
    setAnimationPhase('revealing');
    setIsRevealing(true);
    setAnswerResult(result);

    // Flag para evitar execução dupla do callback
    let callbackExecuted = false;

    const executeCallback = (callback: () => void) => {
      if (callbackExecuted) return;
      callbackExecuted = true;
      callback();
    };

    // Se está no modo Fatality
    if (gameState.fatalityMode) {
      if (isCorrect) {
        sounds.playCorrectAnswer(() => executeCallback(() => handleFatalityAnswer(true)));
        // Timeout de segurança caso o áudio não termine
        setTimeout(() => executeCallback(() => handleFatalityAnswer(true)), 5000);
      } else {
        sounds.playWrongAnswer(() => executeCallback(() => handleFatalityAnswer(false)));
        setTimeout(() => executeCallback(() => handleFatalityAnswer(false)), 5000);
      }
      return;
    }

    // Modo normal
    if (isCorrect) {
      const onCorrectComplete = () => {
        if (result.gameOver) {
          // Ganhou!
          setGameState(prev => ({
            ...prev,
            status: 'won',
            currentPrize: result.newPrize,
            guaranteedPrize: result.guaranteedPrize,
            totalCorrect: prev.totalCorrect + 1,
            endTime: Date.now(),
          }));
          setAnimationPhase('game-over');
          sounds.playVictory();
        } else {
          // Verificar se alcançou o checkpoint de 50 mil para renovar ajudas
          const reachedCheckpoint50k = result.guaranteedPrize >= 50000 && gameState.guaranteedPrize < 50000;
          
          // Atualizar estado do jogo
          setGameState(prev => ({
            ...prev,
            currentPrize: result.newPrize,
            guaranteedPrize: result.guaranteedPrize,
            totalCorrect: prev.totalCorrect + 1,
            // Renovar ajudas se alcançou checkpoint de 50 mil
            ...(reachedCheckpoint50k ? {
              usedHelps: {
                cards: false,
                university: false,
                skipsRemaining: 3,
                medbrave: false,
              },
            } : {}),
          }));
          
          // Se usou ajuda (exceto MedBrave que já mostrou o comentário), abrir modal de comentário automaticamente
          if (usedHelpOnCurrentQuestion && !usedMedbraveOnCurrentQuestion && currentQuestion?.professorComment) {
            setPendingNextQuestionResult(result);
            setWaitingForNextQuestion(true);
            setShowCommentModal(true);
          } else {
            // Pausar e mostrar botões de próxima questão e comentário
            setPendingNextQuestionResult(result);
            setWaitingForNextQuestion(true);
          }
        }
      };
      
      sounds.playCorrectAnswer(() => executeCallback(onCorrectComplete));
      // Timeout de segurança (áudio de "certa resposta" tem ~3-4 segundos)
      setTimeout(() => executeCallback(onCorrectComplete), 5000);
    } else {
      const onWrongComplete = () => {
        setGameState(prev => ({
          ...prev,
          status: 'lost',
          currentPrize: result.guaranteedPrize,
          endTime: Date.now(),
        }));
        setAnimationPhase('game-over');
        sounds.playGoodbye();
      };
      
      sounds.playWrongAnswer(() => executeCallback(onWrongComplete));
      // Timeout de segurança
      setTimeout(() => executeCallback(onWrongComplete), 5000);
    }
  };

  // Ir para próxima pergunta
  const handleNextQuestion = (result: showDoMilhaoService.IAnswerResult) => {
    setAnimationPhase('transitioning');
    
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentQuestionIndex: result.nextQuestionIndex || prev.currentQuestionIndex + 1,
        currentPrize: result.newPrize,
        guaranteedPrize: result.guaranteedPrize,
        totalCorrect: prev.totalCorrect + 1,
      }));
      
      if (gameId) {
        loadQuestion(gameId);
      }
    }, 1000);
  };

  // Usar cartas
  const handleUseCards = useCallback(async () => {
    if (gameState.usedHelps.cards || (animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected') || !gameId) return;
    
    sounds.playCards();
    setShowCardsPanel(true);
  }, [gameState.usedHelps.cards, animationPhase, gameId, sounds]);

  const handleCardsEliminate = useCallback(async (): Promise<number> => {
    if (!gameId) return 0;
    
    try {
      const result = await showDoMilhaoService.useCards(gameId);
      
      if (result.success && result.data?.eliminatedOptions) {
        setEliminatedOptions(result.data.eliminatedOptions);
        setUsedHelpOnCurrentQuestion(true); // Marcar que usou ajuda
        setGameState(prev => ({
          ...prev,
          usedHelps: { ...prev.usedHelps, cards: true },
        }));
        return result.data.eliminatedOptions.length;
      }
      return 0;
    } catch (error: any) {
      console.error('Erro ao usar cartas:', error);
      return 0;
    }
  }, [gameId]);

  // Usar universitários
  const handleUseUniversity = useCallback(async () => {
    if (gameState.usedHelps.university || (animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected') || !gameId) return;
    
    sounds.playUniversity();
    
    try {
      const result = await showDoMilhaoService.useUniversity(gameId);
      
      if (result.success && result.data?.universityAnswers) {
        setUniversityAnswers(result.data.universityAnswers);
        setUsedHelpOnCurrentQuestion(true); // Marcar que usou ajuda
        setGameState(prev => ({
          ...prev,
          usedHelps: { ...prev.usedHelps, university: true },
        }));
        setShowUniversityPanel(true);
      }
    } catch (error: any) {
      console.error('Erro ao usar universitários:', error);
    }
  }, [gameState.usedHelps.university, animationPhase, gameId, sounds]);

  // Usar Opinião MedBrave
  const handleUseMedbrave = useCallback(() => {
    if (gameState.usedHelps.medbrave || (animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected') || !currentQuestion?.professorComment) return;
    
    // Marcar que usou a ajuda
    setUsedHelpOnCurrentQuestion(true);
    setUsedMedbraveOnCurrentQuestion(true);
    setIsMedbraveMode(true);
    setGameState(prev => ({
      ...prev,
      usedHelps: { ...prev.usedHelps, medbrave: true },
    }));
    
    // Abrir modal de comentário
    setShowCommentModal(true);
  }, [gameState.usedHelps.medbrave, animationPhase, currentQuestion?.professorComment]);

  // Pular questão
  const handleSkip = useCallback(async () => {
    if (gameState.usedHelps.skipsRemaining <= 0 || (animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected') || !gameId) return;

    // Parar timer, suspense timeout e áudio atual
    clearAllTimers();
    sounds.stopCurrentAudio();
    
    setAnimationPhase('transitioning');
    
    try {
      const result = await showDoMilhaoService.useSkip(gameId);
      
      if (result.success && result.data?.newQuestionIndex !== undefined) {
        setGameState(prev => ({
          ...prev,
          currentQuestionIndex: result.data!.newQuestionIndex!,
          usedHelps: {
            ...prev.usedHelps,
            skipsRemaining: prev.usedHelps.skipsRemaining - 1,
          },
        }));
        
        // Tocar áudio de skip e aguardar terminar
        let skipCompleted = false;
        const onSkipComplete = () => {
          if (skipCompleted) return;
          skipCompleted = true;
          
          // Se tem comentário na questão atual, mostrar modal antes de ir para próxima
          if (currentQuestion?.professorComment) {
            // Criar um resultado fake para o skip (não precisa de dados de resposta)
            setPendingNextQuestionResult({
              isCorrect: false,
              correctOptionId: '',
              newPrize: gameState.currentPrize,
              guaranteedPrize: gameState.guaranteedPrize,
              gameOver: false,
              status: 'playing',
              nextQuestionIndex: result.data!.newQuestionIndex!,
            });
            setIsSkipMode(true); // Ativar modo skip
            setShowCommentModal(true);
          } else {
            loadQuestion(gameId);
          }
        };
        
        sounds.playSkip(onSkipComplete);
        // Timeout de segurança (áudio de skip tem ~4 segundos)
        setTimeout(onSkipComplete, 5000);
      }
    } catch (error: any) {
      console.error('Erro ao pular:', error);
      setAnimationPhase('waiting-answer');
    }
  }, [gameState, animationPhase, gameId, sounds, currentQuestion]);

  // Parar o jogo
  const handleStop = useCallback(() => {
    setShowStopConfirm(true);
  }, []);

  const confirmStop = useCallback(async () => {
    if (!gameId) return;
    
    clearAllTimers();
    sounds.stopCurrentAudio();
    
    try {
      const result = await showDoMilhaoService.stopGame(gameId);
      
      setGameState(prev => ({
        ...prev,
        status: 'stopped',
        currentPrize: result.finalPrize,
        endTime: Date.now(),
      }));
      setAnimationPhase('game-over');
      setShowStopConfirm(false);
      sounds.playGoodbye();
    } catch (error: any) {
      console.error('Erro ao parar jogo:', error);
    }
  }, [gameId, sounds]);

  // Jogar novamente
  const handlePlayAgain = useCallback(() => {
    // Reiniciar o jogo
    setGameId(null);
    setGameState({
      ...INITIAL_GAME_STATE,
      status: 'playing',
      startTime: Date.now(),
    });
    setCurrentQuestion(null);
    setIsLoading(true);
    
    // Reiniciar
    const initGame = async () => {
      try {
        sounds.playGameStart();

        // Separar filterIds (sem underscore) de subFilterIds (com underscore)
        const filterIds = config.selectedSubjects.filter(id => !id.includes('_'));
        const subFilterIds = config.selectedSubjects.filter(id => id.includes('_'));
        
        const game = await showDoMilhaoService.startGame({
          filterIds,
          subFilterIds,
          institutionIds: config.selectedInstitutions,
          unansweredFilter: config.unansweredFilter,
        });

        setGameId(game.id);
        setGameState(prev => ({
          ...prev,
          status: 'playing',
          currentQuestionIndex: game.currentQuestionIndex,
          currentPrizeLevel: 0, // Reiniciar nível de prêmio
          currentPrize: game.currentPrize,
          guaranteedPrize: game.guaranteedPrize,
          usedHelps: {
            cards: game.cardsUsed,
            university: game.universityUsed,
            skipsRemaining: game.skipsRemaining,
            medbrave: false,
          },
          totalCorrect: game.totalCorrect,
        }));

        await loadQuestion(game.id);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Erro ao reiniciar jogo:', error);
        setIsLoading(false);
      }
    };

    initGame();
  }, [config, sounds]);

  // Iniciar modo Fatality
  const handleStartFatality = useCallback(async () => {
    if (!gameId) return;
    
    // Entrar no modo Fatality
    setGameState(prev => ({
      ...prev,
      status: 'fatality',
      fatalityMode: true,
      fatalityMultiplier: 1,
      fatalityCorrect: 0,
      // Desabilitar todas as ajudas
      usedHelps: {
        cards: true,
        university: true,
        skipsRemaining: 0,
        medbrave: true,
      },
    }));
    
    // Tocar áudio do Fatality
    sounds.stopCurrentAudio();
    sounds.playFatality(() => {
      // Após o áudio, carregar nova questão
      setAnimationPhase('transitioning');
      
      try {
        // Buscar próxima questão (reutilizamos o mesmo gameId)
        loadQuestion(gameId, true); // true = modo Fatality
      } catch (error) {
        console.error('Erro ao iniciar Fatality:', error);
      }
    });
  }, [gameId, sounds]);

  // Processar resposta no modo Fatality
  const handleFatalityAnswer = useCallback(async (isCorrect: boolean) => {
    if (isCorrect) {
      // Acertou! Aumentar multiplicador
      setGameState(prev => ({
        ...prev,
        fatalityMultiplier: prev.fatalityMultiplier + 1,
        fatalityCorrect: prev.fatalityCorrect + 1,
        totalCorrect: prev.totalCorrect + 1,
      }));
      
      // Próxima questão
      setAnimationPhase('transitioning');
      
      setTimeout(() => {
        if (gameId) {
          loadQuestion(gameId, true); // true = modo Fatality
        }
      }, 1000);
    } else {
      // Errou! Fim do Fatality
      setGameState(prev => ({
        ...prev,
        status: 'lost',
        endTime: Date.now(),
      }));
      setAnimationPhase('game-over');
      sounds.playWrongAnswer(() => sounds.playGoodbye());
    }
  }, [gameId, sounds]);

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Encontrar índice correto para mostrar resultado
  const getCorrectIndex = () => {
    if (!answerResult || !currentQuestion) return -1;
    return currentQuestion.options.findIndex(opt => opt.id === answerResult.correctOptionId);
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, #050010 0%, #0d0420 50%, #050010 100%)'
            : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {/* Logo estilo landing page */}
          <div className="mb-6">
            {/* SHOW */}
            <motion.h1
              animate={{ 
                textShadow: [
                  '0 0 10px rgba(255,255,255,0.5), 0 0 20px #a855f7, 0 0 40px #a855f7',
                  '0 0 15px rgba(255,255,255,0.7), 0 0 30px #a855f7, 0 0 60px #a855f7',
                  '0 0 10px rgba(255,255,255,0.5), 0 0 20px #a855f7, 0 0 40px #a855f7',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl sm:text-5xl font-black tracking-wider"
              style={{
                color: '#7c3aed',
                WebkitTextStroke: '1px rgba(255,255,255,0.7)',
              }}
            >
              SHOW
            </motion.h1>
            
            {/* DO */}
            <span
              className="block text-sm font-bold tracking-[0.4em] -mt-1"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 50%, #808080 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              DO
            </span>
            
            {/* MILHÃO */}
            <motion.h2
              animate={{ 
                textShadow: [
                  '0 0 10px #fbbf24, 0 0 20px #fbbf24',
                  '0 0 20px #fbbf24, 0 0 40px #fbbf24',
                  '0 0 10px #fbbf24, 0 0 20px #fbbf24',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="text-3xl sm:text-4xl font-black tracking-wider -mt-1"
              style={{
                background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MILHÃO
            </motion.h2>
            
            {/* Placa MEDBRAVE */}
            <motion.div
              animate={{ rotate: [-12, -8, -12] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block mt-2 px-3 py-1"
              style={{
                background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #d97706 70%, #92400e 100%)',
                borderRadius: '3px',
                boxShadow: '0 2px 8px rgba(251,191,36,0.5)',
                border: '1px solid #b45309',
              }}
            >
              <span 
                className="text-xs font-black tracking-wider font-azonix"
                style={{ color: '#78350f' }}
              >
                MEDBRAVE
              </span>
            </motion.div>
          </div>
          
          {/* Loading indicator */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-purple-400/70"
          >
            Preparando o jogo...
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, #050010 0%, #0d0420 50%, #050010 100%)'
            : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
        }}
      >
        <div className="text-center">
          <p className="text-purple-400/70 mb-4">Nenhuma questão disponível</p>
          <button 
            onClick={onExit} 
            className="px-6 py-3 rounded-xl text-white"
            style={{
              background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
              border: '2px solid #a855f7',
            }}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Usar o prizeLevel da questão atual (retornado pelo backend com base no current_prize_level)
  const currentPrizeLevel = currentQuestion?.prizeLevel || PRIZE_LEVELS[gameState.currentPrizeLevel] || PRIZE_LEVELS[0];
  const isFatality = gameState.fatalityMode;

  return (
    <div 
      className="min-h-screen relative overflow-hidden transition-all duration-1000"
      style={{
        // Tema claro: roxo escuro mais suave | Tema escuro: quase preto
        background: isFatality 
          ? 'linear-gradient(180deg, #0a0000 0%, #1a0505 50%, #0a0000 100%)'
          : isDark
            ? 'linear-gradient(180deg, #050010 0%, #0d0420 50%, #050010 100%)'
            : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
      }}
    >
      {/* ===== CENÁRIO DE ESTÚDIO DE TV ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Paredes de LED */}
        <div 
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: isFatality 
              ? `
                radial-gradient(ellipse 150% 80% at 50% 20%, rgba(185,28,28,0.3) 0%, transparent 50%),
                radial-gradient(ellipse 100% 60% at 20% 80%, rgba(239,68,68,0.1) 0%, transparent 40%),
                radial-gradient(ellipse 100% 60% at 80% 80%, rgba(127,29,29,0.15) 0%, transparent 40%)
              `
              : `
                radial-gradient(ellipse 150% 80% at 50% 20%, rgba(88,28,135,0.2) 0%, transparent 50%),
                radial-gradient(ellipse 100% 60% at 20% 80%, rgba(6,182,212,0.08) 0%, transparent 40%),
                radial-gradient(ellipse 100% 60% at 80% 80%, rgba(219,39,119,0.08) 0%, transparent 40%)
              `,
          }}
        />
        
        {/* Grid tech */}
        <div 
          className="absolute inset-0 transition-all duration-1000 opacity-5"
          style={{
            backgroundImage: isFatality 
              ? `
                linear-gradient(0deg, transparent 49%, rgba(239,68,68,0.4) 50%, transparent 51%),
                linear-gradient(90deg, transparent 49%, rgba(239,68,68,0.3) 50%, transparent 51%)
              `
              : `
                linear-gradient(0deg, transparent 49%, rgba(168,85,247,0.3) 50%, transparent 51%),
                linear-gradient(90deg, transparent 49%, rgba(168,85,247,0.2) 50%, transparent 51%)
              `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Feixes de luz */}
        <div 
          className="absolute top-0 left-[15%] w-[150px] h-[60%] transition-all duration-1000 opacity-10"
          style={{
            background: isFatality 
              ? 'linear-gradient(180deg, rgba(239,68,68,0.9) 0%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, transparent 100%)',
            transform: 'rotate(-10deg)',
            filter: 'blur(30px)',
          }}
        />
        <div 
          className="absolute top-0 right-[15%] w-[150px] h-[60%] transition-all duration-1000 opacity-10"
          style={{
            background: isFatality 
              ? 'linear-gradient(180deg, rgba(239,68,68,0.9) 0%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, transparent 100%)',
            transform: 'rotate(10deg)',
            filter: 'blur(30px)',
          }}
        />

        {/* Efeito de pulso vermelho no Fatality */}
        {isFatality && (
          <motion.div
            className="absolute inset-0"
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.2) 0%, transparent 70%)',
            }}
          />
        )}
        
        {/* Chão reflexivo */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%]">
          <div 
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: isFatality 
                ? 'linear-gradient(180deg, transparent 0%, rgba(20,5,5,0.95) 50%, rgba(10,0,0,1) 100%)'
                : isDark
                  ? 'linear-gradient(180deg, transparent 0%, rgba(10,5,25,0.95) 50%, rgba(5,0,15,1) 100%)'
                  : 'linear-gradient(180deg, transparent 0%, rgba(26,10,46,0.95) 50%, rgba(26,10,46,1) 100%)',
            }}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-1000 opacity-40"
            style={{
              background: isFatality 
                ? 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.8) 20%, rgba(185,28,28,1) 50%, rgba(239,68,68,0.8) 80%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.8) 20%, rgba(251,191,36,0.8) 50%, rgba(168,85,247,0.8) 80%, transparent 100%)',
            }}
          />
        </div>
      </div>

      {/* Banner do Fatality - RESPONSIVO */}
      <AnimatePresence>
        {isFatality && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-20 py-1.5 sm:py-2 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(185,28,28,0.9) 0%, rgba(127,29,29,0.8) 100%)',
              borderBottom: '2px solid #ef4444',
              boxShadow: '0 0 30px rgba(239,68,68,0.5)',
            }}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              <span className="text-lg sm:text-2xl">💀</span>
              <span className="text-white font-bold text-sm sm:text-lg tracking-wider">MODO FATALITY</span>
              <span className="text-lg sm:text-2xl">💀</span>
              <span 
                className="ml-2 sm:ml-4 px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-base sm:text-xl"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                  color: '#78350f',
                  boxShadow: '0 0 15px rgba(251,191,36,0.5)',
                }}
              >
                {gameState.fatalityMultiplier}x
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Área principal do jogo */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col">
          {/* Header com Timer - RESPONSIVO */}
          <div className={`flex items-center justify-between mb-3 sm:mb-4 md:mb-6 ${isFatality ? 'mt-10 sm:mt-12' : ''}`}>
            <button
              onClick={onExit}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors border ${isFatality ? 'hover:bg-red-500/20 border-red-500/30' : 'hover:bg-purple-500/20 border-purple-500/30'}`}
            >
              <span className={`material-symbols-outlined text-xl sm:text-2xl ${isFatality ? 'text-red-300' : 'text-purple-300'}`}>arrow_back</span>
            </button>

            {/* Timer - estilo Show do Milhão com moldura neon - RESPONSIVO */}
            <motion.div 
              className="relative scale-75 sm:scale-90 md:scale-100 origin-center"
              animate={
                timeRemaining <= 10 && timeRemaining > 0
                  ? { 
                      scale: [1, 1.08, 1],
                      rotate: timeRemaining <= 5 ? [-2, 2, -2, 2, 0] : 0,
                    }
                  : timeRemaining === 0
                    ? {
                        scale: [1, 1.3, 0.9, 1.1, 1],
                        rotate: [-5, 5, -3, 3, 0],
                      }
                    : {}
              }
              transition={{ 
                duration: timeRemaining === 0 ? 0.6 : timeRemaining <= 5 ? 0.25 : 0.5, 
                repeat: timeRemaining <= 10 && timeRemaining > 0 ? Infinity : 0,
                repeatType: 'reverse',
              }}
            >
              {/* Glow externo pulsante */}
              <motion.div
                className="absolute -inset-3 rounded-3xl"
                animate={
                  timeRemaining <= 10 
                    ? { opacity: [0.4, 0.8, 0.4] }
                    : { opacity: 0.3 }
                }
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{
                  background: isFatality
                    ? 'radial-gradient(ellipse, rgba(239,68,68,0.6) 0%, transparent 70%)'
                    : timeRemaining <= 10
                      ? 'radial-gradient(ellipse, rgba(239,68,68,0.6) 0%, transparent 70%)'
                      : timeRemaining <= 30
                        ? 'radial-gradient(ellipse, rgba(251,191,36,0.4) 0%, transparent 70%)'
                        : isDark
                          ? 'radial-gradient(ellipse, rgba(168,85,247,0.3) 0%, transparent 70%)'
                          : 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)',
                  filter: 'blur(10px)',
                }}
              />
              
              {/* Container principal - moldura trapezoide estilo TV */}
              <div 
                className="relative px-6 sm:px-10 md:px-14 py-3 sm:py-4 md:py-5"
                style={{
                  background: isFatality
                    ? 'linear-gradient(180deg, rgba(127,29,29,0.95) 0%, rgba(69,10,10,0.98) 100%)'
                    : timeRemaining <= 10 
                      ? 'linear-gradient(180deg, rgba(127,29,29,0.9) 0%, rgba(69,10,10,0.95) 100%)'
                      : timeRemaining <= 30 
                        ? 'linear-gradient(180deg, rgba(120,53,15,0.85) 0%, rgba(69,26,3,0.9) 100%)'
                        : isDark
                          ? 'linear-gradient(180deg, rgba(88,28,135,0.85) 0%, rgba(30,10,60,0.95) 100%)'
                          : 'linear-gradient(180deg, rgba(243,232,255,0.98) 0%, rgba(233,213,255,0.95) 100%)',
                  clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
                  boxShadow: isFatality || timeRemaining <= 10
                    ? '0 0 40px rgba(239,68,68,0.7), inset 0 0 30px rgba(239,68,68,0.3)'
                    : timeRemaining <= 30
                      ? '0 0 30px rgba(251,191,36,0.5), inset 0 0 20px rgba(251,191,36,0.2)'
                      : isDark
                        ? '0 0 25px rgba(168,85,247,0.4), inset 0 0 20px rgba(168,85,247,0.2)'
                        : '0 4px 20px rgba(124,58,237,0.3), inset 0 0 15px rgba(124,58,237,0.1)',
                }}
              >
                {/* Borda neon superior */}
                <div 
                  className="absolute top-0 left-[5%] right-[5%] h-[3px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(90deg, transparent, #fca5a5, #ef4444, #fca5a5, transparent)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(90deg, transparent, #fef3c7, #fbbf24, #fef3c7, transparent)'
                        : isDark
                          ? 'linear-gradient(90deg, transparent, #d8b4fe, #a855f7, #d8b4fe, transparent)'
                          : 'linear-gradient(90deg, transparent, #c4b5fd, #7c3aed, #c4b5fd, transparent)',
                    boxShadow: isFatality || timeRemaining <= 10
                      ? '0 0 15px #ef4444, 0 0 30px #ef4444'
                      : timeRemaining <= 30
                        ? '0 0 15px #fbbf24, 0 0 25px #fbbf24'
                        : isDark
                          ? '0 0 15px #a855f7, 0 0 25px #a855f7'
                          : '0 0 10px #7c3aed, 0 0 20px rgba(124,58,237,0.5)',
                  }}
                />
                
                {/* Bordas laterais neon */}
                <div 
                  className="absolute top-0 bottom-0 left-0 w-[3px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(180deg, #fca5a5, #ef4444)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(180deg, #fef3c7, #fbbf24)'
                        : isDark
                          ? 'linear-gradient(180deg, #d8b4fe, #a855f7)'
                          : 'linear-gradient(180deg, #c4b5fd, #7c3aed)',
                    transform: 'skewY(-5deg)',
                    transformOrigin: 'top',
                    boxShadow: isFatality || timeRemaining <= 10 
                      ? '0 0 12px #ef4444' 
                      : timeRemaining <= 30 
                        ? '0 0 12px #fbbf24' 
                        : isDark 
                          ? '0 0 12px #a855f7' 
                          : '0 0 8px rgba(124,58,237,0.6)',
                  }}
                />
                <div 
                  className="absolute top-0 bottom-0 right-0 w-[3px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(180deg, #fca5a5, #ef4444)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(180deg, #fef3c7, #fbbf24)'
                        : isDark
                          ? 'linear-gradient(180deg, #d8b4fe, #a855f7)'
                          : 'linear-gradient(180deg, #c4b5fd, #7c3aed)',
                    transform: 'skewY(5deg)',
                    transformOrigin: 'top',
                    boxShadow: isFatality || timeRemaining <= 10 
                      ? '0 0 12px #ef4444' 
                      : timeRemaining <= 30 
                        ? '0 0 12px #fbbf24' 
                        : isDark 
                          ? '0 0 12px #a855f7' 
                          : '0 0 8px rgba(124,58,237,0.6)',
                  }}
                />
                
                {/* Borda neon inferior */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(90deg, #ef4444, #fbbf24, #ef4444)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(90deg, #fbbf24, #fcd34d, #fbbf24)'
                        : isDark
                          ? 'linear-gradient(90deg, #a855f7, #fbbf24, #a855f7)'
                          : 'linear-gradient(90deg, #7c3aed, #f59e0b, #7c3aed)',
                    boxShadow: isFatality || timeRemaining <= 10
                      ? '0 0 20px #ef4444, 0 0 40px rgba(251,191,36,0.5)'
                      : isDark
                        ? '0 0 20px #a855f7, 0 0 35px rgba(251,191,36,0.4)'
                        : '0 0 15px rgba(124,58,237,0.5), 0 0 25px rgba(245,158,11,0.3)',
                  }}
                />
                
                {/* Linhas decorativas horizontais */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -left-8 w-6 h-[2px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(90deg, transparent, #ef4444)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(90deg, transparent, #fbbf24)'
                        : isDark
                          ? 'linear-gradient(90deg, transparent, #a855f7)'
                          : 'linear-gradient(90deg, transparent, #7c3aed)',
                    boxShadow: isFatality || timeRemaining <= 10 
                      ? '0 0 8px #ef4444' 
                      : timeRemaining <= 30 
                        ? '0 0 8px #fbbf24' 
                        : isDark 
                          ? '0 0 8px #a855f7' 
                          : '0 0 6px rgba(124,58,237,0.5)',
                  }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -right-8 w-6 h-[2px]"
                  style={{
                    background: isFatality || timeRemaining <= 10
                      ? 'linear-gradient(90deg, #ef4444, transparent)'
                      : timeRemaining <= 30
                        ? 'linear-gradient(90deg, #fbbf24, transparent)'
                        : isDark
                          ? 'linear-gradient(90deg, #a855f7, transparent)'
                          : 'linear-gradient(90deg, #7c3aed, transparent)',
                    boxShadow: isFatality || timeRemaining <= 10 
                      ? '0 0 8px #ef4444' 
                      : timeRemaining <= 30 
                        ? '0 0 8px #fbbf24' 
                        : isDark 
                          ? '0 0 8px #a855f7' 
                          : '0 0 6px rgba(124,58,237,0.5)',
                  }}
                />
                
                {/* Efeito de pulso interno quando crítico */}
                {timeRemaining <= 10 && timeRemaining > 0 && (
                  <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    style={{ 
                      background: 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 60%)',
                    }}
                  />
                )}
                
                {/* Explosão quando chega a 0 */}
                {timeRemaining === 0 && (
                  <>
                    <motion.div
                      className="absolute inset-0"
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 3, opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      style={{ 
                        background: 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(251,191,36,0.4) 50%, transparent 70%)',
                      }}
                    />
                    {/* Partículas de explosão */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                          background: i % 2 === 0 ? '#ef4444' : '#fbbf24',
                          boxShadow: i % 2 === 0 ? '0 0 8px #ef4444' : '0 0 8px #fbbf24',
                        }}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ 
                          x: Math.cos(i * 45 * Math.PI / 180) * 80,
                          y: Math.sin(i * 45 * Math.PI / 180) * 80,
                          scale: 0,
                          opacity: 0,
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    ))}
                  </>
                )}
                
                {/* Número do timer - estilo 3D com contorno - RESPONSIVO */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={timeRemaining}
                    initial={{ rotateX: -90, opacity: 0, scale: 0.8 }}
                    animate={{ rotateX: 0, opacity: 1, scale: 1 }}
                    exit={{ rotateX: 90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-wider"
                    style={{
                      fontFamily: '"Orbitron", "Rajdhani", "Share Tech Mono", monospace',
                      color: isFatality || timeRemaining <= 10
                        ? '#fecaca'
                        : timeRemaining <= 30
                          ? '#fef3c7'
                          : isDark
                            ? '#e9d5ff'
                            : '#581c87',
                      textShadow: isFatality || timeRemaining <= 10
                        ? `
                          0 0 5px #fff,
                          0 0 10px #fff,
                          0 0 20px #ef4444,
                          0 0 40px #ef4444,
                          0 0 60px #ef4444,
                          2px 2px 0 #7f1d1d,
                          3px 3px 0 #450a0a
                        `
                        : timeRemaining <= 30
                          ? `
                            0 0 5px #fff,
                            0 0 10px rgba(255,255,255,0.8),
                            0 0 20px #fbbf24,
                            0 0 40px #fbbf24,
                            2px 2px 0 #92400e,
                            3px 3px 0 #78350f
                          `
                          : isDark
                            ? `
                              0 0 5px #fff,
                              0 0 10px rgba(255,255,255,0.6),
                              0 0 20px #a855f7,
                              0 0 35px #a855f7,
                              2px 2px 0 #581c87,
                              3px 3px 0 #3b0764
                            `
                            : `
                              0 0 3px rgba(124,58,237,0.4),
                              0 0 8px rgba(124,58,237,0.3),
                              1px 1px 0 #c4b5fd,
                              2px 2px 0 #a78bfa
                            `,
                      WebkitTextStroke: isFatality || timeRemaining <= 10
                        ? '1px rgba(255,255,255,0.5)'
                        : timeRemaining <= 30
                          ? '1px rgba(255,255,255,0.4)'
                          : isDark
                            ? '1px rgba(255,255,255,0.3)'
                            : '1px rgba(124,58,237,0.3)',
                    }}
                  >
                    {formatTime(timeRemaining)}
                  </motion.div>
                </AnimatePresence>
                
                {/* Ícone de alerta animado */}
                {timeRemaining <= 10 && timeRemaining > 0 && (
                  <motion.div
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.3, 1], 
                      rotate: [-10, 10, -10],
                    }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                    style={{
                      background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                      boxShadow: '0 0 15px #ef4444',
                    }}
                  >
                    <span className="material-symbols-outlined text-white text-lg">warning</span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Botão de som - RESPONSIVO */}
              <button
                onClick={sounds.toggleMute}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors border ${isFatality ? 'hover:bg-red-500/20 border-red-500/30' : 'hover:bg-purple-500/20 border-purple-500/30'}`}
                title={sounds.isMuted ? 'Ativar som' : 'Desativar som'}
              >
                <span className={`material-symbols-outlined text-xl sm:text-2xl ${isFatality ? 'text-red-300' : 'text-purple-300'}`}>
                  {sounds.isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
              
              {/* Esconder botão Parar no modo Fatality - RESPONSIVO */}
              {!isFatality && (
                <button
                  onClick={handleStop}
                  disabled={gameState.currentQuestionIndex === 0}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all"
                  style={{
                    background: gameState.currentQuestionIndex === 0 
                      ? 'rgba(40,20,70,0.3)' 
                      : 'linear-gradient(180deg, rgba(251,191,36,0.2) 0%, rgba(180,83,9,0.3) 100%)',
                    border: gameState.currentQuestionIndex === 0 
                      ? '2px solid rgba(100,50,150,0.2)' 
                      : '2px solid rgba(251,191,36,0.4)',
                    color: gameState.currentQuestionIndex === 0 ? 'rgba(168,85,247,0.3)' : '#fbbf24',
                    cursor: gameState.currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Parar
                </button>
              )}
            </div>
          </div>

          {/* ===== BARRA DE PRÊMIO COMPACTA MOBILE/TABLET ===== */}
          <div className="lg:hidden mb-3 sm:mb-4">
            <div 
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl"
              style={{
                background: isFatality 
                  ? 'linear-gradient(90deg, rgba(60,10,10,0.7) 0%, rgba(40,5,5,0.85) 50%, rgba(60,10,10,0.7) 100%)'
                  : 'linear-gradient(90deg, rgba(30,10,60,0.7) 0%, rgba(20,5,40,0.85) 50%, rgba(30,10,60,0.7) 100%)',
                border: isFatality ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(168,85,247,0.4)',
                boxShadow: isFatality ? '0 0 15px rgba(239,68,68,0.2)' : '0 0 15px rgba(168,85,247,0.2)',
              }}
            >
              {/* Prêmio Atual */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                    boxShadow: '0 0 10px rgba(251,191,36,0.5)',
                  }}
                >
                  <span className="text-amber-900 font-bold text-xs sm:text-sm">
                    {gameState.currentPrizeLevel > 0 ? gameState.currentPrizeLevel : '-'}
                  </span>
                </div>
                <div>
                  <p className={`text-[10px] sm:text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                    Prêmio Atual
                  </p>
                  <p 
                    className="text-sm sm:text-base font-bold"
                    style={{
                      background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {gameState.currentPrizeLevel > 0 ? formatPrize(PRIZE_LEVELS[gameState.currentPrizeLevel - 1].prize) : 'R$ 0'}
                  </p>
                </div>
              </div>

              {/* Separador */}
              <div 
                className="w-px h-10 sm:h-12"
                style={{ background: isFatality ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)' }}
              />

              {/* Garantido */}
              <div className="text-center">
                <p className={`text-[10px] sm:text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                  Garantido
                </p>
                <p className="text-sm sm:text-base font-bold text-emerald-400">
                  {formatPrize(gameState.guaranteedPrize)}
                </p>
              </div>

              {/* Separador */}
              <div 
                className="w-px h-10 sm:h-12"
                style={{ background: isFatality ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)' }}
              />

              {/* Próximo Checkpoint - apenas em tablet */}
              <div className="hidden sm:block text-center">
                <p className={`text-[10px] sm:text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                  Próx. Checkpoint
                </p>
                <p className="text-sm sm:text-base font-bold text-amber-400">
                  {(() => {
                    const nextCheckpoint = PRIZE_LEVELS.find(p => p.checkpoint && p.level > gameState.currentPrizeLevel);
                    return nextCheckpoint ? formatPrize(nextCheckpoint.prize) : '🏆 1 MI';
                  })()}
                </p>
              </div>

              {/* Pergunta atual - apenas em tablet */}
              <div className="hidden md:block text-center">
                <p className={`text-[10px] sm:text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                  Pergunta
                </p>
                <p className={`text-sm sm:text-base font-bold ${isFatality ? 'text-red-100' : 'text-purple-100'}`}>
                  {gameState.currentQuestionIndex + 1}/{currentQuestion.totalQuestions}
                </p>
              </div>
            </div>
          </div>

          {/* Info da pergunta - estilo painel holográfico - RESPONSIVO (escondido em mobile, visível em desktop) */}
          <div 
            className="hidden lg:flex items-center justify-between mb-4 p-3 rounded-xl transition-all duration-500"
            style={{
              background: isFatality 
                ? 'linear-gradient(90deg, rgba(60,10,10,0.6) 0%, rgba(40,5,5,0.8) 50%, rgba(60,10,10,0.6) 100%)'
                : 'linear-gradient(90deg, rgba(30,10,60,0.6) 0%, rgba(20,5,40,0.8) 50%, rgba(30,10,60,0.6) 100%)',
              border: isFatality ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(168,85,247,0.3)',
            }}
          >
            <div className="text-center">
              <p className={`text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                {isFatality ? 'Fatality' : 'Pergunta'}
              </p>
              <p className={`text-xl font-bold ${isFatality ? 'text-red-100' : 'text-purple-100'}`}>
                {isFatality ? (
                  <span className="flex items-center gap-1">
                    💀 {gameState.fatalityCorrect + 1}
                  </span>
                ) : (
                  <>
                    {gameState.currentQuestionIndex + 1}
                    <span className="text-purple-400/50">/{currentQuestion.totalQuestions}</span>
                  </>
                )}
              </p>
            </div>
            
            {/* Prêmio atual / Multiplicador */}
            <div className="text-center">
              <p className={`text-xs uppercase tracking-wider ${isFatality ? 'text-red-400/60' : 'text-purple-400/60'}`}>
                {isFatality ? 'Multiplicador' : 'Valendo'}
              </p>
              {isFatality ? (
                <p 
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 20px rgba(251,191,36,0.3)',
                  }}
                >
                  {gameState.fatalityMultiplier}x
                </p>
              ) : (
                <p 
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 20px rgba(251,191,36,0.3)',
                  }}
                >
                  {formatPrize(currentPrizeLevel?.prize || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Pergunta */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              <motion.div
                variants={questionContainerVariants}
                initial="hidden"
                animate={animationPhase !== 'transitioning' && animationPhase !== 'idle' ? 'visible' : 'exit'}
                className="backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6 transition-all duration-500"
                style={{
                  background: isFatality 
                    ? 'linear-gradient(180deg, rgba(60,10,10,0.8) 0%, rgba(40,5,5,0.9) 100%)'
                    : 'linear-gradient(180deg, rgba(30,10,60,0.8) 0%, rgba(20,5,40,0.9) 100%)',
                  border: isFatality 
                    ? '2px solid rgba(239,68,68,0.5)'
                    : '2px solid rgba(168,85,247,0.4)',
                  boxShadow: isFatality 
                    ? '0 0 30px rgba(239,68,68,0.3), inset 0 0 40px rgba(127,29,29,0.3)'
                    : '0 0 30px rgba(168,85,247,0.2), inset 0 0 40px rgba(88,28,135,0.3)',
                }}
              >
                {/* Badges de Instituição e Ano - RESPONSIVO */}
                {(currentQuestion.institution || currentQuestion.year) && (
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                    {currentQuestion.institution && (
                      <span 
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium"
                        style={{
                          background: isFatality 
                            ? 'rgba(127,29,29,0.4)' 
                            : 'rgba(88,28,135,0.4)',
                          border: isFatality 
                            ? '1px solid rgba(239,68,68,0.3)' 
                            : '1px solid rgba(168,85,247,0.3)',
                          color: isFatality ? '#fca5a5' : '#c4b5fd',
                        }}
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                        <span className="hidden sm:inline">{currentQuestion.institution}</span>
                        <span className="sm:hidden">{currentQuestion.institution.length > 15 ? currentQuestion.institution.slice(0, 15) + '...' : currentQuestion.institution}</span>
                      </span>
                    )}
                    {currentQuestion.year && (
                      <span 
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium"
                        style={{
                          background: isFatality 
                            ? 'rgba(127,29,29,0.4)' 
                            : 'rgba(88,28,135,0.4)',
                          border: isFatality 
                            ? '1px solid rgba(239,68,68,0.3)' 
                            : '1px solid rgba(168,85,247,0.3)',
                          color: isFatality ? '#fca5a5' : '#c4b5fd',
                        }}
                      >
                        <span className="material-symbols-outlined text-xs sm:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                        {currentQuestion.year}
                      </span>
                    )}
                  </div>
                )}

                <motion.div
                  variants={questionTextVariants}
                  className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed transition-all duration-500 [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 sm:[&_img]:my-4"
                  style={{ 
                    color: isFatality ? '#fecaca' : '#e9d5ff', 
                    textShadow: isFatality ? '0 0 10px rgba(239,68,68,0.2)' : '0 0 10px rgba(168,85,247,0.2)' 
                  }}
                  dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
                />
              </motion.div>

              {/* Alternativas - RESPONSIVO */}
              <motion.div
                key={`options-${currentQuestion.id}`}
                variants={optionsContainerVariants}
                initial="hidden"
                animate={animationPhase !== 'transitioning' && animationPhase !== 'idle' && animationPhase !== 'question-entering' ? 'visible' : 'hidden'}
                className="grid gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6"
              >
                {currentQuestion.options.map((option, index) => (
                  <OptionButton
                    key={`${currentQuestion.id}-${option.id}`}
                    letter={String.fromCharCode(65 + index)}
                    text={option.text}
                    index={index}
                    isSelected={selectedOption === option.id}
                    isEliminated={eliminatedOptions.includes(option.id)}
                    isCorrect={answerResult?.isCorrect ?? null}
                    isRevealing={isRevealing}
                    correctIndex={getCorrectIndex()}
                    disabled={animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected'}
                    isFatality={isFatality}
                    onClick={() => handleSelectOption(option.id)}
                  />
                ))}
              </motion.div>

              {/* Botão de confirmar - estilo neon - RESPONSIVO */}
              <AnimatePresence>
                {selectedOption && !isRevealing && !waitingForNextQuestion && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    onClick={handleConfirmAnswer}
                    disabled={animationPhase === 'suspense' || animationPhase === 'revealing'}
                    className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all relative overflow-hidden"
                    style={{
                      background: animationPhase === 'suspense'
                        ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                        : isFatality 
                          ? 'linear-gradient(180deg, rgba(220,38,38,0.9) 0%, rgba(127,29,29,1) 100%)'
                          : 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)',
                      border: animationPhase === 'suspense' 
                        ? '2px solid #fbbf24' 
                        : isFatality ? '2px solid #ef4444' : '2px solid #a855f7',
                      color: animationPhase === 'suspense' ? '#78350f' : '#fff',
                      boxShadow: animationPhase === 'suspense' 
                        ? '0 0 20px rgba(251,191,36,0.5)' 
                        : isFatality 
                          ? '0 0 20px rgba(239,68,68,0.5)'
                          : '0 0 20px rgba(168,85,247,0.4)',
                    }}
                  >
                    {animationPhase !== 'suspense' && (
                      <motion.div
                        className="absolute inset-0"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        }}
                      />
                    )}
                    <span className="relative">
                      {animationPhase === 'suspense' ? 'Verificando...' : isFatality ? '💀 Confirmar' : 'Confirmar Resposta'}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Botões de próxima questão e comentário após acertar - RESPONSIVO */}
              <AnimatePresence>
                {waitingForNextQuestion && pendingNextQuestionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                  >
                    {/* Botão de comentário - só aparece se tiver comentário */}
                    {currentQuestion?.professorComment && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => setShowCommentModal(true)}
                        className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg transition-all relative overflow-hidden flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(180deg, rgba(6,182,212,0.8) 0%, rgba(8,145,178,1) 100%)',
                          border: '2px solid #06b6d4',
                          color: '#fff',
                          boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                        }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          }}
                        />
                        <span className="material-symbols-outlined relative text-lg sm:text-2xl">comment</span>
                        <span className="relative">Comentário</span>
                      </motion.button>
                    )}
                    
                    {/* Botão de próxima questão */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => {
                        setWaitingForNextQuestion(false);
                        handleNextQuestion(pendingNextQuestionResult);
                      }}
                      className={`${currentQuestion?.professorComment ? 'flex-1' : 'w-full'} py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg transition-all relative overflow-hidden flex items-center justify-center gap-2`}
                      style={{
                        background: 'linear-gradient(180deg, rgba(34,197,94,0.8) 0%, rgba(22,163,74,1) 100%)',
                        border: '2px solid #22c55e',
                        color: '#fff',
                        boxShadow: '0 0 20px rgba(34,197,94,0.4)',
                      }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        }}
                      />
                      <span className="relative">Próxima</span>
                      <span className="material-symbols-outlined relative text-lg sm:text-2xl">arrow_forward</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Ajudas - escondidas no modo Fatality - RESPONSIVO */}
          {!isFatality && (
            <div className="mt-auto pt-2 sm:pt-4">
              <HelpButtons
                cardsUsed={gameState.usedHelps.cards}
                universityUsed={gameState.usedHelps.university}
                skipsRemaining={gameState.usedHelps.skipsRemaining}
                medbraveUsed={gameState.usedHelps.medbrave}
                disabled={animationPhase !== 'waiting-answer' && animationPhase !== 'option-selected'}
                onUseCards={handleUseCards}
                onUseUniversity={handleUseUniversity}
                onUseSkip={handleSkip}
                onUseMedbrave={handleUseMedbrave}
              />
            </div>
          )}

          {/* Aviso no modo Fatality - RESPONSIVO */}
          {isFatality && (
            <div className="mt-auto pt-2 sm:pt-4">
              <div 
                className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(127,29,29,0.3) 0%, rgba(69,10,10,0.4) 100%)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <p className="text-red-400/80 text-xs sm:text-sm">
                  ⚠️ Modo Fatality: Sem ajudas disponíveis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de prêmios (desktop) - escondida no Fatality e em mobile/tablet */}
        <div className={`hidden lg:block w-64 xl:w-72 p-3 xl:p-4 pt-[140px] ${isFatality ? 'opacity-30 pt-[180px]' : ''}`}>
          <PrizeBar
            currentLevel={gameState.currentPrizeLevel}
            guaranteedPrize={gameState.guaranteedPrize}
          />
        </div>
      </div>

      {/* Painéis de ajuda */}
      <AnimatePresence>
        {showUniversityPanel && universityAnswers && (
          <UniversityPanel
            answers={universityAnswers.map(a => ({
              id: a.studentId,
              name: a.studentName,
              avatar: ['👩‍🎓', '👨‍🎓', '👩‍⚕️'][a.studentId - 1] || '👨‍🎓',
              selectedOption: a.selectedOptionIndex,
              confidence: a.confidence,
            }))}
            onClose={() => setShowUniversityPanel(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCardsPanel && currentQuestion && (
          <CardsPanel
            onEliminate={handleCardsEliminate}
            onClose={() => setShowCardsPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal de confirmação para parar - estilo holográfico */}
      <AnimatePresence>
        {showStopConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: 'linear-gradient(180deg, rgba(30,10,60,0.95) 0%, rgba(20,5,40,0.98) 100%)',
                border: '2px solid rgba(168,85,247,0.5)',
                boxShadow: '0 0 40px rgba(168,85,247,0.3)',
              }}
            >
              <h3 
                className="text-xl font-bold mb-2"
                style={{ color: '#e9d5ff', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}
              >
                Parar o jogo?
              </h3>
              <p className="text-purple-300/80 mb-4">
                Você vai levar{' '}
                <span 
                  className="font-bold"
                  style={{
                    background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatPrize(gameState.currentPrize)}
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    background: 'rgba(30,10,60,0.5)',
                    border: '2px solid rgba(168,85,247,0.3)',
                    color: '#c4b5fd',
                  }}
                >
                  Continuar
                </button>
                <button
                  onClick={confirmStop}
                  className="flex-1 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                    border: '2px solid #fbbf24',
                    color: '#78350f',
                    boxShadow: '0 0 15px rgba(251,191,36,0.4)',
                  }}
                >
                  Parar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de resultado */}
      <ResultModal
        isOpen={gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'stopped'}
        status={gameState.status as 'won' | 'lost' | 'stopped'}
        finalPrize={gameState.currentPrize}
        guaranteedPrize={gameState.guaranteedPrize}
        totalCorrect={gameState.totalCorrect}
        totalQuestions={gameState.currentQuestionIndex + (gameState.status === 'lost' ? 1 : 0)}
        onExit={onExit}
        onFatality={handleStartFatality}
        fatalityMode={gameState.fatalityMode}
        fatalityMultiplier={gameState.fatalityMultiplier}
        fatalityCorrect={gameState.fatalityCorrect}
      />

      {/* Modal de comentário do professor */}
      <CommentModal
        isOpen={showCommentModal}
        comment={currentQuestion?.professorComment || ''}
        onClose={() => {
          setShowCommentModal(false);
          setIsMedbraveMode(false);
        }}
        onNext={pendingNextQuestionResult && !isMedbraveMode ? () => {
          setShowCommentModal(false);
          setWaitingForNextQuestion(false);
          setIsSkipMode(false);
          handleNextQuestion(pendingNextQuestionResult);
        } : undefined}
        hideCloseButton={isSkipMode}
        showNextButton={!isMedbraveMode}
      />

      {/* Botão flutuante de som - mais chamativo em mobile quando mutado */}
      <AnimatePresence>
        {sounds.isMuted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              sounds.toggleMute();
              // Tocar som da pergunta atual após ativar
              if (currentQuestion) {
                const currentPrize = PRIZE_LEVELS[gameState.currentPrizeLevel]?.prize || 1000;
                setTimeout(() => sounds.playQuestionPrize(currentPrize), 100);
              }
            }}
            className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold shadow-lg md:hidden"
            style={{
              background: isFatality 
                ? 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
              border: isFatality ? '3px solid #fca5a5' : '3px solid #fef3c7',
              boxShadow: isFatality 
                ? '0 0 30px rgba(239,68,68,0.6), 0 4px 20px rgba(0,0,0,0.3)'
                : '0 0 30px rgba(251,191,36,0.6), 0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <motion.span 
              className="material-symbols-outlined text-2xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              volume_up
            </motion.span>
            <span className={isFatality ? 'text-white' : 'text-amber-900'}>Ativar Som</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
