'use client';

import { createContext, useContext, useRef, useCallback, useEffect, useState, ReactNode } from 'react';

const SOUNDS_PATH = '/sounds/show-do-milhao';
const MUTE_STORAGE_KEY = 'show-do-milhao-muted';

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
  toggleMute: () => void;
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

export function SoundProvider({ children }: { children: ReactNode }) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false); // Ref para acesso síncrono

  // Carregar preferência de mute do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY);
    const muted = stored === 'true';
    setIsMuted(muted);
    isMutedRef.current = muted;
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
        currentAudio.current.play().catch(() => {});
      }
      
      return newValue;
    });
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
  }, []);

  const playSound = useCallback((soundName: string, onEnded?: () => void) => {
    console.log(`🎵 playSound chamado: ${soundName}, muted: ${isMutedRef.current}`);
    
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
      }).catch(err => {
        console.warn('❌ Erro ao tocar áudio:', err);
        // Se falhar ao tocar, chamar onEnded mesmo assim para não travar o jogo
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
      toggleMute,
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
