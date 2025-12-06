'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFilterHierarchy, useInstitutionHierarchy, useAvailableYears, useQuestionCount } from '@/hooks/useBancoQuestoes';
import { hierarchyToSubjects } from '@/lib/adapters/bancoQuestoesAdapter';
import { GameConfig, UnansweredFilter } from './types';
import { useGameSounds } from './SoundContext';
import Checkbox from '@/components/ui/Checkbox';

interface GameConfigProps {
  onStartGame: (config: GameConfig) => void;
  onBack: () => void;
  onStartFatalityDebug?: () => void; // Debug: iniciar direto no modo Fatality
}

const UNANSWERED_OPTIONS: { value: UnansweredFilter; label: string; description: string }[] = [
  { value: 'all', label: 'Todas as questões', description: 'Inclui questões já respondidas' },
  { value: 'unanswered_game', label: 'Novas no Show do Milhão', description: 'Questões que você nunca viu neste jogo' },
  { value: 'unanswered_system', label: 'Novas no sistema', description: 'Questões que você nunca respondeu em nenhum lugar' },
];

export function GameConfigComponent({ onStartGame, onBack, onStartFatalityDebug }: GameConfigProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'subjects' | 'institutions' | 'years'>('subjects');
  const [unansweredFilter, setUnansweredFilter] = useState<UnansweredFilter>('all');
  const { isMuted, toggleMute } = useGameSounds();

  const { hierarchy, loading: loadingSubjects } = useFilterHierarchy();
  const { hierarchy: institutionHierarchy, loading: loadingInstitutions } = useInstitutionHierarchy();
  const { years: yearsHierarchy, loading: loadingYears } = useAvailableYears();

  const educationalHierarchy = useMemo(() => {
    const educationalFilters = [
      'Cirurgia', 'Clínica Médica', 'Ginecologia',
      'Medicina Preventiva', 'Obstetrícia', 'Pediatria', 'Outros'
    ];
    return hierarchy.filter(filter => educationalFilters.includes(filter.name));
  }, [hierarchy]);

  const subjects = useMemo(() => hierarchyToSubjects(educationalHierarchy), [educationalHierarchy]);

  // Converter anos selecionados (formato "Ano da Prova_2024") para números para o contador
  const selectedYearsAsNumbers = useMemo(() => {
    return selectedYears.map(yearId => {
      const match = yearId.match(/Ano da Prova_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }).filter(y => y > 0);
  }, [selectedYears]);

  const { count: questionCount, isFetching } = useQuestionCount({
    filterIds: selectedSubjects.filter(id => !id.includes('_')),
    subFilterIds: selectedSubjects.filter(id => id.includes('_')),
    years: selectedYearsAsNumbers,
    institutions: selectedInstitutions,
    unansweredFilter: unansweredFilter,
    gameType: 'show_do_milhao',
    excludeOutdated: true, // Sempre excluir no Show do Milhão
    excludeAnnulled: true, // Sempre excluir no Show do Milhão
  });

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      return [...prev, id];
    });
  };

  const toggleInstitution = (id: string) => {
    setSelectedInstitutions(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      return [...prev, id];
    });
  };

  const toggleYear = (id: string) => {
    setSelectedYears(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      return [...prev, id];
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const canStart = questionCount >= 5;

  const handleStart = () => {
    onStartGame({
      selectedSubjects: [...selectedSubjects, ...selectedYears],
      selectedInstitutions,
      questionCount: Math.min(questionCount, 16),
      unansweredFilter,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050010] via-[#0d0420] to-[#050010] relative overflow-hidden">
      
      {/* ===== CENÁRIO DE ESTÚDIO ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Paredes de LED */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 150% 80% at 50% 20%, rgba(88,28,135,0.2) 0%, transparent 50%),
              radial-gradient(ellipse 100% 60% at 20% 80%, rgba(6,182,212,0.08) 0%, transparent 40%),
              radial-gradient(ellipse 100% 60% at 80% 80%, rgba(219,39,119,0.08) 0%, transparent 40%)
            `,
          }}
        />
        
        {/* Grid tech */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 49%, rgba(168,85,247,0.3) 50%, transparent 51%),
              linear-gradient(90deg, transparent 49%, rgba(168,85,247,0.2) 50%, transparent 51%)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Feixes de luz */}
        <div 
          className="absolute top-0 left-[20%] w-[150px] h-[50%] opacity-10"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, transparent 100%)',
            transform: 'rotate(-10deg)',
            filter: 'blur(30px)',
          }}
        />
        <div 
          className="absolute top-0 right-[20%] w-[150px] h-[50%] opacity-10"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, transparent 100%)',
            transform: 'rotate(10deg)',
            filter: 'blur(30px)',
          }}
        />
        
        {/* Chão reflexivo */}
        <div className="absolute bottom-0 left-0 right-0 h-[20%]">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(10,5,25,0.95) 50%, rgba(5,0,15,1) 100%)',
            }}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Header - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6 md:mb-8 relative"
        >
          <button
            onClick={onBack}
            className="absolute top-0 left-0 p-1.5 sm:p-2 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/30"
          >
            <span className="material-symbols-outlined text-purple-300 text-xl sm:text-2xl">arrow_back</span>
          </button>

          <button
            onClick={toggleMute}
            className="absolute top-0 right-0 p-1.5 sm:p-2 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/30"
            title={isMuted ? 'Ativar som' : 'Desativar som'}
          >
            <span className="material-symbols-outlined text-purple-300 text-xl sm:text-2xl">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 pt-8 sm:pt-0"
            style={{
              color: '#e9d5ff',
              textShadow: '0 0 10px rgba(168,85,247,0.5), 0 0 20px rgba(168,85,247,0.3)',
            }}
          >
            Configurar Jogo
          </h1>
          <p className="text-purple-300/70 text-sm sm:text-base px-4 sm:px-0">
            Selecione assuntos, universidades e anos para filtrar as questões
          </p>
        </motion.div>


        {/* Contador de questões - estilo painel holográfico - APENAS DESKTOP/TABLET */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden sm:block mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center relative overflow-hidden"
          style={{
            background: canStart 
              ? 'linear-gradient(180deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)'
              : 'linear-gradient(180deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)',
            border: canStart ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(251,191,36,0.4)',
            boxShadow: canStart 
              ? '0 0 20px rgba(16,185,129,0.2), inset 0 0 30px rgba(16,185,129,0.1)'
              : '0 0 20px rgba(251,191,36,0.2), inset 0 0 30px rgba(251,191,36,0.1)',
          }}
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span 
              className="material-symbols-outlined text-xl sm:text-2xl"
              style={{ color: canStart ? '#10b981' : '#fbbf24' }}
            >
              {isFetching ? 'hourglass_empty' : canStart ? 'check_circle' : 'warning'}
            </span>
            <div>
              <span 
                className="text-xl sm:text-2xl font-bold"
                style={{ 
                  color: canStart ? '#10b981' : '#fbbf24',
                  textShadow: canStart ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(251,191,36,0.5)',
                }}
              >
                {isFetching ? '...' : questionCount}
              </span>
              <span className="text-purple-300/70 ml-1 sm:ml-2 text-sm sm:text-base">questões disponíveis</span>
            </div>
          </div>
          {!canStart && !isFetching && (
            <p className="text-xs sm:text-sm mt-1 sm:mt-2" style={{ color: '#fbbf24' }}>
              Mínimo de 5 questões necessárias para jogar
            </p>
          )}
        </motion.div>

        {/* Filtro de questões não respondidas - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(30,10,60,0.7) 0%, rgba(20,5,40,0.9) 100%)',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 0 15px rgba(168,85,247,0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="material-symbols-outlined text-purple-400 text-lg sm:text-xl">filter_alt</span>
            <h3 className="text-purple-200 font-semibold text-sm sm:text-base">Filtrar questões</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {UNANSWERED_OPTIONS.map((option) => (
              <div
                key={option.value}
                onClick={() => setUnansweredFilter(option.value)}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: unansweredFilter === option.value
                    ? 'linear-gradient(90deg, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.3) 100%)'
                    : 'rgba(40,20,70,0.3)',
                  border: unansweredFilter === option.value
                    ? '2px solid #a855f7'
                    : '2px solid transparent',
                  boxShadow: unansweredFilter === option.value
                    ? '0 0 10px rgba(168,85,247,0.3)'
                    : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={unansweredFilter === option.value}
                    onChange={() => setUnansweredFilter(option.value)}
                  />
                  <div>
                    <span className="text-purple-100 font-medium text-xs sm:text-sm">{option.label}</span>
                    <p className="text-purple-400/60 text-[10px] sm:text-xs mt-0.5">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs - estilo neon - RESPONSIVO */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('subjects')}
            className="flex-1 py-2 sm:py-3 px-1.5 sm:px-2 md:px-4 rounded-lg sm:rounded-xl font-semibold transition-all text-xs sm:text-sm md:text-base"
            style={{
              background: activeTab === 'subjects'
                ? 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.5) 100%)'
                : 'rgba(30,10,60,0.5)',
              border: activeTab === 'subjects' ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)',
              color: activeTab === 'subjects' ? '#e9d5ff' : '#a78bfa',
              boxShadow: activeTab === 'subjects' ? '0 0 15px rgba(168,85,247,0.3)' : 'none',
            }}
          >
            <span className="material-symbols-outlined mr-0.5 sm:mr-1 md:mr-2 align-middle text-sm sm:text-base md:text-lg">school</span>
            <span className="hidden md:inline">Assuntos</span> ({selectedSubjects.length})
          </button>
          <button
            onClick={() => setActiveTab('institutions')}
            className="flex-1 py-2 sm:py-3 px-1.5 sm:px-2 md:px-4 rounded-lg sm:rounded-xl font-semibold transition-all text-xs sm:text-sm md:text-base"
            style={{
              background: activeTab === 'institutions'
                ? 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.5) 100%)'
                : 'rgba(30,10,60,0.5)',
              border: activeTab === 'institutions' ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)',
              color: activeTab === 'institutions' ? '#e9d5ff' : '#a78bfa',
              boxShadow: activeTab === 'institutions' ? '0 0 15px rgba(168,85,247,0.3)' : 'none',
            }}
          >
            <span className="material-symbols-outlined mr-0.5 sm:mr-1 md:mr-2 align-middle text-sm sm:text-base md:text-lg">apartment</span>
            <span className="hidden md:inline">Univ.</span> ({selectedInstitutions.length})
          </button>
          <button
            onClick={() => setActiveTab('years')}
            className="flex-1 py-2 sm:py-3 px-1.5 sm:px-2 md:px-4 rounded-lg sm:rounded-xl font-semibold transition-all text-xs sm:text-sm md:text-base"
            style={{
              background: activeTab === 'years'
                ? 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(88,28,135,0.5) 100%)'
                : 'rgba(30,10,60,0.5)',
              border: activeTab === 'years' ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)',
              color: activeTab === 'years' ? '#e9d5ff' : '#a78bfa',
              boxShadow: activeTab === 'years' ? '0 0 15px rgba(168,85,247,0.3)' : 'none',
            }}
          >
            <span className="material-symbols-outlined mr-0.5 sm:mr-1 md:mr-2 align-middle text-sm sm:text-base md:text-lg">calendar_month</span>
            <span className="hidden md:inline">Anos</span> ({selectedYears.length})
          </button>
        </div>

        {/* Conteúdo das tabs - estilo vidro holográfico - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl sm:rounded-2xl p-3 sm:p-4 max-h-[300px] sm:max-h-[350px] md:max-h-[400px] overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, rgba(30,10,60,0.7) 0%, rgba(20,5,40,0.9) 100%)',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 0 20px rgba(168,85,247,0.1), inset 0 0 30px rgba(88,28,135,0.2)',
          }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'subjects' ? (
              <motion.div
                key="subjects"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-2"
              >
                {loadingSubjects ? (
                  <div className="text-center py-8 text-purple-400/50">Carregando...</div>
                ) : (
                  subjects.map((subject) => (
                    <div key={subject.id}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          background: selectedSubjects.includes(subject.id)
                            ? 'linear-gradient(90deg, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.3) 100%)'
                            : 'rgba(40,20,70,0.3)',
                          border: selectedSubjects.includes(subject.id)
                            ? '2px solid #a855f7'
                            : '2px solid transparent',
                          boxShadow: selectedSubjects.includes(subject.id)
                            ? '0 0 10px rgba(168,85,247,0.3)'
                            : 'none',
                        }}
                        onClick={() => {
                          if (subject.children?.length) toggleExpand(subject.id);
                          else toggleSubject(subject.id);
                        }}
                      >
                        {subject.children?.length ? (
                          <span className={`material-symbols-outlined text-purple-400 transition-transform ${expandedFilters.has(subject.id) ? 'rotate-90' : ''}`}>
                            chevron_right
                          </span>
                        ) : (
                          <Checkbox
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={() => toggleSubject(subject.id)}
                          />
                        )}
                        <span className="text-purple-100 font-medium">{subject.name}</span>
                        {subject.children?.length && (
                          <span className="text-xs text-purple-400/50 ml-auto">
                            {subject.children.length} subtemas
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {expandedFilters.has(subject.id) && subject.children && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-6 mt-1 space-y-1 overflow-hidden"
                          >
                            {subject.children.map((child: any) => (
                              <div
                                key={child.id}
                                onClick={() => toggleSubject(child.id)}
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200"
                                style={{
                                  background: selectedSubjects.includes(child.id)
                                    ? 'rgba(168,85,247,0.15)'
                                    : 'rgba(40,20,70,0.2)',
                                  border: selectedSubjects.includes(child.id)
                                    ? '1px solid #a855f7'
                                    : '1px solid transparent',
                                }}
                              >
                                <Checkbox
                                  checked={selectedSubjects.includes(child.id)}
                                  onChange={() => toggleSubject(child.id)}
                                />
                                <span className="text-purple-200/80 text-sm">{child.name}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === 'institutions' ? (
              <motion.div
                key="institutions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {loadingInstitutions ? (
                  <div className="text-center py-8 text-purple-400/50">Carregando...</div>
                ) : (
                  institutionHierarchy.map((state: any) => (
                    <div key={state.id}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: 'rgba(40,20,70,0.3)',
                          border: '2px solid transparent',
                        }}
                        onClick={() => toggleExpand(state.id)}
                      >
                        <span className={`material-symbols-outlined text-purple-400 transition-transform ${expandedFilters.has(state.id) ? 'rotate-90' : ''}`}>
                          chevron_right
                        </span>
                        <span className="text-purple-100 font-medium">{state.name}</span>
                        <span className="text-xs text-purple-400/50 ml-auto">
                          {state.children?.length || 0} instituições
                        </span>
                      </div>

                      <AnimatePresence>
                        {expandedFilters.has(state.id) && state.children && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-6 mt-1 space-y-1 overflow-hidden"
                          >
                            {state.children.map((inst: any) => (
                              <div
                                key={inst.id}
                                onClick={() => toggleInstitution(inst.id)}
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200"
                                style={{
                                  background: selectedInstitutions.includes(inst.id)
                                    ? 'rgba(59,130,246,0.15)'
                                    : 'rgba(40,20,70,0.2)',
                                  border: selectedInstitutions.includes(inst.id)
                                    ? '1px solid #3b82f6'
                                    : '1px solid transparent',
                                }}
                              >
                                <Checkbox
                                  checked={selectedInstitutions.includes(inst.id)}
                                  onChange={() => toggleInstitution(inst.id)}
                                />
                                <span className="text-purple-200/80 text-sm">{inst.name}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="years"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2"
              >
                {loadingYears ? (
                  <div className="text-center py-8 text-purple-400/50">Carregando...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {yearsHierarchy
                      .sort((a: any, b: any) => parseInt(b.name) - parseInt(a.name))
                      .map((yearItem: any) => {
                        const yearId = `Ano da Prova_${yearItem.name}`;
                        const isSelected = selectedYears.includes(yearId);
                        return (
                          <div
                            key={yearItem.id}
                            onClick={() => toggleYear(yearId)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200"
                            style={{
                              background: isSelected
                                ? 'linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)'
                                : 'rgba(40,20,70,0.3)',
                              border: isSelected
                                ? '2px solid #10b981'
                                : '2px solid transparent',
                              boxShadow: isSelected
                                ? '0 0 10px rgba(16,185,129,0.3)'
                                : 'none',
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleYear(yearId)}
                            />
                            <span 
                              className="font-bold text-lg"
                              style={{ color: isSelected ? '#10b981' : '#c4b5fd' }}
                            >
                              {yearItem.name}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>


        {/* Seleções atuais */}
        {(selectedSubjects.length > 0 || selectedInstitutions.length > 0 || selectedYears.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl"
            style={{
              background: 'rgba(30,10,60,0.5)',
              border: '1px solid rgba(168,85,247,0.3)',
            }}
          >
            <h3 className="text-sm font-semibold text-purple-400/70 mb-3">Selecionados:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map(id => {
                const subject = subjects.find(s => s.id === id) || 
                  subjects.flatMap(s => s.children || []).find((c: any) => c.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'rgba(168,85,247,0.2)',
                      border: '1px solid rgba(168,85,247,0.4)',
                      color: '#c4b5fd',
                    }}
                  >
                    {subject?.name || id}
                    <button onClick={() => toggleSubject(id)} className="hover:text-white ml-1">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                );
              })}
              {selectedInstitutions.map(id => {
                const inst = institutionHierarchy.flatMap((s: any) => s.children || []).find((i: any) => i.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'rgba(59,130,246,0.2)',
                      border: '1px solid rgba(59,130,246,0.4)',
                      color: '#93c5fd',
                    }}
                  >
                    {inst?.name || id}
                    <button onClick={() => toggleInstitution(id)} className="hover:text-white ml-1">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                );
              })}
              {selectedYears.map(id => {
                const year = id.replace('Ano da Prova_', '');
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'rgba(16,185,129,0.2)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      color: '#6ee7b7',
                    }}
                  >
                    {year}
                    <button onClick={() => toggleYear(id)} className="hover:text-white ml-1">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Botões - estilo neon - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 sm:mt-6 flex gap-2 sm:gap-3"
        >
          <button
            onClick={onBack}
            className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all text-sm sm:text-base"
            style={{
              background: 'rgba(30,10,60,0.5)',
              border: '2px solid rgba(168,85,247,0.3)',
              color: '#c4b5fd',
            }}
          >
            Voltar
          </button>
          {/* Contador de questões - APENAS MOBILE - posicionado acima do botão */}
          <div
            className="sm:hidden flex-1 p-2.5 rounded-xl text-center relative overflow-hidden"
            style={{
              background: canStart 
                ? 'linear-gradient(180deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)'
                : 'linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)',
              border: canStart ? '2px solid rgba(16,185,129,0.5)' : '2px solid rgba(251,191,36,0.5)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <span 
                className="material-symbols-outlined text-lg"
                style={{ color: canStart ? '#10b981' : '#fbbf24' }}
              >
                {isFetching ? 'hourglass_empty' : canStart ? 'check_circle' : 'warning'}
              </span>
              <span 
                className="text-lg font-bold"
                style={{ color: canStart ? '#10b981' : '#fbbf24' }}
              >
                {isFetching ? '...' : questionCount}
              </span>
              <span className="text-purple-300/70 text-xs">questões</span>
            </div>
            {!canStart && !isFetching && (
              <p className="text-[10px] mt-1" style={{ color: '#fbbf24' }}>
                Mínimo 5 questões
              </p>
            )}
          </div>

          <motion.button
            onClick={handleStart}
            disabled={!canStart}
            whileHover={canStart ? { scale: 1.02 } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
            className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all relative overflow-hidden text-sm sm:text-base"
            style={{
              background: canStart
                ? 'linear-gradient(180deg, rgba(168,85,247,0.8) 0%, rgba(88,28,135,1) 100%)'
                : 'rgba(40,20,70,0.5)',
              border: canStart ? '2px solid #a855f7' : '2px solid rgba(100,50,150,0.3)',
              color: canStart ? '#fff' : 'rgba(168,85,247,0.4)',
              boxShadow: canStart ? '0 0 20px rgba(168,85,247,0.4)' : 'none',
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            {canStart && (
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-lg sm:text-xl">play_arrow</span>
              <span className="hidden sm:inline">Iniciar Jogo</span>
              <span className="sm:hidden">Jogar</span>
            </span>
          </motion.button>
        </motion.div>

        {/* DEBUG: Botão para testar modo Fatality */}
        {onStartFatalityDebug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <button
              onClick={onStartFatalityDebug}
              className="w-full py-3 rounded-xl font-semibold transition-all"
              style={{
                background: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)',
                border: '2px solid #ef4444',
                color: '#fff',
                boxShadow: '0 0 20px rgba(239,68,68,0.4)',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                💀 DEBUG: Iniciar Fatality 💀
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
