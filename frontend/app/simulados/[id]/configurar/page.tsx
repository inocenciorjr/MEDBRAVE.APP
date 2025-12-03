'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { simulatedExamService, SimulatedExam } from '@/services/simulatedExamService';
import { useToast } from '@/lib/contexts/ToastContext';
import { SimuladoConfigurarSkeleton } from '@/components/skeletons/SimuladoConfigurarSkeleton';

interface ConfigurarSimuladoPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Componente de Countdown Animado
function AnimatedCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [prevTimeLeft, setPrevTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    const timer = setInterval(() => {
      setPrevTimeLeft(timeLeft);
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [targetDate]);

  const FlipDigit = ({ value, prevValue, label }: { value: number; prevValue: number; label: string }) => {
    const hasChanged = value !== prevValue;
    const displayValue = value.toString().padStart(2, '0');

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="relative w-16 h-20 sm:w-20 sm:h-24 perspective-1000">
            {/* Fundo do placar - roxo/violeta */}
            <div className="absolute inset-0 bg-gradient-to-b from-violet-900 to-violet-950 
                          rounded-xl shadow-2xl shadow-primary/20" />
            
            {/* Linha central decorativa */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-violet-700/50 z-10" />
            
            {/* Número */}
            <div className={`absolute inset-0 flex items-center justify-center
                          text-3xl sm:text-4xl font-bold text-white font-mono
                          ${hasChanged ? 'animate-flip-down' : ''}`}>
              {displayValue}
            </div>

            {/* Reflexo superior */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl" />
          </div>

          {/* Sombra projetada */}
          <div className="absolute -bottom-2 left-2 right-2 h-3 bg-primary/20 blur-md rounded-full" />
        </div>
        
        {/* Label */}
        <span className="mt-3 text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <FlipDigit value={timeLeft.days} prevValue={prevTimeLeft.days} label="Dias" />
      <div className="text-2xl sm:text-3xl font-bold text-primary/60">:</div>
      <FlipDigit value={timeLeft.hours} prevValue={prevTimeLeft.hours} label="Horas" />
      <div className="text-2xl sm:text-3xl font-bold text-primary/60">:</div>
      <FlipDigit value={timeLeft.minutes} prevValue={prevTimeLeft.minutes} label="Min" />
      <div className="text-2xl sm:text-3xl font-bold text-primary/60">:</div>
      <FlipDigit value={timeLeft.seconds} prevValue={prevTimeLeft.seconds} label="Seg" />
    </div>
  );
}

export default function ConfigurarSimuladoPage({ params }: ConfigurarSimuladoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [simulado, setSimulado] = useState<SimulatedExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  
  // Estados para configuração de tempo
  const [timeMode, setTimeMode] = useState<'total' | 'perQuestion'>('total');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(3);

  // Dados extras do simulado (mentor, available_at, etc)
  const isMentorSimulado = (simulado as any)?.assigned_by_mentor === true;
  const creatorName = (simulado as any)?.creator_name || 'Mentor';
  const availableAt = (simulado as any)?.available_at;
  const hasTimeLimit = simulado?.time_limit_minutes && simulado.time_limit_minutes > 0;

  // Verificar se o simulado está disponível
  const isAvailable = useMemo(() => {
    if (!availableAt) return true;
    return new Date(availableAt) <= new Date();
  }, [availableAt]);

  // Data de liberação
  const availableDate = useMemo(() => {
    if (!availableAt) return null;
    return new Date(availableAt);
  }, [availableAt]);

  useEffect(() => {
    loadSimulado();
  }, [id]);

  const loadSimulado = async () => {
    try {
      setLoading(true);
      const data = await simulatedExamService.getSimulatedExamById(id);
      setSimulado(data);
      
      // Se não tem tempo limite definido, configurar padrão de 3 min/questão
      if (!data.time_limit_minutes || data.time_limit_minutes === 0) {
        const defaultMinutes = data.question_count * 3;
        const h = Math.floor(defaultMinutes / 60);
        const m = defaultMinutes % 60;
        setHours(Math.min(h, 10)); // Máximo 10 horas
        setMinutes(m);
        setMinutesPerQuestion(3);
      }
    } catch (error: any) {
      console.error('Erro ao carregar simulado:', error);
      toast.error('Erro ao carregar simulado');
      router.push('/lista-questoes/minhas-listas');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulado = async () => {
    if (!isAvailable) {
      toast.error('Este simulado ainda não está disponível');
      return;
    }

    // Validar tempo
    const totalMinutes = calculateTotalMinutes();
    if (!hasTimeLimit && totalMinutes <= 0) {
      toast.error('Defina um tempo válido para o simulado');
      return;
    }
    if (!hasTimeLimit && totalMinutes > 600) {
      toast.error('Tempo máximo permitido: 10 horas');
      return;
    }

    try {
      setStarting(true);
      // Passar tempo customizado se o simulado não tem tempo definido
      const customTime = !hasTimeLimit ? totalMinutes : undefined;
      const result = await simulatedExamService.startSimulatedExam(id, customTime);
      const resultId = result.id || result.resultId;

      if (!resultId) {
        throw new Error('ID do resultado não retornado pelo backend');
      }

      router.push(`/simulados/${id}/resolver?resultId=${resultId}`);
    } catch (error: any) {
      console.error('Erro ao iniciar simulado:', error);
      toast.error(error.message || 'Erro ao iniciar simulado');
      setStarting(false);
    }
  };

  // Calcular tempo total baseado no modo
  const calculateTotalMinutes = () => {
    if (timeMode === 'total') {
      return (hours * 60) + minutes;
    } else {
      return minutesPerQuestion * (simulado?.question_count || 1);
    }
  };

  // Tempo efetivo (definido pelo mentor ou pelo usuário)
  const effectiveTimeLimit = hasTimeLimit ? simulado!.time_limit_minutes : calculateTotalMinutes();

  // Funções para ajustar tempo
  const adjustHours = (delta: number) => {
    const newHours = Math.max(0, Math.min(10, hours + delta));
    setHours(newHours);
  };

  const adjustMinutes = (delta: number) => {
    let newMinutes = minutes + delta;
    if (newMinutes < 0) {
      if (hours > 0) {
        setHours(hours - 1);
        newMinutes = 45;
      } else {
        newMinutes = 0;
      }
    } else if (newMinutes >= 60) {
      if (hours < 10) {
        setHours(hours + 1);
        newMinutes = 0;
      } else {
        newMinutes = 45;
      }
    }
    setMinutes(newMinutes);
  };

  const adjustMinutesPerQuestion = (delta: number) => {
    const newValue = Math.max(0.5, Math.min(10, minutesPerQuestion + delta));
    setMinutesPerQuestion(newValue);
  };

  if (loading) {
    return <SimuladoConfigurarSkeleton />;
  }

  if (!simulado) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Minhas Listas', icon: 'list_alt', href: '/lista-questoes/minhas-listas' },
          { label: simulado.title, icon: 'quiz' }
        ]}
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
          {simulado.title}
        </h1>
        
        {simulado.description && (
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            {simulado.description}
          </p>
        )}
      </div>

      {/* Countdown para simulados agendados */}
      {!isAvailable && availableDate && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 sm:p-8 mb-6
                      border border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <span className="material-symbols-outlined text-primary animate-pulse">schedule</span>
              <span className="text-sm font-semibold text-primary">Simulado Agendado</span>
            </div>
            <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Este simulado será liberado em:
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {availableDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <AnimatedCountdown targetDate={availableDate} />
        </div>
      )}

      {/* Card de Informações */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl 
                    border border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl overflow-hidden">
        <div className="p-5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary 
                       flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Informações do Simulado
          </h2>
          
          {/* Badge do Mentor */}
          {isMentorSimulado && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 
                          rounded-xl border border-primary/20">
              <span className="material-symbols-outlined text-primary">school</span>
              <span className="text-text-light-primary dark:text-text-dark-primary">
                Criado por: <span className="font-semibold text-primary">{creatorName}</span>
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Questões */}
            <div className="flex items-center gap-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl
                          border border-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 
                            flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white">quiz</span>
              </div>
              <div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  Questões
                </p>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {simulado.question_count}
                </p>
              </div>
            </div>

            {/* Tempo */}
            <div className="flex items-center gap-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl
                          border border-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 
                            flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white">schedule</span>
              </div>
              <div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  Tempo Limite
                </p>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {effectiveTimeLimit && effectiveTimeLimit > 0
                    ? `${Math.floor(effectiveTimeLimit / 60)}h ${effectiveTimeLimit % 60 > 0 ? `${effectiveTimeLimit % 60}min` : ''}`
                    : 'Sem limite'}
                </p>
              </div>
            </div>

            {/* Tempo por questão */}
            <div className="flex items-center gap-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl
                          border border-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 
                            flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white">speed</span>
              </div>
              <div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  Por Questão
                </p>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {effectiveTimeLimit && effectiveTimeLimit > 0
                    ? `${(effectiveTimeLimit / simulado.question_count).toFixed(1)} min`
                    : 'Livre'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Configurar Tempo (quando não tem tempo definido) */}
      {!hasTimeLimit && isAvailable && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl 
                      border border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl overflow-hidden">
          <div className="p-5 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary 
                         flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">timer</span>
              Configurar Tempo
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Defina o tempo limite do simulado (máximo 10 horas)
            </p>
          </div>

          <div className="p-5 space-y-6">
            {/* Tabs de modo */}
            <div className="flex bg-background-light dark:bg-background-dark rounded-xl p-1">
              <button
                onClick={() => setTimeMode('total')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${timeMode === 'total'
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                          }`}
              >
                Tempo Total
              </button>
              <button
                onClick={() => setTimeMode('perQuestion')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${timeMode === 'perQuestion'
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                          }`}
              >
                Por Questão
              </button>
            </div>

            {/* Configuração por Tempo Total */}
            {timeMode === 'total' && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Horas */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">
                    Horas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustHours(-1)}
                      disabled={hours <= 0}
                      className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 
                               text-primary disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <div className="w-20 h-16 rounded-xl bg-gradient-to-b from-violet-900 to-violet-950 
                                  flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white font-mono">
                        {hours.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={() => adjustHours(1)}
                      disabled={hours >= 10}
                      className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 
                               text-primary disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                <span className="text-3xl font-bold text-primary/60">:</span>

                {/* Minutos */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">
                    Minutos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustMinutes(-15)}
                      disabled={hours === 0 && minutes === 0}
                      className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 
                               text-primary disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <div className="w-20 h-16 rounded-xl bg-gradient-to-b from-violet-900 to-violet-950 
                                  flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white font-mono">
                        {minutes.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={() => adjustMinutes(15)}
                      disabled={hours >= 10 && minutes >= 45}
                      className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 
                               text-primary disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Configuração por Questão */}
            {timeMode === 'perQuestion' && (
              <div className="flex flex-col items-center">
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">
                  Minutos por questão
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustMinutesPerQuestion(-0.5)}
                    disabled={minutesPerQuestion <= 0.5}
                    className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 
                             text-primary disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <div className="w-24 h-16 rounded-xl bg-gradient-to-b from-violet-900 to-violet-950 
                                flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white font-mono">
                      {minutesPerQuestion.toFixed(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => adjustMinutesPerQuestion(0.5)}
                    disabled={minutesPerQuestion >= 10}
                    className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 
                             text-primary disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>

                {/* Atalhos rápidos */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[1, 1.5, 2, 2.5, 3, 4, 5].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setMinutesPerQuestion(mins)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${minutesPerQuestion === mins
                                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10 hover:text-primary border border-border-light dark:border-border-dark'
                                }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo */}
            <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  Tempo total:
                </span>
              </div>
              <span className="text-lg font-bold text-primary">
                {Math.floor(calculateTotalMinutes() / 60)}h {calculateTotalMinutes() % 60}min
              </span>
            </div>

            {/* Aviso de tempo máximo */}
            {calculateTotalMinutes() > 600 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <span className="material-symbols-outlined text-red-500">warning</span>
                <span className="text-sm text-red-600 dark:text-red-400">
                  Tempo máximo permitido: 10 horas
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl 
                    border border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl overflow-hidden">
        <div className="p-5 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary 
                       flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Instruções Importantes
          </h2>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: 'visibility_off', title: 'Modo Foco', description: 'Durante o simulado, a navegação lateral será ocultada.' },
              { icon: 'lock', title: 'Sem Gabarito', description: 'Você só verá as respostas após finalizar.' },
              { icon: 'timer', title: 'Cronômetro Ativo', description: 'O tempo começa imediatamente e não pode ser pausado.' },
              { icon: 'block', title: 'Única Tentativa', description: 'Este simulado só pode ser realizado uma vez.' }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-background-light dark:bg-background-dark 
                                        rounded-xl border border-border-light dark:border-border-dark
                                        hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/10 
                              flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary text-sm">
                    {item.title}
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => router.push('/lista-questoes/minhas-listas')}
          disabled={starting}
          className="flex-1 px-6 py-4 bg-background-light dark:bg-background-dark
                   border border-border-light dark:border-border-dark rounded-xl 
                   font-semibold text-text-light-primary dark:text-text-dark-primary 
                   hover:border-primary/30 hover:bg-surface-light dark:hover:bg-surface-dark
                   transition-all duration-300 disabled:opacity-50
                   flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        
        <button
          onClick={handleStartSimulado}
          disabled={starting || !isAvailable}
          className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300
                    flex items-center justify-center gap-3
                    ${isAvailable
                      ? 'bg-gradient-to-r from-primary to-violet-600 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          {starting ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Iniciando...
            </>
          ) : !isAvailable ? (
            <>
              <span className="material-symbols-outlined">lock</span>
              Aguardando Liberação
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-2xl">play_circle</span>
              Iniciar Simulado
            </>
          )}
        </button>
      </div>

      {/* Aviso Final */}
      {isAvailable && (
        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-xl flex-shrink-0 mt-0.5">
              info
            </span>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <strong className="text-text-light-primary dark:text-text-dark-primary">Atenção:</strong> Ao clicar em "Iniciar Simulado", o cronômetro começará imediatamente.
              Certifique-se de estar em um ambiente tranquilo e sem interrupções.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
