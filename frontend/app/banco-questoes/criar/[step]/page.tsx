'use client';

import { use, useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateList } from '../CreateListContext';
import FolderSelector from '@/components/banco-questoes/FolderSelector';
import SubjectSelector from '@/components/banco-questoes/SubjectSelector';
import YearSelector from '@/components/banco-questoes/YearSelector';
import YearGridSelector from '@/components/banco-questoes/YearGridSelector';
import InstitutionSelector from '@/components/banco-questoes/InstitutionSelector';
import ExamTypeSelector from '@/components/banco-questoes/ExamTypeSelector';
import SummaryPanel from '@/components/banco-questoes/SummaryPanel';
import MobileSummaryButton from '@/components/banco-questoes/MobileSummaryButton';
import QuestionPreviewModal from '@/components/banco-questoes/QuestionPreviewModal';
import { ListCreatedSuccessModal } from '@/components/banco-questoes/ListCreatedSuccessModal';
import { useFilterHierarchy, useAvailableYears, useInstitutionHierarchy, useQuestionCount } from '@/hooks/useBancoQuestoes';
import { hierarchyToSubjects } from '@/lib/adapters/bancoQuestoesAdapter';
import api from '@/services/api';
import TextInput from '@/components/ui/TextInput';
import StepperProgress from '@/components/banco-questoes/StepperProgress';
import { useToast } from '@/lib/contexts/ToastContext';

interface StepPageProps {
  params: Promise<{
    step: string;
  }>;
}

export default function StepPage({ params }: StepPageProps) {
  const { step } = use(params);

  if (step === 'geral') {
    return <GeralStep />;
  }

  if (step === 'assuntos') {
    return <AssuntosStep />;
  }

  if (step === 'anos') {
    return <AnosStep />;
  }

  if (step === 'instituicoes') {
    return <InstituicoesStep />;
  }

  return null;
}

function GeralStep() {
  const router = useRouter();
  const toast = useToast();
  const { state, updateListName, updateFolderId, toggleSubject, toggleYear, toggleInstitution, clearFilters } = useCreateList();
  const [error, setError] = useState('');

  // Buscar dados reais do banco
  const { hierarchy } = useFilterHierarchy();
  const subjects = useMemo(() => hierarchyToSubjects(hierarchy), [hierarchy]);
  const { hierarchy: institutionHierarchy } = useInstitutionHierarchy();

  // Contar questões em tempo real
  const { count: questionCount } = useQuestionCount({
    filterIds: [
      ...state.selectedSubjects.filter(id => !id.includes('_')),
      ...(state.selectedExamTypes || [])
    ],
    subFilterIds: state.selectedSubjects.filter(id => id.includes('_')),
    years: state.selectedYears,
    institutions: state.selectedInstitutions,
  });

  const handleNext = () => {
    // Validar nome antes de avançar
    if (!state.listName || state.listName.trim() === '') {
      setError('Por favor, dê um nome para a lista');
      toast.warning('Nome obrigatório', 'Por favor, dê um nome para a lista antes de continuar');
      return;
    }

    setError('');
    router.push('/banco-questoes/criar/assuntos');
  };

  const handleEditStep = (stepId: string) => {
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  const selectedSubjects = useMemo(() => {
    // Criar um mapa de todos os subjects incluindo filhos (subfiltros)
    const allSubjects = new Map<string, any>();
    subjects.forEach(subject => {
      allSubjects.set(subject.id, subject);
      if (subject.children) {
        subject.children.forEach((child: any) => {
          allSubjects.set(child.id, child);
        });
      }
    });
    
    // Filtrar apenas os selecionados
    return state.selectedSubjects
      .map(id => allSubjects.get(id))
      .filter(Boolean);
  }, [subjects, state.selectedSubjects]);

  const selectedInstitutions = useMemo(() => {
    const result: any[] = [];
    institutionHierarchy.forEach((stateNode: any) => {
      if (stateNode.children) {
        stateNode.children.forEach((inst: any) => {
          if (state.selectedInstitutions.includes(inst.id)) {
            result.push({
              id: inst.id,
              name: inst.name,
              state: stateNode.name,
            });
          }
        });
      }
    });
    return result;
  }, [institutionHierarchy, state.selectedInstitutions]);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 xl:pb-0">
      <StepperProgress currentStep="geral" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-8 items-start">
        <div className="xl:col-span-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-4 md:p-6 xl:p-10">
            <h1 className="text-xl md:text-2xl xl:text-3xl font-medium text-slate-700 dark:text-slate-200 mb-6 md:mb-8">
              Criar Lista de Questões
            </h1>

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="mb-6 md:mb-10">
                <FolderSelector
                  selectedFolder={state.folderId}
                  onSelectFolder={updateFolderId}
                  showLists={true}
                  onSelectList={(listId) => console.log('Lista selecionada:', listId)}
                />
              </div>

              <TextInput
                id="list-name"
                name="list-name"
                value={state.listName}
                onChange={(value) => {
                  updateListName(value);
                  setError('');
                }}
                placeholder="Nome da Lista de Questões"
                error={error}
                fullWidth
              />

              <div className="flex justify-end mt-6 md:mt-10">
                <button
                  type="submit"
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-primary rounded-lg hover:bg-violet-800 transition-transform duration-200 hover:scale-105 shadow-xl hover:shadow-2xl shadow-primary/40"
                >
                  <span>Próximo</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Desktop: Summary Panel */}
        <div className="hidden xl:block xl:col-span-2">
          <SummaryPanel
            data={{
              listName: state.listName,
              selectedSubjects,
              selectedYears: state.selectedYears,
              selectedInstitutions,
              selectedExamTypes: state.selectedExamTypes || [],
              totalQuestions: questionCount,
            }}
            onEditStep={handleEditStep}
            onRemoveSubject={toggleSubject}
            onRemoveYear={toggleYear}
            onRemoveInstitution={toggleInstitution}
            onClearFilters={clearFilters}
            onUpdateListName={updateListName}
          />
        </div>
      </div>

      {/* Mobile + Tablet: Botão Flutuante */}
      <MobileSummaryButton
        data={{
          listName: state.listName,
          selectedSubjects,
          selectedYears: state.selectedYears,
          selectedInstitutions,
          selectedExamTypes: state.selectedExamTypes || [],
          totalQuestions: questionCount,
        }}
        onEditStep={handleEditStep}
        onRemoveSubject={toggleSubject}
        onRemoveYear={toggleYear}
        onRemoveInstitution={toggleInstitution}
        onClearFilters={clearFilters}
        onUpdateListName={updateListName}
      />
    </div>
  );
}

function AssuntosStep() {
  const router = useRouter();
  const { state, updateListName, toggleSubject, toggleYear, toggleInstitution, clearFilters } = useCreateList();
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Buscar dados reais do banco
  const { hierarchy, loading: loadingSubjects } = useFilterHierarchy();

  // Filtrar apenas filtros educacionais (assuntos médicos)
  const educationalHierarchy = useMemo(() => {
    const educationalFilters = [
      'Cirurgia',
      'Clínica Médica',
      'Ginecologia',
      'Medicina Preventiva',
      'Obstetrícia',
      'Pediatria',
      'Outros'
    ];

    return hierarchy.filter(filter => educationalFilters.includes(filter.name));
  }, [hierarchy]);

  const subjects = useMemo(() => hierarchyToSubjects(educationalHierarchy), [educationalHierarchy]);

  // Contar questões em tempo real
  const { count: questionCount, isFetching: isCountFetching } = useQuestionCount({
    filterIds: [
      ...state.selectedSubjects.filter(id => !id.includes('_')),
      ...(state.selectedExamTypes || [])
    ],
    subFilterIds: state.selectedSubjects.filter(id => id.includes('_')),
    years: state.selectedYears,
    institutions: state.selectedInstitutions,
  });

  const handleNext = () => {
    // Não validar assuntos - permitir avançar sem selecionar
    setError('');
    router.push('/banco-questoes/criar/anos');
  };

  const handleBack = () => {
    router.push('/banco-questoes/criar/geral');
  };

  const handleEditStep = (stepId: string) => {
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  const selectedSubjects = useMemo(() => {
    // Criar um mapa de todos os subjects incluindo filhos (subfiltros)
    const allSubjects = new Map<string, any>();
    subjects.forEach(subject => {
      allSubjects.set(subject.id, subject);
      if (subject.children) {
        subject.children.forEach((child: any) => {
          allSubjects.set(child.id, child);
        });
      }
    });
    
    // Filtrar apenas os selecionados
    return state.selectedSubjects
      .map(id => allSubjects.get(id))
      .filter(Boolean);
  }, [subjects, state.selectedSubjects]);

  const { hierarchy: institutionHierarchy } = useInstitutionHierarchy();
  const selectedInstitutions = useMemo(() => {
    const result: any[] = [];
    institutionHierarchy.forEach((stateNode: any) => {
      if (stateNode.children) {
        stateNode.children.forEach((inst: any) => {
          if (state.selectedInstitutions.includes(inst.id)) {
            result.push({
              id: inst.id,
              name: inst.name,
              state: stateNode.name,
            });
          }
        });
      }
    });
    return result;
  }, [institutionHierarchy, state.selectedInstitutions]);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 xl:pb-0">
      <StepperProgress currentStep="assuntos" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-8 items-start">
        <div className="xl:col-span-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl dark:shadow-dark-xl p-4 md:p-6 xl:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h1 className="text-xl md:text-2xl xl:text-3xl font-medium text-slate-700 dark:text-slate-200">
                Assuntos
              </h1>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary transition-all duration-200"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Voltar</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-white bg-primary rounded-lg hover:bg-violet-800 transition-transform duration-200 hover:scale-105 shadow-xl hover:shadow-2xl shadow-primary/40"
                >
                  <span>Próximo</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>

            {loadingSubjects ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <SubjectSelector
                subjects={subjects}
                selectedSubjects={state.selectedSubjects}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onToggleSubject={(id) => {
                  toggleSubject(id);
                  setError('');
                }}
              />
            )}

            {error && (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* Desktop: Summary Panel */}
        <div className="hidden xl:block xl:col-span-2">
          <SummaryPanel
            data={{
              listName: state.listName,
              selectedSubjects,
              selectedYears: state.selectedYears,
              selectedInstitutions,
              selectedExamTypes: state.selectedExamTypes || [],
              totalQuestions: questionCount,
            }}
            onEditStep={handleEditStep}
            onRemoveSubject={toggleSubject}
            onRemoveYear={toggleYear}
            onRemoveInstitution={toggleInstitution}
            onClearFilters={clearFilters}
            onUpdateListName={updateListName}
          />
        </div>
      </div>

      {/* Mobile + Tablet: Botão Flutuante */}
      <MobileSummaryButton
        data={{
          listName: state.listName,
          selectedSubjects,
          selectedYears: state.selectedYears,
          selectedInstitutions,
          selectedExamTypes: state.selectedExamTypes || [],
          totalQuestions: questionCount,
        }}
        onEditStep={handleEditStep}
        onRemoveSubject={toggleSubject}
        onRemoveYear={toggleYear}
        onRemoveInstitution={toggleInstitution}
        onClearFilters={clearFilters}
        onUpdateListName={updateListName}
      />
    </div>
  );
}

function AnosStep() {
  const router = useRouter();
  const { state, updateListName, toggleYear, toggleAllYears, toggleSubject, toggleInstitution, clearFilters } = useCreateList();
  const [error, setError] = useState('');

  // Buscar dados reais do banco
  const { years: yearsHierarchy, loading: loadingYears } = useAvailableYears();
  const { hierarchy } = useFilterHierarchy();
  const subjects = useMemo(() => hierarchyToSubjects(hierarchy), [hierarchy]);

  // Contar questões em tempo real
  const { count: questionCount, isFetching: isCountFetching } = useQuestionCount({
    filterIds: [
      ...state.selectedSubjects.filter(id => !id.includes('_')),
      ...(state.selectedExamTypes || [])
    ],
    subFilterIds: state.selectedSubjects.filter(id => id.includes('_')),
    years: state.selectedYears,
    institutions: state.selectedInstitutions,
  });

  const handleNext = () => {
    // Não validar anos - permitir avançar sem selecionar
    setError('');
    router.push('/banco-questoes/criar/instituicoes');
  };

  const handleBack = () => {
    router.push('/banco-questoes/criar/assuntos');
  };

  const handleEditStep = (stepId: string) => {
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  const selectedSubjects = useMemo(() => {
    // Criar um mapa de todos os subjects incluindo filhos (subfiltros)
    const allSubjects = new Map<string, any>();
    subjects.forEach(subject => {
      allSubjects.set(subject.id, subject);
      if (subject.children) {
        subject.children.forEach((child: any) => {
          allSubjects.set(child.id, child);
        });
      }
    });
    
    // Filtrar apenas os selecionados
    return state.selectedSubjects
      .map(id => allSubjects.get(id))
      .filter(Boolean);
  }, [subjects, state.selectedSubjects]);

  const selectedInstitutions = useMemo(() =>
    [] as any[], // TODO: Implementar quando tiver dados de instituições
    []
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-20 xl:pb-0">
      <StepperProgress currentStep="anos" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-8 items-start">
        <div className="xl:col-span-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-dark-xl p-4 md:p-6 xl:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <h1 className="text-xl md:text-2xl xl:text-3xl font-medium text-slate-700 dark:text-slate-200">
                Anos
              </h1>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary transition-all duration-200"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Voltar</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-white bg-primary rounded-lg hover:bg-violet-800 transition-transform duration-200 hover:scale-105 shadow-xl hover:shadow-2xl shadow-primary/40"
                >
                  <span>Próximo</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>

            {loadingYears ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <YearGridSelector
                years={yearsHierarchy}
                selectedYears={state.selectedYears.map(y => {
                  // Se o ano tem decimal (2024.1, 2024.2), precisa adicionar o ano base também
                  const yearStr = y.toString();
                  if (yearStr.includes('.')) {
                    const baseYear = Math.floor(y);
                    return `Ano da Prova_${baseYear}_${yearStr}`;
                  }
                  return `Ano da Prova_${y}`;
                })}
                onToggleYear={(yearId) => {
                  // Extrair o ano do ID (ex: "Ano da Prova_2025" -> 2025 ou "Ano da Prova_2022_2022.1" -> 2022.1)
                  const parts = yearId.split('_');
                  const yearStr = parts[parts.length - 1];
                  // Usar parseFloat para preservar decimais (2022.1, 2022.2)
                  const yearValue = parseFloat(yearStr);
                  if (!isNaN(yearValue)) {
                    toggleYear(yearValue);
                    setError('');
                  }
                }}
                onToggleMultipleYears={(yearIds, shouldSelect) => {
                  // Extrair todos os anos dos IDs
                  const years = yearIds
                    .map(id => {
                      const parts = id.split('_');
                      const yearStr = parts[parts.length - 1];
                      return parseFloat(yearStr);
                    })
                    .filter(y => !isNaN(y));

                  // Adicionar ou remover todos os anos
                  years.forEach(year => {
                    const isSelected = state.selectedYears.includes(year);
                    if (shouldSelect && !isSelected) {
                      toggleYear(year);
                    } else if (!shouldSelect && isSelected) {
                      toggleYear(year);
                    }
                  });
                  setError('');
                }}
              />
            )}

            {error && (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* Desktop: Summary Panel */}
        <div className="hidden xl:block xl:col-span-2">
          <SummaryPanel
            data={{
              listName: state.listName,
              selectedSubjects,
              selectedYears: state.selectedYears,
              selectedInstitutions,
              selectedExamTypes: state.selectedExamTypes || [],
              totalQuestions: questionCount,
            }}
            onEditStep={handleEditStep}
            onRemoveSubject={toggleSubject}
            onRemoveYear={toggleYear}
            onRemoveInstitution={toggleInstitution}
            onClearFilters={clearFilters}
            onUpdateListName={updateListName}
          />
        </div>
      </div>

      {/* Mobile + Tablet: Botão Flutuante */}
      <MobileSummaryButton
        data={{
          listName: state.listName,
          selectedSubjects,
          selectedYears: state.selectedYears,
          selectedInstitutions,
          selectedExamTypes: state.selectedExamTypes || [],
          totalQuestions: questionCount,
        }}
        onEditStep={handleEditStep}
        onRemoveSubject={toggleSubject}
        onRemoveYear={toggleYear}
        onRemoveInstitution={toggleInstitution}
        onClearFilters={clearFilters}
        onUpdateListName={updateListName}
      />
    </div>
  );
}

function InstituicoesStep() {
  const router = useRouter();
  const toast = useToast();
  const { state, cachedQuestions, setCachedQuestions, updateListName, toggleInstitution, toggleExamType, toggleSubject, toggleYear, clearFilters, resetState, updateQuestionLimit } = useCreateList();
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListData, setCreatedListData] = useState<{ id: string; name: string; questionCount: number } | null>(null);

  // Estados para segurar botão
  const [isHoldingIncrement, setIsHoldingIncrement] = useState(false);
  const [isHoldingDecrement, setIsHoldingDecrement] = useState(false);
  const incrementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const decrementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdActivatedRef = useRef(false);

  // Estado para animação de ajuste automático
  const [limitAdjusted, setLimitAdjusted] = useState(false);
  const prevQuestionCountRef = useRef(0);

  // Buscar dados reais do banco
  const { hierarchy } = useFilterHierarchy();
  const subjects = useMemo(() => hierarchyToSubjects(hierarchy), [hierarchy]);
  const { hierarchy: institutionHierarchy } = useInstitutionHierarchy();

  // Contar questões em tempo real - união de tipos de prova + instituições
  const { count: questionCount, isFetching: isCountFetching } = useQuestionCount({
    filterIds: [
      ...state.selectedSubjects.filter(id => !id.includes('_')),
      ...(state.selectedExamTypes || [])
    ],
    subFilterIds: state.selectedSubjects.filter(id => id.includes('_')),
    years: state.selectedYears,
    institutions: state.selectedInstitutions,
  });

  // Ajustar questionLimit automaticamente quando a contagem cair abaixo dele
  useEffect(() => {
    // Só ajustar se:
    // 1. A contagem mudou
    // 2. O limite atual é maior que a nova contagem
    // 3. A contagem não é zero (para evitar resetar quando está carregando)
    if (
      questionCount !== prevQuestionCountRef.current &&
      state.questionLimit > questionCount &&
      questionCount > 0
    ) {
      console.log(`[InstituicoesStep] Ajustando limite de ${state.questionLimit} para ${questionCount}`);
      updateQuestionLimit(questionCount);
      
      // Ativar animação
      setLimitAdjusted(true);
      setTimeout(() => setLimitAdjusted(false), 2000); // Remover após 2s
    }
    
    prevQuestionCountRef.current = questionCount;
  }, [questionCount, state.questionLimit, updateQuestionLimit]);

  // Garantir que os estados de holding sejam resetados se o mouse for solto fora do botão
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsHoldingIncrement(false);
      setIsHoldingDecrement(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // Efeito para incremento contínuo com aceleração progressiva
  useEffect(() => {
    if (isHoldingIncrement) {
      let delay = 40; // Começa com 40ms (2x mais rápido)
      let iterations = 0;

      const accelerate = () => {
        const newValue = Math.min(questionCount, (state.questionLimit || 0) + 1);
        updateQuestionLimit(newValue);

        iterations++;

        // Acelerar progressivamente - reduz o delay
        if (iterations > 5) {
          delay = 20; // Fica mais rápido
        }
        if (iterations > 8) {
          delay = 10; // Ainda mais rápido
        }
        if (iterations > 15) {
          delay = 5; // Super rápido
        }
        if (iterations > 25) {
          delay = 2; // Velocidade máxima (2x mais rápido)
        }

        incrementIntervalRef.current = setTimeout(accelerate, delay);
      };

      // Primeiro incremento após 50ms
      const timeout = setTimeout(() => {
        holdActivatedRef.current = true;
        accelerate();
      }, 50);

      return () => {
        clearTimeout(timeout);
        if (incrementIntervalRef.current) {
          clearTimeout(incrementIntervalRef.current);
        }
      };
    }
  }, [isHoldingIncrement, questionCount, state.questionLimit, updateQuestionLimit]);

  // Efeito para decremento contínuo com aceleração progressiva
  useEffect(() => {
    if (isHoldingDecrement) {
      let delay = 40; // Começa com 40ms (2x mais rápido)
      let iterations = 0;

      const accelerate = () => {
        const newValue = Math.max(0, (state.questionLimit || 0) - 1);
        updateQuestionLimit(newValue);

        iterations++;

        // Acelerar progressivamente - reduz o delay
        if (iterations > 5) {
          delay = 20; // Fica mais rápido
        }
        if (iterations > 8) {
          delay = 10; // Ainda mais rápido
        }
        if (iterations > 15) {
          delay = 5; // Super rápido
        }
        if (iterations > 25) {
          delay = 2; // Velocidade máxima (2x mais rápido)
        }

        decrementIntervalRef.current = setTimeout(accelerate, delay);
      };

      // Primeiro decremento após 50ms
      const timeout = setTimeout(() => {
        holdActivatedRef.current = true;
        accelerate();
      }, 50);

      return () => {
        clearTimeout(timeout);
        if (decrementIntervalRef.current) {
          clearTimeout(decrementIntervalRef.current);
        }
      };
    }
  }, [isHoldingDecrement, state.questionLimit, updateQuestionLimit]);

  // Converter hierarquia de instituições para formato do componente
  const institutions = useMemo(() => {
    const result: any[] = [];
    institutionHierarchy.forEach((state: any) => {
      if (state.children) {
        state.children.forEach((inst: any) => {
          result.push({
            id: inst.id,
            name: inst.name,
            state: state.name,
            acronym: state.name, // Usar sigla do estado como acronym
          });
        });
      }
    });
    return result;
  }, [institutionHierarchy]);

  // Função para ordenar questões (mesma lógica do QuestionPreviewModal)
  const sortQuestions = (questions: any[]) => {
    return questions.sort((a: any, b: any) => {
      // Extrair ano dos sub_filter_ids (não das tags)
      const getYear = (subFilterIds?: string[]) => {
        const yearSubFilterId = subFilterIds?.find(id => id.startsWith('Ano da Prova_'));
        if (yearSubFilterId) {
          const parts = yearSubFilterId.split('_');
          // parts = ["Ano da Prova", "2026"] ou ["Ano da Prova", "2026", "2026.1"]
          const yearStr = parts[parts.length - 1]; // Pegar o último elemento
          return parseInt(yearStr) || 0;
        }
        return 0;
      };

      // Extrair instituição dos sub_filter_ids (qualquer instituição, não apenas selecionadas)
      const getInstitution = (subFilterIds?: string[]) => {
        const institutionId = subFilterIds?.find(id => id.startsWith('Universidade_'));
        return institutionId || '';
      };

      const yearA = getYear(a.sub_filter_ids);
      const yearB = getYear(b.sub_filter_ids);

      // Primeiro por ano (decrescente - mais recente primeiro)
      if (yearA !== yearB) {
        return yearB - yearA;
      }

      // Depois por universidade (alfabética)
      const instA = getInstitution(a.sub_filter_ids);
      const instB = getInstitution(b.sub_filter_ids);

      if (instA !== instB) {
        return instA.localeCompare(instB);
      }

      // Dentro da mesma universidade e ano, manter ordem original
      return 0;
    });
  };

  const handleFinish = async () => {
    // Validação 1: Nome obrigatório
    if (!state.listName || state.listName.trim() === '') {
      setError('Por favor, dê um nome para a lista antes de salvar');
      toast.warning('Nome obrigatório', 'Volte ao primeiro passo e dê um nome para a lista');
      router.push('/banco-questoes/criar/geral');
      return;
    }

    // Validação 2: Limite de questões
    if (state.questionLimit === 0) {
      setError('Por favor, defina a quantidade de questões desejada (mínimo 1)');
      toast.warning('Quantidade obrigatória', 'Defina quantas questões você deseja na lista');
      // Scroll para o campo de quantidade
      setTimeout(() => {
        const quantityInput = document.getElementById('question-limit');
        if (quantityInput) {
          quantityInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quantityInput.focus();
        }
      }, 100);
      return;
    }

    if (state.questionLimit > 500) {
      setError('O limite máximo é de 500 questões por lista. Que tal delimitar mais a sua busca removendo alguma universidade, ano de prova ou assunto? Você pode criar outra lista para as questões restantes!');
      toast.warning('Limite excedido', 'O máximo é 500 questões por lista');
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      // 1. Usar questões do cache se disponíveis, senão buscar
      let questions = cachedQuestions;

      if (!questions || questions.length === 0) {
        const searchResponse = await api.post('/banco-questoes/questions/search', {
          filterIds: [
            ...state.selectedSubjects.filter(id => !id.includes('_')),
            ...(state.selectedExamTypes || [])
          ],
          subFilterIds: state.selectedSubjects.filter(id => id.includes('_')),
          years: state.selectedYears,
          institutions: state.selectedInstitutions,
          limit: 10000,
        });

        const fetchedQuestions = searchResponse.data.data?.questions || [];
        
        // Ordenar questões (mesma lógica do preview)
        questions = sortQuestions(fetchedQuestions);
      }

      if (!questions || questions.length === 0) {
        setError('Nenhuma questão encontrada com os filtros selecionados');
        toast.error('Nenhuma questão encontrada', 'Tente ajustar os filtros selecionados');
        setIsCreating(false);
        return;
      }

      // Limitar questões ao número especificado (já ordenadas)
      const limitedQuestions = questions.slice(0, state.questionLimit);

      // 2. Criar a lista no backend
      const createListResponse = await api.post('/question-lists', {
        name: state.listName,
        title: state.listName,
        description: `Lista criada com ${limitedQuestions.length} questões`,
        folder_id: state.folderId || null,
        is_public: false,
        tags: [],
        status: 'active',
        question_count: limitedQuestions.length,
        questions: limitedQuestions.map((q: any) => q.id), // Array de IDs das questões
      });

      const listData = createListResponse.data;

      // Mostrar toast de sucesso
      toast.success('Lista criada!', `${limitedQuestions.length} questões adicionadas com sucesso`);

      // Preparar dados para o modal
      const listId = listData.id || listData.data?.id || listData.list_id;
      
      setCreatedListData({
        id: listId,
        name: state.listName,
        questionCount: limitedQuestions.length,
      });

      // Mostrar modal de sucesso
      setShowSuccessModal(true);

      // Resetar estado
      resetState();
      setIsCreating(false);
    } catch (err: any) {
      console.error('Erro ao criar lista:', err);
      setError(err.message || 'Erro ao criar lista. Tente novamente.');
      toast.error('Erro ao criar lista', err.message || 'Tente novamente');
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.push('/banco-questoes/criar/anos');
  };

  const handleEditStep = (stepId: string) => {
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  const selectedSubjects = useMemo(() => {
    // Criar um mapa de todos os subjects incluindo filhos (subfiltros)
    const allSubjects = new Map<string, any>();
    subjects.forEach(subject => {
      allSubjects.set(subject.id, subject);
      if (subject.children) {
        subject.children.forEach((child: any) => {
          allSubjects.set(child.id, child);
        });
      }
    });
    
    // Filtrar apenas os selecionados
    return state.selectedSubjects
      .map(id => allSubjects.get(id))
      .filter(Boolean);
  }, [subjects, state.selectedSubjects]);

  const selectedInstitutions = useMemo(() =>
    institutions.filter((i: any) => state.selectedInstitutions.includes(i.id)),
    [institutions, state.selectedInstitutions]
  );

  return (
    <>
      <div className="space-y-4 md:space-y-6 pb-20 xl:pb-0">
        <StepperProgress currentStep="instituicoes" />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-8 items-start">
          <div className="xl:col-span-3">
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-dark-xl p-4 md:p-6 xl:p-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
                <h1 className="text-xl md:text-2xl xl:text-3xl font-medium text-slate-700 dark:text-slate-200">
                  Instituições
                </h1>
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary transition-all duration-200"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Voltar</span>
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={isCreating}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-semibold text-white bg-primary rounded-lg hover:bg-violet-800 transition-transform duration-200 hover:scale-105 shadow-xl hover:shadow-2xl shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <span>Criando...</span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Finalizar Lista</span>
                        <span className="sm:hidden">Finalizar</span>
                        <span className="material-symbols-outlined">done_all</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Campo de Quantidade - Movido para cima com destaque */}
              <div className={`mb-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border-2 shadow-lg transition-all duration-500 ${
                limitAdjusted 
                  ? 'border-amber-500 shadow-amber-500/50 animate-pulse' 
                  : 'border-primary/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      limitAdjusted 
                        ? 'bg-amber-500/30 scale-110' 
                        : 'bg-primary/20'
                    }`}>
                      <span className={`material-symbols-outlined text-xl transition-colors duration-500 ${
                        limitAdjusted 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : 'text-primary'
                      }`}>
                        {limitAdjusted ? 'sync' : 'format_list_numbered'}
                      </span>
                    </div>
                    <div>
                      <label htmlFor="question-limit" className="text-base font-semibold text-slate-800 dark:text-slate-100 block">
                        Quantidade de Questões
                        {limitAdjusted && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal animate-pulse">
                            (ajustado automaticamente)
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-1.5">
                        {questionCount > 0
                          ? `${questionCount} disponíveis (máx: ${Math.min(questionCount, 500)})`
                          : 'Selecione filtros para ver questões disponíveis'}
                        {isCountFetching && (
                          <span className="material-symbols-outlined text-sm text-primary animate-spin">
                            sync
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!holdActivatedRef.current) {
                        const newValue = Math.max(0, (state.questionLimit || 0) - 1);
                        updateQuestionLimit(newValue);
                        setError('');
                      }
                    }}
                    onMouseDown={() => {
                      holdActivatedRef.current = false;
                      setIsHoldingDecrement(true);
                    }}
                    onMouseUp={() => setIsHoldingDecrement(false)}
                    onMouseLeave={() => setIsHoldingDecrement(false)}
                    onTouchStart={() => {
                      holdActivatedRef.current = false;
                      setIsHoldingDecrement(true);
                    }}
                    onTouchEnd={() => setIsHoldingDecrement(false)}
                    disabled={(state.questionLimit ?? 0) <= 0}
                    className="flex-shrink-0 w-14 h-14 flex items-center justify-center
                             bg-white dark:bg-slate-800 border-2 border-primary/30 dark:border-primary/40
                             rounded-xl hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10
                             transition-all duration-200 hover:scale-110 shadow-md hover:shadow-xl
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-primary/30
                             group"
                  >
                    <span className="material-symbols-outlined text-2xl text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                      remove
                    </span>
                  </button>
                  <input
                    id="question-limit"
                    type="number"
                    min="0"
                    max={questionCount}
                    value={state.questionLimit || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateQuestionLimit(value);
                      setError('');
                    }}
                    className={`flex-1 px-6 py-4 bg-white dark:bg-slate-800 border-2 rounded-xl text-center text-2xl font-bold
                             focus:ring-2 focus:ring-primary focus:border-primary shadow-md hover:shadow-lg transition-all duration-500
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                               limitAdjusted
                                 ? 'border-amber-500 text-amber-600 dark:text-amber-400 scale-105'
                                 : 'border-primary/30 dark:border-primary/40 text-slate-800 dark:text-slate-100'
                             }`}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!holdActivatedRef.current) {
                        const newValue = Math.min(questionCount, (state.questionLimit || 0) + 1);
                        updateQuestionLimit(newValue);
                        setError('');
                      }
                    }}
                    onMouseDown={() => {
                      holdActivatedRef.current = false;
                      setIsHoldingIncrement(true);
                    }}
                    onMouseUp={() => setIsHoldingIncrement(false)}
                    onMouseLeave={() => setIsHoldingIncrement(false)}
                    onTouchStart={() => {
                      holdActivatedRef.current = false;
                      setIsHoldingIncrement(true);
                    }}
                    onTouchEnd={() => setIsHoldingIncrement(false)}
                    disabled={questionCount <= 0 || (state.questionLimit ?? 0) >= questionCount}
                    className="flex-shrink-0 w-14 h-14 flex items-center justify-center
                             bg-white dark:bg-slate-800 border-2 border-primary/30 dark:border-primary/40
                             rounded-xl hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10
                             transition-all duration-200 hover:scale-110 shadow-md hover:shadow-xl
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-primary/30
                             group"
                  >
                    <span className="material-symbols-outlined text-2xl text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                      add
                    </span>
                  </button>
                </div>
                {questionCount > 0 && state.questionLimit > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary font-medium">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{state.questionLimit} de {questionCount} questões selecionadas</span>
                  </div>
                )}
              </div>

              <ExamTypeSelector
                selectedExamTypes={state.selectedExamTypes || []}
                onToggleExamType={toggleExamType}
              />

              <InstitutionSelector
                institutions={institutions}
                selectedInstitutions={state.selectedInstitutions}
                onToggleInstitution={(id) => {
                  toggleInstitution(id);
                  setError('');
                }}
              />

              {error && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>

          {/* Desktop: Summary Panel */}
          <div className="hidden xl:block xl:col-span-2">
            <SummaryPanel
              data={{
                listName: state.listName,
                selectedSubjects,
                selectedYears: state.selectedYears,
                selectedInstitutions,
                selectedExamTypes: state.selectedExamTypes || [],
                totalQuestions: questionCount,
              }}
              onEditStep={handleEditStep}
              onRemoveSubject={toggleSubject}
              onRemoveYear={toggleYear}
              onRemoveInstitution={toggleInstitution}
              onClearFilters={clearFilters}
              onPreviewQuestions={() => setShowPreview(true)}
              onUpdateListName={updateListName}
            />
          </div>
        </div>

        {/* Mobile + Tablet: Botão Flutuante */}
        <MobileSummaryButton
          data={{
            listName: state.listName,
            selectedSubjects,
            selectedYears: state.selectedYears,
            selectedInstitutions,
            selectedExamTypes: state.selectedExamTypes || [],
            totalQuestions: questionCount,
          }}
          onEditStep={handleEditStep}
          onRemoveSubject={toggleSubject}
          onRemoveYear={toggleYear}
          onRemoveInstitution={toggleInstitution}
          onClearFilters={clearFilters}
          onPreviewQuestions={() => setShowPreview(true)}
          onUpdateListName={updateListName}
        />
      </div>

      <QuestionPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        filterIds={[
          ...state.selectedSubjects.filter(id => !id.includes('_')),
          ...(state.selectedExamTypes || [])
        ]}
        subFilterIds={state.selectedSubjects.filter(id => id.includes('_'))}
        years={state.selectedYears}
        institutions={state.selectedInstitutions}
        onQuestionsLoaded={setCachedQuestions}
      />

      <ListCreatedSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        listId={createdListData?.id || ''}
        listName={createdListData?.name || ''}
        questionCount={createdListData?.questionCount || 0}
      />
    </>
  );
}
