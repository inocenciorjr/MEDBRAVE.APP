'use client';

import { useState, useEffect, useRef } from 'react';
import { Question } from '@/types/resolucao-questoes';
import SimpleRichTextEditor from './SimpleRichTextEditor';
import { errorNotebookService, ErrorNotebookEntry } from '@/services/errorNotebookService';
import { useToast } from '@/lib/contexts/ToastContext';
import ErrorNotebookFolderSelector from './ErrorNotebookFolderSelector';
import { ImageModal } from '@/components/resolucao-questoes/modals/ImageModal';
import { getSubFiltersMap } from '@/lib/services/filterService';

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string | null;
  level: number;
}

interface AddToErrorNotebookModalProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userSelectedAnswer?: string;
  existingEntry?: ErrorNotebookEntry;
  focusedAlternativeId?: string;
}

export function AddToErrorNotebookModal({
  question,
  isOpen,
  onClose,
  onSuccess,
  userSelectedAnswer,
  existingEntry,
  focusedAlternativeId,
}: AddToErrorNotebookModalProps) {
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Form state
  const [keyConcept, setKeyConcept] = useState(existingEntry?.user_note || '');
  const [whyWrong, setWhyWrong] = useState(existingEntry?.user_explanation || '');
  const [alternativeComments, setAlternativeComments] = useState<Record<string, string>>(existingEntry?.alternative_comments || {});
  const [showCommentForAlternative, setShowCommentForAlternative] = useState<Record<string, boolean>>(
    focusedAlternativeId ? { [focusedAlternativeId]: true } : {}
  );
  const [selectedFolder, setSelectedFolder] = useState<string | null>(existingEntry?.folder_id || null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [subFiltersMap, setSubFiltersMap] = useState<Map<string, SubFilter>>(new Map());
  
  const isEditMode = !!existingEntry;

  // Carregar mapa de subfiltros
  useEffect(() => {
    async function loadFilters() {
      try {
        const map = await getSubFiltersMap();
        setSubFiltersMap(map);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      }
    }
    loadFilters();
  }, []);

  // Extrair instituição dos sub_filter_ids (mesma lógica do QuestionHeader)
  const getInstitution = () => {
    const institutionId = question.sub_filter_ids?.find((id: string) => 
      id.startsWith('Universidade_') || id.startsWith('Residencia_')
    );
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || question.institution || 'N/A';
    }
    return question.institution || 'N/A';
  };

  const getYear = () => {
    const yearId = question.sub_filter_ids?.find((id: string) => /^\d{4}$/.test(id.split('_').pop() || ''));
    if (yearId) {
      const parts = yearId.split('_');
      return parts[parts.length - 1];
    }
    return question.year?.toString() || 'N/A';
  };

  // Pegar áreas (filtros raiz de especialidades) - pode ter múltiplos
  const getAreas = () => {
    if (!question.sub_filter_ids || question.sub_filter_ids.length === 0) {
      return 'N/A';
    }

    // Filtrar apenas IDs de especialidades (não ano, universidade, residência)
    const specialtyIds = question.sub_filter_ids.filter((id: string) => 
      !id.startsWith('Ano da Prova_') && 
      !id.startsWith('Universidade_') &&
      !id.startsWith('Residencia_')
    );
    
    // Extrair os rootIds únicos (primeira parte antes do underscore)
    const rootIds = new Set<string>();
    specialtyIds.forEach(id => {
      const rootId = id.split('_')[0];
      rootIds.add(rootId);
    });
    
    if (rootIds.size > 0) {
      const names = Array.from(rootIds)
        .map(id => {
          const subFilter = subFiltersMap.get(id);
          return subFilter?.name;
        })
        .filter(Boolean) as string[];
      
      return names.length > 0 ? names.join(', ') : 'N/A';
    }
    
    return 'N/A';
  };

  // Pegar assuntos (subfiltros mais profundos)
  const getSubjects = () => {
    const specialtyIds = question.sub_filter_ids?.filter((id: string) => 
      !id.startsWith('Ano da Prova_') && 
      !id.startsWith('Universidade_') &&
      !id.startsWith('Residencia_')
    ) || [];
    
    if (specialtyIds.length > 0) {
      // Agrupar por filtro raiz
      const pathsByRoot = new Map<string, string[]>();
      
      specialtyIds.forEach(id => {
        const rootId = id.split('_')[0];
        if (!pathsByRoot.has(rootId)) {
          pathsByRoot.set(rootId, []);
        }
        pathsByRoot.get(rootId)!.push(id);
      });
      
      // Pegar o subfiltro mais profundo de cada grupo
      const deepestSubjects: string[] = [];
      
      pathsByRoot.forEach((ids) => {
        const sortedIds = ids.sort((a, b) => {
          const depthA = (a.match(/_/g) || []).length;
          const depthB = (b.match(/_/g) || []).length;
          return depthB - depthA;
        });
        
        const deepestId = sortedIds[0];
        const subFilter = subFiltersMap.get(deepestId);
        if (subFilter) {
          deepestSubjects.push(subFilter.name);
        }
      });
      
      return deepestSubjects.length > 0 ? deepestSubjects.join(', ') : 'N/A';
    }
    return question.topic || 'N/A';
  };

  // Função para adicionar event listeners em imagens
  const setupImageListeners = (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.style.transition = 'transform 0.2s';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1rem auto';
      img.style.borderRadius = '0.5rem';
      img.style.border = '2px solid #e5e7eb';

      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.02)';
      });

      img.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
      });

      img.addEventListener('click', () => {
        setSelectedImage(img.src);
      });
    });
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
      
      // Initialize form with existing data or empty
      setKeyConcept(existingEntry?.user_note || '');
      setWhyWrong(existingEntry?.user_explanation || '');
      setAlternativeComments(existingEntry?.alternative_comments || {});
      setShowCommentForAlternative(focusedAlternativeId ? { [focusedAlternativeId]: true } : {});
      setSelectedFolder(existingEntry?.folder_id || null);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        // Reset form
        setKeyConcept('');
        setWhyWrong('');
        setAlternativeComments({});
        setShowCommentForAlternative({});
        setShowFolderSelector(false);
        setSelectedFolder(null);
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, existingEntry, focusedAlternativeId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isSaving]);

  const handleSaveClick = () => {
    // Validação
    if (!keyConcept.trim()) {
      toast.error('Por favor, descreva o conceito chave da questão');
      return;
    }

    if (!whyWrong.trim()) {
      toast.error('Por favor, explique por que você errou a questão');
      return;
    }

    // Se está editando, salvar direto sem mostrar seletor de pasta
    if (isEditMode) {
      handleConfirmSave();
    } else {
      // Mostrar seletor de pasta apenas no modo adicionar
      setShowFolderSelector(true);
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);

    try {
      if (isEditMode) {
        // Filtrar comentários vazios (apenas <p></p> ou whitespace)
        const filteredComments: Record<string, string> = {};
        Object.entries(alternativeComments).forEach(([key, value]) => {
          const cleanValue = value.replace(/<[^>]*>/g, '').trim();
          if (cleanValue) {
            filteredComments[key] = value;
          }
        });
        
        // Modo edição - sempre enviar alternative_comments (mesmo que vazio) para permitir remoção
        const payload = {
          user_note: keyConcept,
          user_explanation: whyWrong,
          alternative_comments: filteredComments,
        };
        console.log('[Modal] Payload sendo enviado:', payload);
        const updatedEntry = await errorNotebookService.updateEntry(existingEntry.id, payload);
        console.log('[Modal] Entry retornada do backend:', updatedEntry);
        toast.success('Caderno atualizado com sucesso!');
      } else {
        // Filtrar comentários vazios (apenas <p></p> ou whitespace)
        const filteredComments: Record<string, string> = {};
        Object.entries(alternativeComments).forEach(([key, value]) => {
          const cleanValue = value.replace(/<[^>]*>/g, '').trim();
          if (cleanValue) {
            filteredComments[key] = value;
          }
        });
        
        // Modo adicionar
        await errorNotebookService.createEntry({
          question_id: question.id,
          user_note: keyConcept,
          user_explanation: whyWrong,
          key_points: [],
          tags: [question.subject, question.topic],
          difficulty: 'MEDIUM',
          confidence: 3,
          alternative_comments: Object.keys(filteredComments).length > 0 ? filteredComments : undefined,
          folder_id: selectedFolder || undefined,
        });
        toast.success('Questão adicionada ao caderno de erros!');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar caderno de erros:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar caderno de erros');
    } finally {
      setIsSaving(false);
    }
  };

  if (!shouldRender) return null;

  const correctAlternative = question.alternatives.find(alt => alt.id === question.correctAlternative);
  


  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={!isSaving ? onClose : undefined}
      />

      {/* Modal - Slide from right */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-surface-light dark:bg-surface-dark 
                   shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary font-display">
                {isEditMode ? 'Editar Caderno de Erros' : 'Adicionar ao Caderno de Erros'}
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 font-inter">
                {isEditMode ? 'Atualize suas anotações sobre esta questão' : 'Registre seus erros para revisar depois'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-lg 
                       transition-all duration-200 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Fechar"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                             group-hover:text-primary transition-colors text-2xl">
                close
              </span>
            </button>
          </div>

          {/* Content */}
          <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 space-y-6 font-inter">
            <div className="space-y-3">
              <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                            rounded-lg border border-primary/20 dark:border-primary/30 space-y-4
                            shadow-sm hover:shadow-md dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-200">

                {/* Instituição e Ano em chips */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      school
                    </span>
                    <span className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                      {getInstitution()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      calendar_today
                    </span>
                    <span className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                      {getYear()}
                    </span>
                  </div>
                </div>

                {/* Áreas e Assuntos em chips */}
                <div className="space-y-2.5">
                  {/* Áreas */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Área:</span>
                    {(() => {
                      const areas = getAreas();
                      if (areas && areas !== 'N/A') {
                        const areaList = areas.split(', ');
                        return areaList.map((area, index) => (
                          <span
                            key={index}
                            className="px-2.5 py-1 text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary rounded border border-primary/20"
                          >
                            {area}
                          </span>
                        ));
                      }
                      return <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary opacity-60">N/A</span>;
                    })()}
                  </div>

                  {/* Assuntos */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Assunto:</span>
                    {(() => {
                      const subjects = getSubjects();
                      if (subjects && subjects !== 'N/A') {
                        const subjectList = subjects.split(', ');
                        return subjectList.map((subject, index) => (
                          <span
                            key={index}
                            className="px-2.5 py-1 text-xs font-medium bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary rounded border border-border-light dark:border-border-dark"
                          >
                            {subject}
                          </span>
                        ));
                      }
                      return <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary opacity-60">N/A</span>;
                    })()}
                  </div>
                </div>

                {/* Enunciado */}
                <div>
                  <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-2">
                    Enunciado
                  </h4>
                  <div
                    ref={(el) => {
                      if (el) {
                        setupImageListeners(el);
                      }
                    }}
                    className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                    dangerouslySetInnerHTML={{ __html: question.text || '' }}
                  />
                </div>

                {/* Alternativas */}
                <div>
                  <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-2">
                    Alternativas
                  </h4>
                  <div className="space-y-3">
                    {question.alternatives.map((alt, index) => {
                      const isCorrect = alt.id === question.correctAlternative;
                      const isUserAnswer = alt.id === userSelectedAnswer;
                      const showComment = showCommentForAlternative[alt.id];
                      const letter = alt.letter || String.fromCharCode(65 + index);

                      return (
                        <div key={alt.id} className="space-y-2">
                          <div
                            className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-default
                                      hover:shadow-md dark:hover:shadow-dark-md hover:scale-[1.01] ${isCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : isUserAnswer
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                  : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                                {letter})
                              </span>
                              <div
                                ref={(el) => {
                                  if (el) {
                                    setupImageListeners(el);
                                  }
                                }}
                                className="flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary"
                                dangerouslySetInnerHTML={{ __html: alt.text || '' }}
                              />
                              <div className="flex items-center gap-2">
                                {isCorrect && (
                                  <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                                    check_circle
                                  </span>
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                                    cancel
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowCommentForAlternative(prev => ({
                                    ...prev,
                                    [alt.id]: !prev[alt.id]
                                  }))}
                                  className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${showComment
                                    ? 'bg-primary text-white'
                                    : alternativeComments[alt.id]
                                    ? 'bg-primary/20 dark:bg-primary/30 text-primary'
                                    : 'hover:bg-primary/10 dark:hover:bg-primary/20 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                                    }`}
                                  title={showComment ? 'Ocultar comentário' : alternativeComments[alt.id] ? 'Editar comentário' : 'Adicionar comentário'}
                                >
                                  <span className="material-symbols-outlined text-base">
                                    {showComment ? 'edit_note' : alternativeComments[alt.id] ? 'edit' : 'add_comment'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Editor de comentário */}
                          {showComment && (
                            <div className="ml-8 space-y-2 animate-in fade-in duration-300">
                              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary pl-1">
                                Por que essa alternativa está {isCorrect ? 'correta' : 'errada'}?
                              </label>
                              <div className="transition-all duration-200 hover:scale-[1.01]">
                                <SimpleRichTextEditor
                                  value={alternativeComments[alt.id] || ''}
                                  onChange={(value) => setAlternativeComments(prev => ({
                                    ...prev,
                                    [alt.id]: value
                                  }))}
                                  placeholder={`Explique por que a alternativa ${letter} está ${isCorrect ? 'correta' : 'errada'}...`}
                                  height="100px"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Anotações */}
            <div className="space-y-6">
              {/* Conceito Chave */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Qual o conceito chave da questão? *
                </label>
                <div className="transition-all duration-200 hover:scale-[1.01]">
                  <SimpleRichTextEditor
                    value={keyConcept}
                    onChange={setKeyConcept}
                    placeholder="Ex: Diferença entre hipertensão primária e secundária..."
                    height="120px"
                  />
                </div>
              </div>

              {/* Por que errei */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Por que eu errei a questão? *
                </label>
                <div className="transition-all duration-200 hover:scale-[1.01]">
                  <SimpleRichTextEditor
                    value={whyWrong}
                    onChange={setWhyWrong}
                    placeholder="Ex: Confundi os critérios diagnósticos, não lembrei da classificação..."
                    height="150px"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border-light dark:border-border-dark p-6 bg-background-light dark:bg-background-dark">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg border-2 border-border-light dark:border-border-dark 
                         text-text-light-primary dark:text-text-dark-primary 
                         hover:bg-surface-light dark:hover:bg-surface-dark hover:border-primary/50
                         transition-all duration-200 hover:scale-105 active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         font-semibold shadow-md hover:shadow-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg bg-primary text-white 
                         hover:bg-primary/90 transition-all duration-200 
                         hover:scale-105 active:scale-95 hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         flex items-center gap-2 font-semibold shadow-lg"
              >
                <span className="material-symbols-outlined text-lg">{isEditMode ? 'check' : 'save'}</span>
                {isEditMode ? 'Salvar Alterações' : 'Salvar no Caderno'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Pasta - apenas no modo adicionar */}
      {showFolderSelector && !isEditMode && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10001]"
            onClick={() => !isSaving && setShowFolderSelector(false)}
          />
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Salvar em qual pasta?
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  Escolha uma pasta para organizar seu caderno de erros
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <ErrorNotebookFolderSelector
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowFolderSelector(false)}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-lg border-2 border-border-light dark:border-border-dark 
                             text-text-light-primary dark:text-text-dark-primary 
                             hover:bg-surface-light dark:hover:bg-surface-dark hover:border-primary/50
                             transition-all duration-200 hover:scale-105 active:scale-95
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             font-semibold shadow-md hover:shadow-lg"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-lg bg-primary text-white 
                             hover:bg-primary/90 transition-all duration-200 
                             hover:scale-105 active:scale-95 hover:shadow-xl
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                             flex items-center gap-2 font-semibold shadow-lg"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">check</span>
                        Confirmar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        zIndex={10003}
      />
    </>
  );
}
