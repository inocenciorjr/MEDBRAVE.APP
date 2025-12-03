'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/lib/contexts/ToastContext';
import QuestionSearchPanel from '@/components/mentor/simulados/QuestionSearchPanel';
import SelectedQuestionsPanel from '@/components/mentor/simulados/SelectedQuestionsPanel';
import SimuladoSettingsPanel from '@/components/mentor/simulados/SimuladoSettingsPanel';

export interface SelectedQuestion {
  id: string;
  type: 'bank' | 'custom';
  enunciado: string;
  specialty?: string;
  university?: string;
  year?: number;
  subFilterIds?: string[]; // Filtros completos da questão
  alternatives?: { id: string; text: string; isCorrect: boolean }[];
  // Dados temporários para questões autorais (serão criadas no banco ao salvar)
  tempData?: {
    content: string;
    alternatives: { id: string; text: string; isCorrect: boolean }[];
    correctAnswer: string;
    explanation?: string;
    subFilterIds?: string[];
    difficulty?: number;
  };
}

export type SimuladoVisibility = 'public' | 'private' | 'selected';

export interface SimuladoSettings {
  name: string;
  description: string;
  visibility: SimuladoVisibility;
  selectedMentorshipIds: string[];
  selectedUserIds: string[];
  selectedProgramIds: string[];
  timeLimit?: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  scheduledDate: string;
  scheduledTime: string;
}

type Step = 'questions' | 'settings' | 'review';

export default function CriarSimuladoPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('questions');
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [settings, setSettings] = useState<SimuladoSettings>({
    name: '',
    description: '',
    visibility: 'private',
    selectedMentorshipIds: [],
    selectedUserIds: [],
    selectedProgramIds: [],
    shuffleQuestions: true,
    showResults: true,
    scheduledDate: '',
    scheduledTime: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = useCallback((question: SelectedQuestion) => {
    setSelectedQuestions(prev => {
      if (prev.some(q => q.id === question.id)) {
        // Não mostrar toast aqui - será tratado no componente
        return prev;
      }
      return [...prev, question];
    });
  }, []);

  const removeQuestion = useCallback((questionId: string) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const reorderQuestions = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedQuestions(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const handleSubmit = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Adicione pelo menos uma questão');
      return;
    }

    if (!settings.name.trim()) {
      toast.error('Digite um nome para o simulado');
      setCurrentStep('settings');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Primeiro, criar questões autorais pendentes no banco (via backend)
      const customQuestions = selectedQuestions.filter(q => q.type === 'custom' && q.tempData);
      const createdQuestionIds: Map<string, string> = new Map();

      for (const customQ of customQuestions) {
        try {
          const response = await fetch('/api/mentorship/mentor-simulados/questions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: customQ.tempData!.content,
              alternatives: customQ.tempData!.alternatives,
              correctAnswer: customQ.tempData!.correctAnswer,
              explanation: customQ.tempData!.explanation,
              subFilterIds: customQ.tempData!.subFilterIds,
              difficulty: customQ.tempData!.difficulty,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            createdQuestionIds.set(customQ.id, data.data.id);
            console.log(`✅ Questão autoral criada: ${customQ.id} -> ${data.data.id}`);
          } else {
            const error = await response.json();
            console.error(`❌ Erro ao criar questão autoral:`, error);
            toast.warning(`Erro ao criar uma questão autoral: ${error.error}`);
          }
        } catch (error) {
          console.error('Erro ao criar questão autoral:', error);
        }
      }

      // 2. Mapear questões com IDs atualizados
      const questionsForSimulado = selectedQuestions.map((q, index) => {
        // Se é questão autoral e foi criada, usar o novo ID
        if (q.type === 'custom' && createdQuestionIds.has(q.id)) {
          return {
            questionId: createdQuestionIds.get(q.id)!,
            type: 'bank', // Agora é uma questão do banco
            order: index,
          };
        }
        return {
          questionId: q.id,
          type: q.type,
          order: index,
        };
      });

      // 3. Preparar data de agendamento
      let scheduledAt = null;
      if (settings.scheduledDate && settings.scheduledTime) {
        scheduledAt = `${settings.scheduledDate}T${settings.scheduledTime}:00`;
      }

      // 4. Criar o simulado (via backend)
      const response = await fetch('/api/mentorship/mentor-simulados', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          visibility: settings.visibility,
          selectedMentorshipIds: settings.selectedMentorshipIds,
          selectedUserIds: settings.selectedUserIds,
          questions: questionsForSimulado,
          timeLimit: settings.timeLimit,
          shuffleQuestions: settings.shuffleQuestions,
          showResults: settings.showResults,
          scheduledAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar simulado');
      }

      const createdCount = createdQuestionIds.size;
      toast.success(
        createdCount > 0 
          ? `Simulado criado! ${createdCount} questão(ões) autoral(is) foram adicionadas ao banco.`
          : 'Simulado criado com sucesso!'
      );
      router.push('/mentor/simulados');
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar simulado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 'questions', label: 'Questões', icon: 'help' },
    { id: 'settings', label: 'Configurações', icon: 'settings' },
    { id: 'review', label: 'Revisão', icon: 'fact_check' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Simulados', icon: 'quiz', href: '/mentor/simulados' },
          { label: 'Criar', icon: 'add', href: '/mentor/simulados/criar' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Criar Simulado
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Monte um simulado personalizado com questões do banco ou autorais
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-primary">help</span>
          <span className="text-text-light-secondary dark:text-text-dark-secondary">
            {selectedQuestions.length} questão(ões) selecionada(s)
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4
        border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id as Step)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200
                  ${currentStep === step.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/5 dark:hover:bg-primary/10'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${currentStep === step.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {index + 1}
                </div>
                <div className="hidden sm:block">
                  <span className="material-symbols-outlined text-lg">{step.icon}</span>
                </div>
                <span className="font-medium hidden md:block">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content - Layout em coluna: busca em cima, selecionadas embaixo */}
      {currentStep === 'questions' && (
        <div className="flex flex-col gap-6">
          <QuestionSearchPanel 
            onAddQuestion={addQuestion}
            selectedQuestionIds={selectedQuestions.map(q => q.id)}
          />
          <SelectedQuestionsPanel
            questions={selectedQuestions}
            onRemove={removeQuestion}
            onReorder={reorderQuestions}
          />
        </div>
      )}

      {currentStep === 'settings' && (
        <SimuladoSettingsPanel
          settings={settings}
          onChange={setSettings}
        />
      )}

      {currentStep === 'review' && (
        <div className="space-y-6">
          {/* Resumo */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
            border border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Resumo do Simulado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Nome</p>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {settings.name || 'Não definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Descrição</p>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {settings.description || 'Sem descrição'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Visibilidade</p>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                    {settings.visibility === 'public' ? 'Público (todos + inscrição aberta)' : 
                     settings.visibility === 'private' ? 'Privado (rascunho)' : 
                     `Selecionados (${settings.selectedMentorshipIds.length} mentorias, ${settings.selectedUserIds.length} usuários)`}
                  </p>
                </div>
                {(settings.scheduledDate && settings.scheduledTime) && (
                  <div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Agendamento</p>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                      {new Date(`${settings.scheduledDate}T${settings.scheduledTime}`).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Questões</p>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {selectedQuestions.length} questão(ões)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Tempo limite</p>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {settings.timeLimit ? `${settings.timeLimit} minutos` : 'Sem limite'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Opções</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {settings.shuffleQuestions && (
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        Embaralhar questões
                      </span>
                    )}
                    {settings.showResults && (
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-full">
                        Mostrar resultados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de questões */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
            border border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Questões ({selectedQuestions.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-start gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl"
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary
                    rounded-lg font-semibold text-sm flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-2
                        prose prose-sm dark:prose-invert max-w-none
                        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:inline [&_img]:max-h-12"
                      dangerouslySetInnerHTML={{ __html: question.enunciado }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium
                        ${question.type === 'bank' 
                          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                        }`}>
                        {question.type === 'bank' ? 'Banco' : 'Autoral'}
                      </span>
                      {question.specialty && (
                        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          {question.specialty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark rounded-2xl
        border border-border-light dark:border-border-dark">
        <button
          onClick={() => {
            if (currentStep === 'questions') {
              router.push('/mentor/simulados');
            } else if (currentStep === 'settings') {
              setCurrentStep('questions');
            } else {
              setCurrentStep('settings');
            }
          }}
          className="px-5 py-2.5 border border-border-light dark:border-border-dark rounded-xl
            font-semibold text-text-light-primary dark:text-text-dark-primary
            hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200"
        >
          {currentStep === 'questions' ? 'Cancelar' : 'Voltar'}
        </button>

        <button
          onClick={() => {
            if (currentStep === 'questions') {
              if (selectedQuestions.length === 0) {
                toast.warning('Adicione pelo menos uma questão');
                return;
              }
              setCurrentStep('settings');
            } else if (currentStep === 'settings') {
              if (!settings.name.trim()) {
                toast.warning('Digite um nome para o simulado');
                return;
              }
              setCurrentStep('review');
            } else {
              handleSubmit();
            }
          }}
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Criando...
            </>
          ) : currentStep === 'review' ? (
            <>
              <span className="material-symbols-outlined">check</span>
              Criar Simulado
            </>
          ) : (
            <>
              Próximo
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
