'use client';

import { useState, useEffect, useRef } from 'react';
import Checkbox from '@/components/ui/Checkbox';

interface ContentDistribution {
  questions: number;
  flashcards: number;
  error_notebook: number;
}

interface WizardData {
  // Sistema de revisões ativo/inativo
  reviews_enabled: boolean;

  // Tipos de conteúdo
  enable_questions: boolean;
  enable_flashcards: boolean;
  enable_error_notebook: boolean;

  // Modo de estudo
  auto_adjust_mode: boolean;
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  exam_date?: string;

  // Agendamento
  scheduling_mode: 'traditional' | 'smart';
  daily_reviews_limit: number;
  study_days: number[];
  content_distribution: ContentDistribution;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const STEPS = [
  { id: 1, label: 'Sistema', description: 'Ativar revisões', order: 1 },
  { id: 2, label: 'Modo', description: 'Ritmo de estudo', order: 2 },
  { id: 3, label: 'Agendamento', description: 'Distribuição', order: 3 },
  { id: 4, label: 'Dias', description: 'Quando estudar', order: 4 },
  { id: 5, label: 'Resumo', description: 'Confirmar', order: 5 },
];

export function ReviewConfigurationWizard({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  // Estados para animação slide-in
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const [data, setData] = useState<WizardData>({
    reviews_enabled: true,
    enable_questions: true,
    enable_flashcards: true,
    enable_error_notebook: true,
    auto_adjust_mode: true,
    study_mode: 'balanced',
    exam_date: undefined,
    scheduling_mode: 'traditional', // Padrão: tradicional
    daily_reviews_limit: 50,
    study_days: [1, 2, 3, 4, 5],
    content_distribution: { questions: 40, flashcards: 30, error_notebook: 30 },
  });

  // Carregar preferências salvas ao abrir o wizard
  useEffect(() => {
    if (isOpen) {
      const loadPreferences = async () => {
        try {
          setIsLoadingPreferences(true);
          console.log('🔄 Carregando preferências do usuário...');
          
          const { supabase } = await import('@/config/supabase');
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            console.log('❌ Sem sessão ativa');
            setIsLoadingPreferences(false);
            return;
          }

          const response = await fetch('/api/review-preferences', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Resposta da API:', result);
            
            if (result.success && result.data) {
              const preferences = result.data;
              console.log('✅ Preferências carregadas:', preferences);
              
              // Preencher o wizard com as preferências salvas
              const autoAdjust = preferences.auto_adjust_mode ?? true;
              const hasExamDate = preferences.exam_date;
              
              const newData = {
                reviews_enabled: preferences.reviews_enabled ?? true,
                enable_questions: preferences.enable_questions ?? true,
                enable_flashcards: preferences.enable_flashcards ?? true,
                enable_error_notebook: preferences.enable_error_notebook ?? true,
                auto_adjust_mode: autoAdjust,
                study_mode: preferences.study_mode ?? 'balanced',
                // Se modo automático sem data, marcar como 'no_date'
                exam_date: hasExamDate 
                  ? new Date(preferences.exam_date).toISOString().split('T')[0] 
                  : (autoAdjust ? 'no_date' : undefined),
                scheduling_mode: preferences.scheduling_mode ?? 'traditional',
                daily_reviews_limit: preferences.daily_reviews_limit ?? 50,
                study_days: preferences.study_days ?? [1, 2, 3, 4, 5],
                content_distribution: preferences.content_distribution ?? { questions: 40, flashcards: 30, error_notebook: 30 },
              };
              
              console.log('📝 Dados do wizard atualizados:', newData);
              setData(newData);
            } else {
              console.log('⚠️ Resposta sem dados:', result);
            }
          } else {
            console.log('⚠️ Erro na resposta da API:', response.status);
          }
        } catch (error) {
          console.error('❌ Erro ao carregar preferências:', error);
        } finally {
          setIsLoadingPreferences(false);
        }
      };

      loadPreferences();
    }
  }, [isOpen]);

  // useEffect para controlar animações
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
        setStep(1);
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const calculateDistribution = (
    questions: boolean,
    flashcards: boolean,
    errors: boolean
  ): ContentDistribution => {
    const enabledCount = [questions, flashcards, errors].filter(Boolean).length;

    if (enabledCount === 0) {
      return { questions: 0, flashcards: 0, error_notebook: 0 };
    } else if (enabledCount === 1) {
      if (questions) return { questions: 100, flashcards: 0, error_notebook: 0 };
      if (flashcards) return { questions: 0, flashcards: 100, error_notebook: 0 };
      if (errors) return { questions: 0, flashcards: 0, error_notebook: 100 };
    } else if (enabledCount === 2) {
      if (questions && flashcards) return { questions: 60, flashcards: 40, error_notebook: 0 };
      if (questions && errors) return { questions: 60, flashcards: 0, error_notebook: 40 };
      if (flashcards && errors) return { questions: 0, flashcards: 60, error_notebook: 40 };
    }

    // Todos habilitados
    return { questions: 40, flashcards: 30, error_notebook: 30 };
  };

  const handleContentTypeChange = (type: 'questions' | 'flashcards' | 'error_notebook', checked: boolean) => {
    const newData = { ...data, [`enable_${type}`]: checked };
    const distribution = calculateDistribution(
      type === 'questions' ? checked : data.enable_questions,
      type === 'flashcards' ? checked : data.enable_flashcards,
      type === 'error_notebook' ? checked : data.enable_error_notebook
    );
    setData({ ...newData, content_distribution: distribution });
  };

  const handleStudyDayToggle = (day: number) => {
    const newDays = data.study_days.includes(day)
      ? data.study_days.filter((d) => d !== day)
      : [...data.study_days, day].sort((a, b) => a - b);
    setData({ ...data, study_days: newDays });
  };

  const getDistributionText = () => {
    const { questions, flashcards, error_notebook } = data.content_distribution;
    const parts = [];
    if (questions > 0) parts.push(`Questões: ${questions}%`);
    if (flashcards > 0) parts.push(`Flashcards: ${flashcards}%`);
    if (error_notebook > 0) parts.push(`Caderno de Erros: ${error_notebook}%`);
    return parts.join(' • ');
  };

  const getDistributionExample = () => {
    const limit = data.daily_reviews_limit;
    const { questions, flashcards, error_notebook } = data.content_distribution;
    const parts = [];
    if (questions > 0) parts.push(`${Math.round((limit * questions) / 100)} questões`);
    if (flashcards > 0) parts.push(`${Math.round((limit * flashcards) / 100)} flashcards`);
    if (error_notebook > 0) parts.push(`${Math.round((limit * error_notebook) / 100)} erros`);
    return parts.join(' + ');
  };

  const handleComplete = async () => {
    try {
      // Se está desativando o sistema, mostrar confirmação
      if (!data.reviews_enabled && step === 1) {
        setShowDisableConfirmation(true);
        return;
      }

      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      // Calcular dias até a prova (apenas se modo automático e tem data válida)
      let daysUntilExam = null;
      if (data.auto_adjust_mode && data.exam_date && data.exam_date !== 'no_date') {
        daysUntilExam = Math.ceil(
          (new Date(data.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`📅 Dias até a prova: ${daysUntilExam}`, {
          auto_adjust_mode: data.auto_adjust_mode,
          exam_date: data.exam_date,
          daysUntilExam,
          shouldActivateCramming: daysUntilExam <= 15
        });
      } else {
        console.log('⚠️ Não calculou dias até prova:', {
          auto_adjust_mode: data.auto_adjust_mode,
          exam_date: data.exam_date,
          is_no_date: data.exam_date === 'no_date'
        });
      }

      // MODO AUTOMÁTICO: Ativar cramming se prova ≤15 dias
      if (data.auto_adjust_mode && daysUntilExam && daysUntilExam <= 15) {
        console.log('🎯 ATIVANDO CRAMMING!');

        try {
          const response = await fetch('/api/unified-reviews/activate-cramming', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ exam_date: data.exam_date }),
          });

          if (response.ok) {
            console.log('✅ Modo Pré-Prova ativado automaticamente');
            
            // Mostrar mensagem informativa
            const crammingDays = Math.min(daysUntilExam, 15);
            alert(
              'Modo Pré-Prova Ativado!\n\n' +
              `Sua prova está em ${daysUntilExam} dias.\n\n` +
              'Suas revisões foram automaticamente:\n' +
              `• Reagendadas para os próximos ${crammingDays} dias\n` +
              '• Distribuídas uniformemente até a prova\n' +
              '• Limite diário aumentado para 200 revisões\n\n' +
              'Este é um modo INTENSIVO para preparação de última hora!\n\n' +
              'Bons estudos!'
            );
            
            handleCloseWithAnimation();
            return;
          }
        } catch (error) {
          console.error('Erro ao ativar cramming:', error);
        }
      }

      // Calcular max_interval_days baseado no study_mode
      const maxIntervalDays = data.study_mode === 'intensive' ? 30 : 
                              data.study_mode === 'balanced' ? 40 : 60;

      // MODO AUTOMÁTICO: Auto-reagendar se prova 16-30 dias
      let shouldAutoReschedule = false;
      if (data.auto_adjust_mode && daysUntilExam && daysUntilExam > 15 && daysUntilExam <= 30) {
        shouldAutoReschedule = true;
      }

      // MODO MANUAL: Verificar se há cards excedendo o novo limite
      let shouldAskReschedule = false;
      let cardsExceedingCount = 0;
      
      if (!data.auto_adjust_mode) {
        try {
          const response = await fetch(
            `/api/review-preferences/cards-exceeding-limit?max_days=${maxIntervalDays}`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            cardsExceedingCount = result.data?.count || 0;
            shouldAskReschedule = cardsExceedingCount > 0;
          }
        } catch (error) {
          console.error('Erro ao verificar cards excedendo limite:', error);
        }
      }

      // Perguntar ao usuário se quer reagendar (modo manual)
      let rescheduleCards = shouldAutoReschedule;
      
      if (shouldAskReschedule && !shouldAutoReschedule) {
        const confirmed = window.confirm(
          `Você tem ${cardsExceedingCount} revisões agendadas além de ${maxIntervalDays} dias.\n\n` +
          `Deseja reagendá-las para o novo limite?\n\n` +
          `• SIM: Revisões serão reagendadas automaticamente\n` +
          `• NÃO: Você pode reagendá-las manualmente depois no Gerenciador de Revisões\n\n` +
          `Nota: Revisões com menos de 30 dias não serão afetadas.`
        );
        rescheduleCards = confirmed;
      }

      // Salvar preferências
      const saveData = {
        ...data,
        exam_date: data.exam_date === 'no_date' ? undefined : data.exam_date,
        max_interval_days: maxIntervalDays,
        reschedule_cards: rescheduleCards,
      };

      const response = await fetch('/api/review-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();
      
      if (result.rescheduled_count > 0) {
        console.log(`✅ ${result.rescheduled_count} revisões reagendadas`);
      }

      console.log('✅ Fechando wizard...');
      handleCloseWithAnimation();
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  const confirmDisable = async () => {
    setShowDisableConfirmation(false);

    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      await fetch('/api/review-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      handleCloseWithAnimation();
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  const handleCloseWithAnimation = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleStepClick = (stepId: number) => {
    setStep(stepId);
  };

  if (!shouldRender) return null;

  const currentStepIndex = step - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={handleCloseWithAnimation}
      />

      {/* Modal Slide-in */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[90%] lg:w-[80%] xl:w-[70%] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out flex flex-col ${isAnimating ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          <div>
            <h2 className="text-2xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              Configurações de Revisão
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Configure suas preferências de estudo
            </p>
          </div>
          <button
            onClick={handleCloseWithAnimation}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
              close
            </span>
          </button>
        </div>

        {/* Stepper Chevron */}
        <div className="px-6 py-6 bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <div className="flex items-center relative">
            {STEPS.map((s, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <div
                  key={s.id}
                  className="relative flex-1 first:flex-none first:w-auto"
                  style={{
                    zIndex: STEPS.length - index,
                    marginLeft: index === 0 ? '0' : '-24px'
                  }}
                >
                  <button
                    onClick={() => handleStepClick(s.id)}
                    className={`
                      relative w-full h-20 flex items-center justify-center gap-4 px-8
                      transition-all duration-300 ease-in-out cursor-pointer
                      ${isCompleted ? 'bg-surface-light dark:bg-surface-dark shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:-translate-y-0.5' : ''}
                      ${isCurrent ? 'bg-primary shadow-2xl shadow-primary/30 dark:shadow-primary/20 scale-[1.02]' : ''}
                      ${isUpcoming ? 'bg-gray-300/90 dark:bg-gray-700/90 shadow-md dark:shadow-dark-md hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-0.5' : ''}
                      ${index === 0 ? 'rounded-l-xl pl-6' : ''}
                      ${index === STEPS.length - 1 ? 'rounded-r-xl pr-8' : ''}
                    `}
                    style={{
                      clipPath: index === STEPS.length - 1
                        ? index === 0
                          ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                          : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)'
                        : index === 0
                          ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                          : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)',
                    }}
                  >
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-500 shadow-lg shadow-green-500/30' : ''}
                      ${isCurrent ? 'bg-white shadow-xl shadow-white/30 scale-110' : ''}
                      ${isUpcoming ? 'bg-gray-400 dark:bg-gray-500 shadow-md' : ''}
                    `}>
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-2xl font-bold text-white">check</span>
                      ) : (
                        <span className={`
                          font-bold text-xl
                          ${isCurrent ? 'text-primary' : 'text-white dark:text-gray-300'}
                        `}>
                          {s.order}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center min-w-0">
                      <div className={`
                        font-bold text-base leading-tight mb-1
                        ${isCurrent ? 'text-white' : ''}
                        ${isCompleted ? 'text-text-light-primary dark:text-text-dark-primary' : ''}
                        ${isUpcoming ? 'text-gray-700 dark:text-gray-300' : ''}
                      `}>
                        {s.label}
                      </div>
                      <div className={`
                        text-xs leading-tight
                        ${isCurrent ? 'text-white/90' : ''}
                        ${isCompleted ? 'text-text-light-secondary dark:text-text-dark-secondary' : ''}
                        ${isUpcoming ? 'text-gray-600 dark:text-gray-400' : ''}
                      `}>
                        {s.description}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6">
          {isLoadingPreferences ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  Carregando suas preferências...
                </p>
              </div>
            </div>
          ) : step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Sistema de Revisões
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Ative ou desative o sistema de revisões espaçadas
                </p>
              </div>

              <div className="space-y-3">
                {/* Opção: Ativar/Desativar Sistema */}
                <div className="flex items-start gap-3 p-4 border-2 border-border-light dark:border-border-dark 
                                rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                transition-all duration-200 cursor-pointer"
                  onClick={() => setData({ ...data, reviews_enabled: !data.reviews_enabled })}>
                  <Checkbox
                    checked={data.reviews_enabled}
                    onChange={(e) => setData({ ...data, reviews_enabled: e.currentTarget.checked })}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Ativar Sistema de Revisões
                    </p>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                      Use repetição espaçada para melhorar sua retenção
                    </p>
                  </div>
                </div>

                {data.reviews_enabled && (
                  <>
                    <div className="mt-4 mb-2">
                      <h4 className="text-md font-semibold text-text-light-primary dark:text-text-dark-primary">
                        Tipos de Conteúdo
                      </h4>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        Selecione o que deseja incluir nas revisões
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 border-2 border-border-light dark:border-border-dark 
                                    rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                    transition-all duration-200 cursor-pointer"
                      onClick={() => handleContentTypeChange('questions', !data.enable_questions)}>
                      <Checkbox
                        checked={data.enable_questions}
                        onChange={(e) => handleContentTypeChange('questions', e.currentTarget.checked)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          Questões
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                          Questões de provas e listas de exercícios
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border-2 border-border-light dark:border-border-dark 
                                    rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                    transition-all duration-200 cursor-pointer"
                      onClick={() => handleContentTypeChange('flashcards', !data.enable_flashcards)}>
                      <Checkbox
                        checked={data.enable_flashcards}
                        onChange={(e) => handleContentTypeChange('flashcards', e.currentTarget.checked)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          Flashcards
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                          Cards de memorização
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border-2 border-border-light dark:border-border-dark 
                                    rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                    transition-all duration-200 cursor-pointer"
                      onClick={() => handleContentTypeChange('error_notebook', !data.enable_error_notebook)}>
                      <Checkbox
                        checked={data.enable_error_notebook}
                        onChange={(e) => handleContentTypeChange('error_notebook', e.currentTarget.checked)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          Caderno de Erros
                        </p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                          Questões que você errou
                        </p>
                      </div>
                    </div>

                    {(data.enable_questions || data.enable_flashcards || data.enable_error_notebook) && (
                      <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-xl border-2 border-primary/30">
                        <p className="text-sm font-semibold text-primary mb-2">Distribuição das revisões:</p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {getDistributionText()}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                >
                  Cancelar
                </button>
                {data.reviews_enabled ? (
                  <button
                    onClick={() => setStep(2)}
                    disabled={!data.enable_questions && !data.enable_flashcards && !data.enable_error_notebook}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                               hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                               hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Salvar
                  </button>
                )}
              </div>
            </div>
          )}

          {!isLoadingPreferences && step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Modo de Estudo
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Configure o ritmo das suas revisões
                </p>
              </div>

              <div className="space-y-3">
                {/* Opção 1: Auto-ajuste (Recomendado) */}
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${data.auto_adjust_mode
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                  onClick={() => {
                    // Ao ativar modo automático, recalcular study_mode se já houver data
                    if (!data.auto_adjust_mode && data.exam_date && data.exam_date !== 'no_date') {
                      const daysUntilExam = Math.ceil(
                        (new Date(data.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      let newStudyMode: 'intensive' | 'balanced' | 'relaxed' = 'relaxed';
                      
                      if (daysUntilExam <= 15) {
                        newStudyMode = 'intensive';
                      } else if (daysUntilExam <= 30) {
                        newStudyMode = 'intensive';
                      } else if (daysUntilExam <= 90) {
                        newStudyMode = 'balanced';
                      } else {
                        newStudyMode = 'relaxed';
                      }
                      
                      console.log(`🔄 Modo automático ativado. Dias até prova: ${daysUntilExam}, Novo modo: ${newStudyMode}`);
                      setData({ ...data, auto_adjust_mode: true, study_mode: newStudyMode });
                    } else {
                      setData({ ...data, auto_adjust_mode: true });
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={data.auto_adjust_mode}
                      onChange={() => {
                        // Ao ativar modo automático, recalcular study_mode se já houver data
                        if (!data.auto_adjust_mode && data.exam_date && data.exam_date !== 'no_date') {
                          const daysUntilExam = Math.ceil(
                            (new Date(data.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                          );
                          
                          let newStudyMode: 'intensive' | 'balanced' | 'relaxed' = 'relaxed';
                          
                          if (daysUntilExam <= 15) {
                            newStudyMode = 'intensive';
                          } else if (daysUntilExam <= 30) {
                            newStudyMode = 'intensive';
                          } else if (daysUntilExam <= 90) {
                            newStudyMode = 'balanced';
                          } else {
                            newStudyMode = 'relaxed';
                          }
                          
                          console.log(`🔄 Modo automático ativado. Dias até prova: ${daysUntilExam}, Novo modo: ${newStudyMode}`);
                          setData({ ...data, auto_adjust_mode: true, study_mode: newStudyMode });
                        } else {
                          setData({ ...data, auto_adjust_mode: true });
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Ajuste Automático (Recomendado)
                      </p>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
                        O sistema ajusta automaticamente o ritmo baseado na data da sua prova
                      </p>

                      {data.auto_adjust_mode && (
                        <div className="space-y-3 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                              Quando será sua prova?
                            </label>
                            <input
                              type="date"
                              value={data.exam_date || ''}
                              onChange={(e) => {
                                const selectedDate = e.target.value;
                                
                                // Se modo automático, calcular study_mode baseado na data
                                if (data.auto_adjust_mode && selectedDate) {
                                  const daysUntilExam = Math.ceil(
                                    (new Date(selectedDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                                  );
                                  
                                  let newStudyMode: 'intensive' | 'balanced' | 'relaxed' = 'relaxed';
                                  
                                  if (daysUntilExam <= 15) {
                                    newStudyMode = 'intensive'; // Será cramming ao salvar
                                  } else if (daysUntilExam <= 30) {
                                    newStudyMode = 'intensive';
                                  } else if (daysUntilExam <= 90) {
                                    newStudyMode = 'balanced';
                                  } else {
                                    newStudyMode = 'relaxed';
                                  }
                                  
                                  console.log(`📅 Data selecionada: ${selectedDate}, Dias até prova: ${daysUntilExam}, Modo: ${newStudyMode}`);
                                  setData({ ...data, exam_date: selectedDate, study_mode: newStudyMode });
                                } else {
                                  setData({ ...data, exam_date: selectedDate });
                                }
                              }}
                              min={new Date().toISOString().split('T')[0]}
                              disabled={data.exam_date === 'no_date'}
                              className={`w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                                         bg-surface-light dark:bg-surface-dark
                                         text-text-light-primary dark:text-text-dark-primary
                                         focus:border-primary focus:ring-4 focus:ring-primary/20
                                         transition-all duration-200
                                         ${data.exam_date === 'no_date' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </div>

                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <strong>Como funciona:</strong><br />
                              • Mais de 90 dias: Sem Compromisso (máx 60 dias)<br />
                              • 31-90 dias: Balanceado (máx 40 dias)<br />
                              • 16-30 dias: Intensivo (máx 30 dias)<br />
                              • Até 15 dias: Pré-Prova (distribui até a prova, reagenda automaticamente)
                            </p>
                          </div>

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (data.exam_date === 'no_date') {
                                // Reativar calendário
                                setData({ ...data, exam_date: undefined });
                              } else {
                                // Desativar calendário e marcar como sem data
                                setData({ ...data, exam_date: 'no_date', study_mode: 'relaxed' });
                              }
                            }}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                              data.exam_date === 'no_date'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                                : 'border-border-light dark:border-border-dark hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                data.exam_date === 'no_date'
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {data.exam_date === 'no_date' && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                                  Não tenho data definida
                                </p>
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                  Usar modo Sem Compromisso (intervalos longos, máx 60 dias)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opção 2: Manual */}
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${!data.auto_adjust_mode
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                  onClick={() => setData({ ...data, auto_adjust_mode: false })}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={!data.auto_adjust_mode}
                      onChange={() => setData({ ...data, auto_adjust_mode: false })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Escolher Manualmente
                      </p>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
                        Defina o ritmo das revisões você mesmo
                      </p>

                      {!data.auto_adjust_mode && (
                        <div className="space-y-2 mt-4">
                          <div
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${data.study_mode === 'intensive'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-border-light dark:border-border-dark hover:border-red-300'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setData({ ...data, study_mode: 'intensive' });
                            }}
                          >
                            <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                              Intensivo
                            </p>
                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                              Intervalos curtos, mais revisões, 90% retenção (máx 30 dias)
                            </p>
                          </div>

                          <div
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${data.study_mode === 'balanced'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-border-light dark:border-border-dark hover:border-blue-300'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setData({ ...data, study_mode: 'balanced' });
                            }}
                          >
                            <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                              Balanceado
                            </p>
                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                              Intervalos médios, revisões moderadas, 85% retenção (máx 40 dias)
                            </p>
                          </div>

                          <div
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${data.study_mode === 'relaxed'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-border-light dark:border-border-dark hover:border-green-300'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setData({ ...data, study_mode: 'relaxed' });
                            }}
                          >
                            <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                              Sem Compromisso
                            </p>
                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                              Intervalos longos, menos revisões, 80% retenção (máx 60 dias)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                             hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {!isLoadingPreferences && step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Modo de Agendamento
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Como deseja agendar suas revisões?
                </p>
              </div>

              <div className="space-y-3">
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${data.scheduling_mode === 'traditional'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                  onClick={() => setData({ ...data, scheduling_mode: 'traditional' })}
                >
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Tradicional (Flexível) - Padrão
                  </p>
                  <ul className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1 ml-4">
                    <li>✓ Sem limite diário</li>
                    <li>✓ Estude quando quiser</li>
                    <li>✓ Pode acumular revisões</li>
                  </ul>
                </div>

                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${data.scheduling_mode === 'smart'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                  onClick={() => setData({ ...data, scheduling_mode: 'smart' })}
                >
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Smart Scheduling (Regular)
                  </p>
                  <ul className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1 ml-4">
                    <li>✓ Limite diário obrigatório</li>
                    <li>✓ Distribuição automática</li>
                    <li>✓ Zero acúmulo</li>
                  </ul>

                  {data.scheduling_mode === 'smart' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                        Limite diário de revisões
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={data.daily_reviews_limit}
                        onChange={(e) =>
                          setData({ ...data, daily_reviews_limit: parseInt(e.target.value) || 50 })
                        }
                        className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                                   bg-surface-light dark:bg-surface-dark
                                   text-text-light-primary dark:text-text-dark-primary
                                   focus:border-primary focus:ring-4 focus:ring-primary/20
                                   transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                             hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {!isLoadingPreferences && step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Dias de Estudo
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Em quais dias você vai estudar?
                </p>
              </div>

              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${data.study_days.includes(day.value)
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }`}
                    onClick={() => handleStudyDayToggle(day.value)}
                  >
                    <Checkbox
                      checked={data.study_days.includes(day.value)}
                      onChange={() => handleStudyDayToggle(day.value)}
                    />
                    <span className="flex-1 font-medium text-text-light-primary dark:text-text-dark-primary">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={data.study_days.length === 0}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                             hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {!isLoadingPreferences && step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Configuração Completa
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Revise suas preferências
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark">
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Sistema de Revisões
                  </p>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    • {data.reviews_enabled ? 'Ativado ✓' : 'Desativado ✗'}
                  </div>
                </div>

                {data.reviews_enabled && (
                  <>
                    <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Tipos de Conteúdo
                      </p>
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
                        {data.enable_questions && <div>• Questões ✓</div>}
                        {data.enable_flashcards && <div>• Flashcards ✓</div>}
                        {data.enable_error_notebook && <div>• Caderno de Erros ✓</div>}
                        {!data.enable_questions && !data.enable_flashcards && !data.enable_error_notebook && (
                          <div>• Nenhum tipo selecionado</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Modo de Estudo
                      </p>
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
                        {data.auto_adjust_mode ? (
                          <>
                            <div>• Ajuste Automático ✓</div>
                            {data.exam_date ? (
                              <div>• Prova: {new Date(data.exam_date).toLocaleDateString('pt-BR')}</div>
                            ) : (
                              <div>• Sem data definida (Sem Compromisso)</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>• Modo Manual</div>
                            <div>• {data.study_mode === 'intensive' ? 'Intensivo' : data.study_mode === 'balanced' ? 'Balanceado' : 'Sem Compromisso'}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Modo de Agendamento
                      </p>
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        • {data.scheduling_mode === 'smart' ? 'Smart Scheduling' : 'Tradicional (Padrão)'}
                        {data.scheduling_mode === 'smart' && (
                          <div>• Limite: {data.daily_reviews_limit} revisões/dia</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark">
                      <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Dias de Estudo
                      </p>
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        • {data.study_days.length} dias/semana
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                >
                  Voltar
                </button>
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                             hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Salvar e Começar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Desativação */}
      {showDisableConfirmation && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001]" onClick={() => setShowDisableConfirmation(false)} />

          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl 
                          border-2 border-border-light dark:border-border-dark
                          w-full max-w-md">

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-orange-500 text-3xl">
                    warning
                  </span>
                  <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    Desativar Sistema de Revisões?
                  </h3>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Ao desativar o sistema de revisões:
                  </p>

                  <ul className="space-y-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-orange-500 text-lg mt-0.5">info</span>
                      <span>O sistema <strong>não registrará mais nenhuma revisão</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">check_circle</span>
                      <span>As revisões já existentes <strong>continuarão no sistema</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">replay</span>
                      <span>Você pode <strong>reativar quando quiser</strong></span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisableConfirmation(false)}
                    className="flex-1 px-4 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                             font-semibold text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDisable}
                    className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold 
                             hover:bg-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Desativar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
