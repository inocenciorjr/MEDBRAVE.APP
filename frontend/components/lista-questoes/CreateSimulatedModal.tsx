'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { simulatedExamService } from '@/services/simulatedExamService';
import { useToast } from '@/lib/contexts/ToastContext';

interface CreateSimulatedModalProps {
  listId: string;
  listName: string;
  questionCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSimulatedModal({ 
  listId, 
  listName, 
  questionCount, 
  isOpen, 
  onClose 
}: CreateSimulatedModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Configurações do simulado
  const [simulatedName, setSimulatedName] = useState(`Simulado: ${listName}`);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(2);
  const [timeMode, setTimeMode] = useState<'total' | 'perQuestion'>('total'); // modo de configuração
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCreateSimulated = async () => {
    try {
      setLoading(true);
      
      // Calcular tempo total em minutos
      const totalMinutes = timeMode === 'total' 
        ? (hours * 60) + minutes 
        : minutesPerQuestion * questionCount;
      
      if (totalMinutes <= 0) {
        toast.warning('Configure um tempo válido para o simulado');
        setLoading(false);
        return;
      }

      if (!simulatedName.trim()) {
        toast.warning('Digite um nome para o simulado');
        setLoading(false);
        return;
      }
      
      // Criar simulado diretamente com o service (que já busca a lista internamente)
      console.log('[CreateSimulated] Criando simulado com:', {
        listId,
        totalMinutes,
        simulatedName,
        randomizeQuestions
      });
      
      const simulatedExam = await simulatedExamService.createFromList(
        listId, 
        totalMinutes,
        simulatedName,
        randomizeQuestions
      );
      
      console.log('[CreateSimulated] Simulado criado:', simulatedExam);
      
      toast.success('Simulado criado com sucesso!');
      
      // Redirecionar para a página de configuração/início do simulado
      router.push(`/simulados/${simulatedExam.id}/configurar`);
      
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar simulado:', error);
      toast.error(error.message || 'Erro ao criar simulado');
    } finally {
      setLoading(false);
    }
  };

  const getTotalMinutes = () => {
    return timeMode === 'total' 
      ? (hours * 60) + minutes 
      : minutesPerQuestion * questionCount;
  };

  const getAverageTimePerQuestion = () => {
    const total = getTotalMinutes();
    return (total / questionCount).toFixed(1);
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-50 transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                Criar Simulado
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Configure seu simulado cronometrado
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Nome do Simulado */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                  Nome do Simulado
                </span>
                <input
                  type="text"
                  value={simulatedName}
                  onChange={(e) => setSimulatedName(e.target.value)}
                  placeholder="Digite o nome do simulado"
                  className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200 transition-all"
                />
              </label>
            </div>

            {/* Info da Lista */}
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">description</span>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Lista Original: {listName}
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {questionCount} questões
                  </p>
                </div>
              </div>
            </div>

            {/* Modo de Configuração de Tempo */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Configuração de Tempo
              </h3>

              {/* Tabs de Modo */}
              <div className="flex gap-2 p-1 bg-background-light dark:bg-background-dark rounded-lg">
                <button
                  onClick={() => setTimeMode('total')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeMode === 'total'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  Tempo Total
                </button>
                <button
                  onClick={() => setTimeMode('perQuestion')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeMode === 'perQuestion'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  Por Questão
                </button>
              </div>

              {/* Configuração de Tempo Total */}
              {timeMode === 'total' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                        Horas
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHours(Math.max(0, hours - 1))}
                          disabled={hours <= 0}
                          className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">remove</span>
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={hours}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setHours(Math.max(0, Math.min(10, val)));
                          }}
                          className="flex-1 px-4 py-2.5 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200 font-medium transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setHours(Math.min(10, hours + 1))}
                          disabled={hours >= 10}
                          className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">add</span>
                        </button>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                        Minutos
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMinutes(Math.max(0, minutes - 1))}
                          disabled={minutes <= 0}
                          className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">remove</span>
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={minutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setMinutes(Math.max(0, Math.min(59, val)));
                          }}
                          className="flex-1 px-4 py-2.5 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200 font-medium transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setMinutes(Math.min(59, minutes + 1))}
                          disabled={minutes >= 59}
                          className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">add</span>
                        </button>
                      </div>
                    </label>
                  </div>

                  {/* Sugestões de tempo */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { h: 0, m: 30, label: '30 min' },
                      { h: 1, m: 0, label: '1h' },
                      { h: 1, m: 30, label: '1h 30min' },
                      { h: 2, m: 0, label: '2h' },
                      { h: 3, m: 0, label: '3h' },
                    ].map((time) => (
                      <button
                        key={time.label}
                        onClick={() => {
                          setHours(time.h);
                          setMinutes(time.m);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          hours === time.h && minutes === time.m
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10'
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuração por Questão */}
              {timeMode === 'perQuestion' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 block">
                      Minutos por Questão
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMinutesPerQuestion(Math.max(0.5, minutesPerQuestion - 0.5))}
                        disabled={minutesPerQuestion <= 0.5}
                        className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">remove</span>
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={minutesPerQuestion}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.5;
                          setMinutesPerQuestion(Math.max(0.5, Math.min(30, val)));
                        }}
                        className="flex-1 px-4 py-2.5 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-slate-700 dark:text-slate-200 font-medium transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setMinutesPerQuestion(Math.min(30, minutesPerQuestion + 0.5))}
                        disabled={minutesPerQuestion >= 30}
                        className="flex items-center justify-center w-10 h-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">add</span>
                      </button>
                    </div>
                  </label>

                  {/* Sugestões de tempo por questão */}
                  <div className="flex gap-2 flex-wrap">
                    {[1, 1.5, 2, 2.5, 3, 4, 5].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setMinutesPerQuestion(mins)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          minutesPerQuestion === mins
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo do Tempo */}
              <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">Tempo total:</span>
                  <span className="font-bold text-primary">
                    {Math.floor(getTotalMinutes() / 60)}h {getTotalMinutes() % 60}min
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">Tempo médio por questão:</span>
                  <span className="font-bold text-primary">{getAverageTimePerQuestion()} min</span>
                </div>
              </div>
            </div>

            {/* Opções Adicionais */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Opções do Simulado
              </h3>

              {/* Randomizar Questões */}
              <label className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">shuffle</span>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      Embaralhar Questões
                    </p>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      Ordem aleatória das questões
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>

            {/* Informações Importantes */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
                  info
                </span>
                <div className="flex-1 space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Modo Simulado:</p>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Não será possível ver as respostas até finalizar</li>
                    <li>Navegação lateral desabilitada (modo foco)</li>
                    <li>Sem acesso a comentários e revisões</li>
                    <li>O simulado só pode ser feito uma vez</li>
                    <li>Cronômetro pode ser ocultado durante a prova</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-border-light dark:border-border-dark rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSimulated}
                disabled={loading || questionCount === 0}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">play_arrow</span>
                    Criar Simulado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
