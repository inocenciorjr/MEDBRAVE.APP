'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Subject, Institution } from '@/types/banco-questoes';

interface SummaryData {
  listName: string;
  selectedSubjects: Subject[];
  selectedYears: number[];
  selectedInstitutions: Institution[];
  selectedExamTypes?: string[];
  totalQuestions: number;
}

interface SummaryPanelProps {
  data: SummaryData;
  onEditStep: (step: string) => void;
  onRemoveSubject?: (subjectId: string) => void;
  onRemoveYear?: (year: number) => void;
  onRemoveInstitution?: (institutionId: string) => void;
  onClearFilters?: () => void;
  onPreviewQuestions?: () => void;
}

export default function SummaryPanel({ 
  data, 
  onEditStep,
  onRemoveSubject,
  onRemoveYear,
  onRemoveInstitution,
  onClearFilters,
  onPreviewQuestions,
}: SummaryPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showInfoModal) {
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
  }, [showInfoModal]);

  // Safety checks
  const selectedSubjects = data?.selectedSubjects || [];
  const selectedYears = data?.selectedYears || [];
  const selectedInstitutions = data?.selectedInstitutions || [];
  const selectedExamTypes = data?.selectedExamTypes || [];
  const totalQuestions = data?.totalQuestions || 0;
  const listName = data?.listName || '';

  const hasFilters = selectedSubjects.length > 0 || selectedYears.length > 0 || selectedInstitutions.length > 0 || selectedExamTypes.length > 0;

  // Não renderizar até estar montado no cliente
  if (!mounted) {
    return (
      <div className="lg:sticky lg:top-8">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-dark-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Resumo
            </h2>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 mb-6 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-primary">
              quiz
            </span>
            <div className="flex-1">
              <p className="text-sm text-primary dark:text-violet-300 font-semibold">
                Questões encontradas
              </p>
              <p className="text-3xl font-bold text-primary dark:text-white">
                0
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-8">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-dark-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Resumo
          </h2>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className={`text-sm font-medium transition-colors ${
                hasFilters 
                  ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Questions Counter */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 mb-6 shadow-sm">
          <span className="material-symbols-outlined text-4xl text-primary">
            quiz
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-primary dark:text-violet-300 font-semibold">
                Questões encontradas
              </p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                aria-label="Como funciona a contagem de questões"
              >
                <span className="material-symbols-outlined text-sm">help</span>
              </button>
            </div>
            <p className="text-3xl font-bold text-primary dark:text-white">
              {totalQuestions.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Preview Button */}
        {totalQuestions > 0 && onPreviewQuestions && (
          <button
            onClick={onPreviewQuestions}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-6 rounded-lg bg-primary text-white hover:bg-violet-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span className="material-symbols-outlined">visibility</span>
            <span className="font-semibold">Visualizar Questões</span>
          </button>
        )}

        {/* Summary Sections */}
        <div className="space-y-5">
          {/* Nome da Lista */}
          <div className="border-b border-border-light dark:border-border-dark pb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-white">
                Nome da Lista
              </h3>
              <button
                onClick={() => onEditStep('geral')}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {listName ? (
                <div className="bg-background-light dark:bg-background-dark py-1 px-2.5 rounded shadow-sm">
                  <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                    {listName}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Sem nome
                </span>
              )}
            </div>
          </div>

          {/* Assuntos Selecionados */}
          <div className="border-b border-border-light dark:border-border-dark pb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-white">
                Assuntos ({selectedSubjects.length})
              </h3>
              <button
                onClick={() => onEditStep('assuntos')}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.length === 0 ? (
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhum assunto selecionado
                </span>
              ) : (
                selectedSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center gap-1.5 bg-background-light dark:bg-background-dark py-1 px-2.5 rounded shadow-sm"
                  >
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {subject.name}
                    </span>
                    {onRemoveSubject && (
                      <button
                        onClick={() => onRemoveSubject(subject.id)}
                        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Anos Selecionados */}
          <div className="border-b border-border-light dark:border-border-dark pb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-white">
                Anos ({selectedYears.length})
              </h3>
              <button
                onClick={() => onEditStep('anos')}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedYears.length === 0 ? (
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhum ano selecionado
                </span>
              ) : (
                [...selectedYears].sort((a, b) => b - a).map((year) => (
                  <div
                    key={year}
                    className="flex items-center gap-1.5 bg-background-light dark:bg-background-dark py-1 px-2.5 rounded shadow-sm"
                  >
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {year}
                    </span>
                    {onRemoveYear && (
                      <button
                        onClick={() => onRemoveYear(year)}
                        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tipos de Prova Selecionados */}
          {selectedExamTypes.length > 0 && (
            <div className="border-b border-border-light dark:border-border-dark pb-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-text-light-primary dark:text-white">
                  Tipos de Prova ({selectedExamTypes.length})
                </h3>
                <button
                  onClick={() => onEditStep('instituicoes')}
                  className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedExamTypes.map((examType) => (
                  <div
                    key={examType}
                    className="flex items-center gap-1.5 bg-background-light dark:bg-background-dark py-1 px-2.5 rounded shadow-sm"
                  >
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {examType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instituições Selecionadas */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-white">
                Instituições ({selectedInstitutions.length})
              </h3>
              <button
                onClick={() => onEditStep('instituicoes')}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedInstitutions.length === 0 ? (
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhuma instituição selecionada
                </span>
              ) : (
                selectedInstitutions.map((institution) => (
                  <div
                    key={institution.id}
                    className="flex items-center gap-1.5 bg-background-light dark:bg-background-dark py-1 px-2.5 rounded shadow-sm"
                  >
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {institution.name}
                    </span>
                    {onRemoveInstitution && (
                      <button
                        onClick={() => onRemoveInstitution(institution.id)}
                        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Informativo */}
      {shouldRender && typeof window !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ zIndex: 99999 }}
            onClick={() => setShowInfoModal(false)}
          />

          {/* Modal */}
          <div
            className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-surface-light dark:bg-surface-dark 
                       shadow-2xl dark:shadow-dark-2xl transform transition-transform duration-300 ease-out ${
              isAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ zIndex: 100000 }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    Como funciona a contagem de questões?
                  </h2>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    Entenda como os filtros afetam o número de questões
                  </p>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                           transition-all duration-200 hover:scale-110 group"
                >
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                 group-hover:text-primary transition-colors">
                    close
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-text-light-secondary dark:text-text-dark-secondary">
              <p>
                O sistema conta as questões de acordo com os filtros que você seleciona em cada etapa. 
                A lógica funciona da seguinte forma:
              </p>

              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                    1. Assuntos (Step 2)
                  </p>
                  <p className="text-sm">
                    Quando você seleciona assuntos como <strong>Cardiologia</strong> e <strong>Trauma</strong>, 
                    o sistema busca todas as questões que tenham pelo menos um desses assuntos. 
                    Se Cardiologia tem 5 questões e Trauma tem 2, você verá 7 questões.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                    2. Anos (Step 3)
                  </p>
                  <p className="text-sm">
                    Ao adicionar anos como <strong>2025</strong> e <strong>2024</strong>, 
                    o sistema filtra as questões anteriores para mostrar apenas as desses anos. 
                    Das 7 questões, se 5 forem de 2025 ou 2024, você verá 5 questões.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                    3. Instituições e Tipos de Prova (Step 4)
                  </p>
                  <p className="text-sm">
                    Aqui funciona de forma especial: os tipos de prova (Revalida, R3, etc.) e as universidades 
                    são somados entre si. Se você selecionar <strong>Revalida</strong> e <strong>USP</strong>, 
                    o sistema filtra as questões anteriores para mostrar apenas as que sejam do Revalida OU da USP.
                  </p>
                </div>
              </div>

              <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4">
                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Exemplo completo:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Seleciona <strong>Cardiologia + Trauma</strong> → 7 questões</li>
                  <li>Adiciona <strong>2025 + 2024</strong> → 5 questões (filtra as 7)</li>
                  <li>Adiciona <strong>Revalida + Residência Médica</strong> → 4 questões (filtra as 5)</li>
                  <li>Adiciona <strong>SUS-SP</strong> → 5 questões (soma com as 4)</li>
                </ul>
              </div>

                <p className="text-sm">
                  <strong>Resumo:</strong> Quanto mais assuntos e anos você seleciona, mais questões aparecem. 
                  Mas ao adicionar tipos de prova e universidades, você filtra essas questões para mostrar apenas 
                  as que correspondem aos critérios escolhidos.
                </p>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-violet-800 
                           transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
