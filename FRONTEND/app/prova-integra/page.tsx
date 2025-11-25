'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import ExamFilters from '@/components/prova-integra/ExamFilters';
import InstitutionCard from '@/components/prova-integra/InstitutionCard';
import EmptyState from '@/components/ui/EmptyState';
import ViewExamQuestionsModal from '@/components/prova-integra/ViewExamQuestionsModal';
import { CreateListFromExamModal } from '@/components/prova-integra/CreateListFromExamModal';
import { CreateSimulatedFromExamModal } from '@/components/prova-integra/CreateSimulatedFromExamModal';
import { ExamInstitution, ExamFilters as ExamFiltersType, OfficialExam } from '@/types/official-exams';
import { useOfficialExams } from '@/hooks/queries';
import { officialExamService } from '@/services/officialExamService';
import { ProvaIntegraPageSkeleton } from '@/components/skeletons/ProvaIntegraPageSkeleton';

export default function ProvaIntegraPage() {
  const [filteredInstitutions, setFilteredInstitutions] = useState<ExamInstitution[]>([]);
  const [filters, setFilters] = useState<ExamFiltersType>({
    search: '',
    region: 'Todos',
    institution: 'Todos',
    type: 'Todos',
  });
  const [regions, setRegions] = useState<string[]>(['Todos']);
  const [institutionNames, setInstitutionNames] = useState<string[]>(['Todos']);
  const [examTypes, setExamTypes] = useState<string[]>(['Todos']);
  const [filterMap, setFilterMap] = useState<Map<string, any>>(new Map());
  
  // Usar React Query
  const { data: institutions = [], isLoading: loading } = useOfficialExams();
  
  // Atualizar institutions quando dados carregarem
  useEffect(() => {
    setFilteredInstitutions(institutions);
  }, [institutions]);

  // Estados dos modais
  const [selectedExam, setSelectedExam] = useState<OfficialExam | null>(null);
  const [isViewQuestionsOpen, setIsViewQuestionsOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isCreateSimulatedOpen, setIsCreateSimulatedOpen] = useState(false);

  // Estados do dropdown global
  const [openMenuExamId, setOpenMenuExamId] = useState<string | null>(null);
  const [isMenuAnimating, setIsMenuAnimating] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Handlers dos modais
  const handleViewQuestions = (exam: OfficialExam) => {
    setSelectedExam(exam);
    setIsViewQuestionsOpen(true);
    setOpenMenuExamId(null);
  };

  const handleCreateList = (exam: OfficialExam) => {
    setSelectedExam(exam);
    setIsCreateListOpen(true);
    setOpenMenuExamId(null);
  };

  const handleCreateSimulated = (exam: OfficialExam) => {
    setSelectedExam(exam);
    setIsCreateSimulatedOpen(true);
    setOpenMenuExamId(null);
  };

  // Handler do menu dropdown
  const handleMenuClick = (exam: OfficialExam, buttonElement: HTMLButtonElement) => {
    // Armazenar referência do botão
    buttonRefs.current.set(exam.id, buttonElement);
    
    if (openMenuExamId === exam.id) {
      setIsMenuAnimating(false);
      setTimeout(() => setOpenMenuExamId(null), 300);
    } else {
      const rect = buttonElement.getBoundingClientRect();
      const menuHeight = 200; // Altura aproximada do menu (3 itens * ~60px)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Se não há espaço suficiente embaixo, abre para cima
      const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      
      setMenuPosition({
        top: shouldOpenUpward ? rect.top - menuHeight - 8 : rect.bottom + 8,
        left: rect.right - 224,
      });
      setSelectedExam(exam);
      setOpenMenuExamId(exam.id);
      setTimeout(() => setIsMenuAnimating(true), 10);
    }
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Verificar se clicou no menu
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Verificar se clicou em algum botão de menu
      let clickedButton = false;
      buttonRefs.current.forEach((button) => {
        if (button.contains(target)) {
          clickedButton = true;
        }
      });
      
      if (!clickedButton) {
        setOpenMenuExamId(null);
      }
    };

    if (openMenuExamId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuExamId]);

  // Carrega tipos de exame e extrai dados únicos quando institutions mudar
  useEffect(() => {
    const loadExamTypes = async () => {
      if (institutions.length > 0) {
        try {
          const typesData = await officialExamService.getExamTypes();
          
          // Extrai regiões e instituições únicas
          const uniqueRegions = [...officialExamService.getUniqueRegions(institutions)];
          const uniqueInstitutions = [...officialExamService.getUniqueInstitutions(institutions)];
          
          setRegions(uniqueRegions);
          setInstitutionNames(uniqueInstitutions);
          setExamTypes([...typesData.names]);
          setFilterMap(new Map(typesData.filterMap));
        } catch (error) {
          console.error('Erro ao carregar tipos de exame:', error);
        }
      }
    };
    
    loadExamTypes();
  }, [institutions]);

  // Aplica filtros quando mudam
  useEffect(() => {
    if (institutions.length > 0) {
      const filtered = officialExamService.filterExams(institutions, filters, filterMap);
      setFilteredInstitutions(filtered);
    }
  }, [filters, institutions, filterMap]);

  return (
    <MainLayout showGreeting={false}>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Provas na Íntegra', icon: 'description', href: '/prova-integra' }
          ]}
        />
      </div>

      {/* Background Wrapper */}
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              Provas na Íntegra
            </h1>
          </div>

          {/* Filters */}
          <ExamFilters
            filters={filters}
            onFilterChange={setFilters}
            regions={regions}
            institutions={institutionNames}
            examTypes={examTypes}
          />

          {/* Content */}
          {loading ? (
            <ProvaIntegraPageSkeleton />
          ) : filteredInstitutions.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="Nenhuma prova encontrada"
              description="Tente ajustar os filtros de busca"
            />
          ) : (
            <div className="space-y-4">
              {filteredInstitutions.map((institution) => (
                <InstitutionCard 
                  key={institution.id} 
                  institution={institution}
                  onMenuClick={handleMenuClick}
                  openMenuExamId={openMenuExamId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu Global - Estilo igual aos filtros */}
      {openMenuExamId && selectedExam && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[9999] w-56 bg-surface-light dark:bg-surface-dark
                     border-2 border-primary/20 rounded-xl shadow-2xl dark:shadow-dark-xl
                     backdrop-blur-sm overflow-hidden
                     transition-all duration-300 ease-in-out origin-top
                     ${isMenuAnimating ? 'max-h-72 opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0 border-0'}`}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            boxShadow: isMenuAnimating ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(139, 92, 246, 0.1)' : 'none'
          }}
        >
          <div className="py-2">
          <button
            type="button"
            onClick={() => handleViewQuestions(selectedExam)}
            className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                       flex items-center gap-3 group/item rounded-t-lg
                       text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                       hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
          >
            <span className="material-symbols-outlined text-primary text-base">visibility</span>
            <span className="flex-1">Visualizar Questões</span>
            <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => handleCreateList(selectedExam)}
            className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                       flex items-center gap-3 group/item
                       border-t border-border-light/30 dark:border-border-dark/30
                       text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                       hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
          >
            <span className="material-symbols-outlined text-primary text-base">playlist_add</span>
            <span className="flex-1">Criar Lista</span>
            <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => handleCreateSimulated(selectedExam)}
            className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                       flex items-center gap-3 group/item rounded-b-lg
                       border-t border-border-light/30 dark:border-border-dark/30
                       text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                       hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
          >
            <span className="material-symbols-outlined text-primary text-base">schedule</span>
            <span className="flex-1">Criar Simulado</span>
            <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modais */}
      {selectedExam && (
        <>
          <ViewExamQuestionsModal
            isOpen={isViewQuestionsOpen}
            onClose={() => {
              setIsViewQuestionsOpen(false);
              setSelectedExam(null);
            }}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            questionIds={selectedExam.questionIds}
            onCreateList={() => handleCreateList(selectedExam)}
            onCreateSimulated={() => handleCreateSimulated(selectedExam)}
          />

          <CreateListFromExamModal
            isOpen={isCreateListOpen}
            onClose={() => {
              setIsCreateListOpen(false);
              setSelectedExam(null);
            }}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            questionIds={selectedExam.questionIds}
          />

          <CreateSimulatedFromExamModal
            isOpen={isCreateSimulatedOpen}
            onClose={() => {
              setIsCreateSimulatedOpen(false);
              setSelectedExam(null);
            }}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            questionIds={selectedExam.questionIds}
          />
        </>
      )}
    </MainLayout>
  );
}
