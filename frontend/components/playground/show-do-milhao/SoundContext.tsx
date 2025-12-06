'use client';

import { createContext, useContext, useRef, useCallback, useEffect, useState, ReactNode } from 'react';

const SOUNDS_PATH = '/sounds/show-do-milhao';
const MUTE_STORAGE_KEY = 'show-do-milhao-muted';
const AUDIO_UNLOCKED_KEY = 'show-do-milhao-audio-unlocked';

const PRIZE_AUDIO_MAP: Record<number, string> = {
  1000: 'pergunta_mil_reais',
  2000: 'pergunta_dois_mil_reais',
  3000: 'pergunta_tres_mil_reais',
  4000: 'pergunta_quatro_mil_reais',
  5000: 'pergunta_cinco_mil_reais',
  10000: 'pergunta_dez_mil_reais',
  20000: 'pergunta_vinte_mil_reais',
  30000: 'pergunta_trinta_mil_reais',
  40000: 'pergunta_quarenta_mil_reais',
  50000: 'pergunta_cinquenta_mil_reais',
  100000: 'pergunta_cem_mil_reais',
  200000: 'pergunta_duzentos_mil_reais',
  300000: 'pergunta_trezentos_mil_reais',
  400000: 'pergunta_quatrocentos_mil_reais',
  500000: 'pergunta_quinhentos_mil_reais',
  1000000: 'pergunta_um_milhao_reais',
};

function findClosestPrizeAudio(prize: number): string {
  const prizes = Object.keys(PRIZE_AUDIO_MAP).map(Number).sort((a, b) => a - b);
  let closest = prizes[0];
  for (const p of prizes) {
    if (p <= prize) closest = p;
    else break;
  }
  return PRIZE_AUDIO_MAP[closest] || 'pergunta_mil_reais';
}

interface SoundContextType {
  isMuted: boolean;
  isAudioUnlocked: boolean;
  isInitialized: boolean;
  toggleMute: () => void;
  unlockAudio: () => Promise<boolean>;
  playGameStart: (loop?: boolean) => HTMLAudioElement | null;
  playQuestionPrize: (prizeValue: number, onEnded?: () => void) => HTMLAudioElement | null;
  playSuspense: (onEnded?: () => void) => HTMLAudioElement | null;
  playCorrectAnswer: (onEnded?: () => void) => HTMLAudioElement | null;
  playWrongAnswer: (onEnded?: () => void) => HTMLAudioElement | null;
  playTimeUp: (onEnded?: () => void) => HTMLAudioElement | null;
  playCards: (onEnded?: () => void) => HTMLAudioElement | null;
  playUniversity: (onEnded?: () => void) => HTMLAudioElement | null;
  playSkip: (onEnded?: () => void) => HTMLAudioElement | null;
  playVictory: (onEnded?: () => void) => HTMLAudioElement | null;
  playGoodbye: (onEnded?: () => void) => HTMLAudioElement | null;
  playFatality: (onEnded?: () => void) => HTMLAudioElement | null;
  stopCurrentAudio: () => void;
  playSound: (soundName: string, onEnded?: () => void) => HTMLAudioElement | null;
}

const SoundContext = createContext<SoundContextType | null>(null);

// Função para obter estado inicial de mute (executada no cliente)
function getInitialMuteState(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(MUTE_STORAGE_KEY);
  // Se já foi definido pelo usuário, respeitar
  if (stored !== null) return stored === 'true';
  // Se nunca foi definido, verificar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  return isMobile; // Mobile começa mutado, desktop não
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false); // Será atualizado no useEffect
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMutedRef = useRef(false); // Ref para acesso síncrono
  const isAudioUnlockedRef = useRef(false);
  const pendingPlayRef = useRef<{ soundName: string; loop: boolean; onEnded?: () => void } | null>(null);

  // Carregar preferência de mute do localStorage
  // Em mobile, começar mutado por padrão (a menos que usuário já tenha ativado antes)
  useEffect(() => {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    let muted: boolean;
    // Se já foi definido pelo usuário, respeitar a escolha
    if (stored !== null) {
      muted = stored === 'true';
    } else if (isMobile) {
      // Se nunca foi definido e é mobile, começar mutado
      muted = true;
      localStorage.setItem(MUTE_STORAGE_KEY, 'true');
    } else {
      // Desktop sem preferência salva: som ativado
      muted = false;
    }
    
    setIsMuted(muted);
    isMutedRef.current = muted;
    setIsInitialized(true);
    
    // Verificar se áudio já foi desbloqueado nesta sessão
    const unlocked = sessionStorage.getItem(AUDIO_UNLOCKED_KEY) === 'true';
    setIsAudioUnlocked(unlocked);
    isAudioUnlockedRef.current = unlocked;
  }, []);

  // Pré-carregar áudios
  useEffect(() => {
    const preloadSounds = [
      'game_start', 'suspense', 'certa_resposta', 'que_pena_voce_errou',
      'seu_tempo_acabou_responda_agora', 'cards', 'opiniao_universitarios',
      'skip', 'parabens_ganhou_um_milhao_reais', 'tchau_ate_a_proxima', 'fatality',
      ...Object.values(PRIZE_AUDIO_MAP),
    ];

    preloadSounds.forEach(sound => {
      const audio = new Audio(`${SOUNDS_PATH}/${sound}.mp3`);
      audio.preload = 'auto';
      audioRefs.current.set(sound, audio);
    });

    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Função para desbloquear áudio (deve ser chamada em resposta a interação do usuário)
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    if (isAudioUnlockedRef.current) return true;
    
    try {
      // Criar um áudio silencioso e tentar tocar para desbloquear
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.volume = 0.01;
      
      await silentAudio.play();
      silentAudio.pause();
      
      console.log('🔓 Áudio desbloqueado com sucesso!');
      setIsAudioUnlocked(true);
      isAudioUnlockedRef.current = true;
      sessionStorage.setItem(AUDIO_UNLOCKED_KEY, 'true');
      
      // Se tinha um som pendente, tocar agora
      if (pendingPlayRef.current && !isMutedRef.current) {
        const { soundName, loop, onEnded } = pendingPlayRef.current;
        pendingPlayRef.current = null;
        setTimeout(() => {
          const audio = playSound(soundName, onEnded);
          if (audio && loop) audio.loop = true;
        }, 100);
      }
      
      return true;
    } catch (err) {
      console.warn('❌ Falha ao desbloquear áudio:', err);
      return false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      isMutedRef.current = newValue;
      localStorage.setItem(MUTE_STORAGE_KEY, String(newValue));
      
      // Se mutando, pausar áudio atual
      if (newValue && currentAudio.current) {
        currentAudio.current.pause();
      }
      // Se desmutando e tem áudio pausado, resumir
      else if (!newValue && currentAudio.current && currentAudio.current.paused) {
        // Tentar desbloquear e tocar
        unlockAudio().then(unlocked => {
          if (unlocked && currentAudio.current) {
            currentAudio.current.play().catch(() => {});
          }
        });
      }
      
      return newValue;
    });
  }, [unlockAudio]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
  }, []);

  const playSound = useCallback((soundName: string, onEnded?: () => void) => {
    console.log(`🎵 playSound chamado: ${soundName}, muted: ${isMutedRef.current}, unlocked: ${isAudioUnlockedRef.current}`);
    
    // Usar ref para valor síncrono
    if (isMutedRef.current) {
      console.log('🔇 Som está mutado, pulando...');
      if (onEnded) setTimeout(onEnded, 100);
      return null;
    }

    // Parar áudio atual sem resetar (para evitar cortar o início do próximo)
    if (currentAudio.current && currentAudio.current !== audioRefs.current.get(soundName)) {
      console.log('⏹️ Parando áudio atual...');
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }

    let audio = audioRefs.current.get(soundName);
    if (!audio) {
      console.log(`📥 Criando novo áudio: ${soundName}`);
      audio = new Audio(`${SOUNDS_PATH}/${soundName}.mp3`);
      audio.preload = 'auto';
      audioRefs.current.set(soundName, audio);
    }

    // Configurar callbacks antes de tocar
    if (onEnded) audio.onended = onEnded;
    else audio.onended = null;
    audio.loop = false;

    currentAudio.current = audio;

    // Função para tocar o áudio
    const playAudio = () => {
      console.log(`▶️ Tocando: ${soundName}, readyState: ${audio!.readyState}`);
      audio!.currentTime = 0;
      audio!.play().then(() => {
        console.log(`✅ Áudio iniciado: ${soundName}`);
        // Marcar como desbloqueado se conseguiu tocar
        if (!isAudioUnlockedRef.current) {
          setIsAudioUnlocked(true);
          isAudioUnlockedRef.current = true;
          sessionStorage.setItem(AUDIO_UNLOCKED_KEY, 'true');
        }
      }).catch(err => {
        console.warn('❌ Erro ao tocar áudio:', err);
        // Se falhar por política de autoplay, não chamar onEnded para permitir retry
        if (err.name === 'NotAllowedError') {
          console.log('🔒 Áudio bloqueado pelo navegador - aguardando interação do usuário');
          // Não chamar onEnded aqui para não travar o jogo
          return;
        }
        // Se falhar por outro motivo, chamar onEnded para não travar o jogo
        if (onEnded) setTimeout(onEnded, 100);
      });
    };

    // Verificar se o áudio está pronto para tocar
    if (audio.readyState >= 2) {
      // Áudio já carregado, tocar imediatamente
      playAudio();
    } else {
      // Aguardar carregamento antes de tocar
      const handleCanPlay = () => {
        audio!.removeEventListener('canplaythrough', handleCanPlay);
        playAudio();
      };
      audio.addEventListener('canplaythrough', handleCanPlay);
      audio.load();
      
      // Timeout de segurança caso o áudio não carregue
      setTimeout(() => {
        if (audio!.readyState < 2) {
          audio!.removeEventListener('canplaythrough', handleCanPlay);
          console.warn('Áudio não carregou a tempo, chamando callback');
          if (onEnded) onEnded();
        }
      }, 3000);
    }

    return audio;
  }, []);

  const playGameStart = useCallback((loop: boolean = false) => {
    // Se áudio não está desbloqueado, guardar para tocar depois
    if (!isAudioUnlockedRef.current && !isMutedRef.current) {
      console.log('🔒 Áudio não desbloqueado, guardando para tocar depois...');
      pendingPlayRef.current = { soundName: 'game_start', loop, onEnded: undefined };
    }
    const audio = playSound('game_start');
    if (audio && loop) audio.loop = true;
    return audio;
  }, [playSound]);

  const playQuestionPrize = useCallback((prizeValue: number, onEnded?: () => void) => {
    return playSound(findClosestPrizeAudio(prizeValue), onEnded);
  }, [playSound]);

  const playSuspense = useCallback((onEnded?: () => void) => playSound('suspense', onEnded), [playSound]);
  const playCorrectAnswer = useCallback((onEnded?: () => void) => playSound('certa_resposta', onEnded), [playSound]);
  const playWrongAnswer = useCallback((onEnded?: () => void) => playSound('que_pena_voce_errou', onEnded), [playSound]);
  const playTimeUp = useCallback((onEnded?: () => void) => playSound('seu_tempo_acabou_responda_agora', onEnded), [playSound]);
  const playCards = useCallback((onEnded?: () => void) => playSound('cards', onEnded), [playSound]);
  const playUniversity = useCallback((onEnded?: () => void) => playSound('opiniao_universitarios', onEnded), [playSound]);
  const playSkip = useCallback((onEnded?: () => void) => playSound('skip', onEnded), [playSound]);
  const playVictory = useCallback((onEnded?: () => void) => playSound('parabens_ganhou_um_milhao_reais', onEnded), [playSound]);
  const playGoodbye = useCallback((onEnded?: () => void) => playSound('tchau_ate_a_proxima', onEnded), [playSound]);
  const playFatality = useCallback((onEnded?: () => void) => playSound('fatality', onEnded), [playSound]);

  return (
    <SoundContext.Provider value={{
      isMuted,
      isAudioUnlocked,
      isInitialized,
      toggleMute,
      unlockAudio,
      playGameStart,
      playQuestionPrize,
      playSuspense,
      playCorrectAnswer,
      playWrongAnswer,
      playTimeUp,
      playCards,
      playUniversity,
      playSkip,
      playVictory,
      playGoodbye,
      playFatality,
      stopCurrentAudio,
      playSound,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useGameSounds() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useGameSounds must be used within a SoundProvider');
  }
  return context;
}
