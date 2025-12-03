'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { SearchInput } from '@/components/flashcards/SearchInput';

// ============================================================================
// TYPES
// ============================================================================

interface Mentee {
  mentorshipId: string;
  userId: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  programId?: string | null;
  programTitle?: string | null;
}

interface MentorProgram {
  id: string;
  title: string;
  status: string;
  participantsCount: number;
  mentees: Mentee[];
}

interface ProgramsResponse {
  programs: MentorProgram[];
  unassignedMentees: Mentee[];
  allMentees: Mentee[];
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

interface SimuladoSettingsPanelProps {
  settings: SimuladoSettings;
  onChange: (settings: SimuladoSettings) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SimuladoSettingsPanel({ settings, onChange }: SimuladoSettingsPanelProps) {
  const [programsData, setProgramsData] = useState<ProgramsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Carregar programas quando visibilidade for 'selected'
  useEffect(() => {
    if (settings.visibility === 'selected' && !programsData) {
      loadPrograms();
    }
  }, [settings.visibility]);

  const loadPrograms = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/mentorship/mentor-simulados/programs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgramsData(data.data || { programs: [], unassignedMentees: [], allMentees: [] });
      }
    } catch (error) {
      console.error('Erro ao carregar programas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar mentorados pela busca
  const filteredMentees = useMemo(() => {
    if (!programsData || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return programsData.allMentees.filter(m => 
      m.displayName.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query)
    );
  }, [programsData, searchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const toggleProgram = (programId: string) => {
    const isSelected = settings.selectedProgramIds.includes(programId);
    const program = programsData?.programs.find(p => p.id === programId);
    
    if (isSelected) {
      // Remover programa e seus mentorados
      const programMenteeIds = program?.mentees.map(m => m.userId) || [];
      onChange({
        ...settings,
        selectedProgramIds: settings.selectedProgramIds.filter(id => id !== programId),
        selectedUserIds: settings.selectedUserIds.filter(id => !programMenteeIds.includes(id))
      });
    } else {
      // Adicionar programa e todos seus mentorados
      const programMenteeIds = program?.mentees.map(m => m.userId) || [];
      onChange({
        ...settings,
        selectedProgramIds: [...settings.selectedProgramIds, programId],
        selectedUserIds: [...new Set([...settings.selectedUserIds, ...programMenteeIds])]
      });
    }
  };

  const toggleUser = (userId: string, programId?: string | null) => {
    const isSelected = settings.selectedUserIds.includes(userId);
    
    if (isSelected) {
      // Remover usuário
      const newSelectedUserIds = settings.selectedUserIds.filter(id => id !== userId);
      
      // Se o programa estava selecionado e agora não tem todos os mentorados, desmarcar o programa
      let newSelectedProgramIds = [...settings.selectedProgramIds];
      if (programId && settings.selectedProgramIds.includes(programId)) {
        const program = programsData?.programs.find(p => p.id === programId);
        const allProgramMenteesSelected = program?.mentees.every(m => 
          m.userId === userId ? false : newSelectedUserIds.includes(m.userId)
        );
        if (!allProgramMenteesSelected) {
          newSelectedProgramIds = newSelectedProgramIds.filter(id => id !== programId);
        }
      }
      
      onChange({
        ...settings,
        selectedUserIds: newSelectedUserIds,
        selectedProgramIds: newSelectedProgramIds
      });
    } else {
      // Adicionar usuário
      const newSelectedUserIds = [...settings.selectedUserIds, userId];
      
      // Se todos os mentorados do programa estão selecionados, marcar o programa também
      let newSelectedProgramIds = [...settings.selectedProgramIds];
      if (programId && !settings.selectedProgramIds.includes(programId)) {
        const program = programsData?.programs.find(p => p.id === programId);
        const allProgramMenteesSelected = program?.mentees.every(m => 
          newSelectedUserIds.includes(m.userId)
        );
        if (allProgramMenteesSelected) {
          newSelectedProgramIds = [...newSelectedProgramIds, programId];
        }
      }
      
      onChange({
        ...settings,
        selectedUserIds: newSelectedUserIds,
        selectedProgramIds: newSelectedProgramIds
      });
    }
  };

  const toggleExpandProgram = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      newSet.has(programId) ? newSet.delete(programId) : newSet.add(programId);
      return newSet;
    });
  };

  const handleVisibilityChange = (visibility: SimuladoVisibility) => {
    onChange({ 
      ...settings,
      visibility,
      selectedProgramIds: visibility === 'selected' ? settings.selectedProgramIds : [],
      selectedMentorshipIds: visibility === 'selected' ? settings.selectedMentorshipIds : [],
      selectedUserIds: visibility === 'selected' ? settings.selectedUserIds : []
    });
  };

  const selectAll = () => {
    if (!programsData) return;
    onChange({
      ...settings,
      selectedProgramIds: programsData.programs.map(p => p.id),
      selectedUserIds: programsData.allMentees.map(m => m.userId)
    });
  };

  const deselectAll = () => {
    onChange({
      ...settings,
      selectedProgramIds: [],
      selectedUserIds: []
    });
  };

  // ============================================================================
  // VISIBILITY OPTIONS
  // ============================================================================

  const visibilityOptions: { id: SimuladoVisibility; label: string; description: string; icon: string }[] = [
    { id: 'private', label: 'Privado', description: 'Apenas você pode ver (rascunho)', icon: 'lock' },
    { id: 'selected', label: 'Selecionados', description: 'Mentorias e/ou usuários específicos', icon: 'group' },
    { id: 'public', label: 'Público', description: 'Todos os mentorados + inscrição aberta', icon: 'public' },
  ];

  // Contadores
  const selectedProgramsCount = settings.selectedProgramIds.length;
  const selectedUsersCount = settings.selectedUserIds.length;
  const totalMentees = programsData?.allMentees.length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* COLUNA ESQUERDA - Informações básicas */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
          dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
          rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Informações Básicas
          </h2>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Nome do Simulado *
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => onChange({ ...settings, name: e.target.value })}
                placeholder="Ex: Simulado de Cardiologia - Módulo 1"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Descrição
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => onChange({ ...settings, description: e.target.value })}
                placeholder="Descreva o objetivo do simulado..."
                rows={3}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Tempo Limite (opcional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={settings.timeLimit || ''}
                  onChange={(e) => onChange({ ...settings, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="0"
                  min="0"
                  className="w-24 px-4 py-3 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary text-center
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  minutos (vazio = sem limite)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Agendamento */}
        <div className="bg-gradient-to-br from-surface-light via-surface-light to-amber/5 
          dark:from-surface-dark dark:via-surface-dark dark:to-amber/10 
          rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">schedule</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Agendamento</h2>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Defina quando o simulado ficará disponível
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Data de Liberação
              </label>
              <input
                type="date"
                value={settings.scheduledDate}
                onChange={(e) => onChange({ ...settings, scheduledDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">Horário</label>
              <input
                type="time"
                value={settings.scheduledTime}
                onChange={(e) => onChange({ ...settings, scheduledTime: e.target.value })}
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          
          {settings.scheduledDate && settings.scheduledTime && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Liberação: {new Date(`${settings.scheduledDate}T${settings.scheduledTime}`).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
          
          {!settings.scheduledDate && !settings.scheduledTime && (
            <p className="mt-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
              Deixe vazio para disponibilizar imediatamente após criar
            </p>
          )}
        </div>

        {/* Opções */}
        <div className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
          dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
          rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            Opções Avançadas
          </h2>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark
              rounded-xl cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) => onChange({ ...settings, shuffleQuestions: e.target.checked })}
                className="w-5 h-5 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/30"
              />
              <div>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">Embaralhar questões</p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Ordem aleatória para cada usuário</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark
              rounded-xl cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={settings.showResults}
                onChange={(e) => onChange({ ...settings, showResults: e.target.checked })}
                className="w-5 h-5 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/30"
              />
              <div>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">Mostrar resultados</p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Gabarito visível após finalizar</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA - Visibilidade e Seleção */}
      <div className="space-y-6">
        {/* Visibilidade */}
        <div className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
          dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
          rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Visibilidade e Distribuição
          </h2>

          <div className="space-y-3">
            {visibilityOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleVisibilityChange(option.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200
                  ${settings.visibility === option.id
                    ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary'
                    : 'bg-background-light dark:bg-background-dark border-2 border-transparent hover:border-primary/30'
                  }`}
              >
                <div className={`p-2.5 rounded-xl ${
                  settings.visibility === option.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  <span className="material-symbols-outlined">{option.icon}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${
                    settings.visibility === option.id ? 'text-primary' : 'text-text-light-primary dark:text-text-dark-primary'
                  }`}>
                    {option.label}
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                    {option.description}
                  </p>
                </div>
                {settings.visibility === option.id && (
                  <span className="material-symbols-outlined text-primary">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>


        {/* Seleção de Programas/Usuários */}
        {settings.visibility === 'selected' && (
          <div className="bg-gradient-to-br from-surface-light via-surface-light to-violet/5 
            dark:from-surface-dark dark:via-surface-dark dark:to-violet/10 
            rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                  <span className="material-symbols-outlined text-violet-600 dark:text-violet-400">groups</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    Selecionar Destinatários
                  </h3>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    Escolha mentorias inteiras ou mentorados específicos
                  </p>
                </div>
              </div>
              {selectedUsersCount > 0 && (
                <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full text-sm font-semibold">
                  {selectedUsersCount} de {totalMentees} selecionados
                </span>
              )}
            </div>

            {/* Barra de busca global */}
            <div className="mb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar mentorado por nome ou email..."
                fullWidth
              />
            </div>

            {/* Resultados da busca */}
            {searchQuery && filteredMentees.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                  {filteredMentees.length} resultado(s) encontrado(s)
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredMentees.map((mentee) => (
                    <MenteeItem
                      key={mentee.userId}
                      mentee={mentee}
                      isSelected={settings.selectedUserIds.includes(mentee.userId)}
                      onToggle={() => toggleUser(mentee.userId, mentee.programId)}
                      showProgram
                    />
                  ))}
                </div>
              </div>
            )}

            {searchQuery && filteredMentees.length === 0 && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhum mentorado encontrado para "{searchQuery}"
                </p>
              </div>
            )}

            {/* Ações rápidas */}
            {!searchQuery && programsData && programsData.allMentees.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-2 text-sm font-medium text-primary bg-primary/10 
                    hover:bg-primary/20 rounded-lg transition-colors"
                >
                  Selecionar todos
                </button>
                <button
                  onClick={deselectAll}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 
                    bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 
                    rounded-lg transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Carregando mentorias...
                </span>
              </div>
            ) : !programsData || (programsData.programs.length === 0 && programsData.unassignedMentees.length === 0) ? (
              <div className="text-center py-8 bg-background-light dark:bg-background-dark rounded-xl">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                  group_off
                </span>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhuma mentoria ativa encontrada
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  Crie mentorias para poder distribuir simulados
                </p>
              </div>
            ) : !searchQuery && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {/* Programas */}
                {programsData.programs.map((program) => {
                  const isExpanded = expandedPrograms.has(program.id);
                  const isProgramSelected = settings.selectedProgramIds.includes(program.id);
                  const selectedInProgram = program.mentees.filter(m => 
                    settings.selectedUserIds.includes(m.userId)
                  ).length;
                  
                  return (
                    <div 
                      key={program.id} 
                      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                        isProgramSelected 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                          : 'border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark'
                      }`}
                    >
                      {/* Header do Programa */}
                      <div className="flex items-center p-3">
                        <button
                          onClick={() => toggleProgram(program.id)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isProgramSelected 
                              ? 'bg-primary border-primary' 
                              : selectedInProgram > 0 
                                ? 'bg-primary/50 border-primary/50' 
                                : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isProgramSelected && (
                              <span className="material-symbols-outlined text-white text-sm">check</span>
                            )}
                            {!isProgramSelected && selectedInProgram > 0 && (
                              <span className="material-symbols-outlined text-white text-sm">remove</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                              {program.title}
                            </p>
                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                              {program.mentees.length} mentorado(s) • {selectedInProgram} selecionado(s)
                            </p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => toggleExpandProgram(program.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Ver mentorados"
                        >
                          <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}>
                            expand_more
                          </span>
                        </button>
                      </div>
                      
                      {/* Mentorados expandidos */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0">
                          <div className="border-t border-border-light dark:border-border-dark pt-3 space-y-2">
                            {program.mentees.map((mentee) => (
                              <MenteeItem
                                key={mentee.userId}
                                mentee={mentee}
                                isSelected={settings.selectedUserIds.includes(mentee.userId)}
                                onToggle={() => toggleUser(mentee.userId, program.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mentorados sem programa */}
                {programsData.unassignedMentees.length > 0 && (
                  <div className="border border-border-light dark:border-border-dark rounded-xl overflow-hidden bg-background-light dark:bg-background-dark">
                    <div className="p-3 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                      <p className="font-medium text-text-light-primary dark:text-text-dark-primary text-sm">
                        Mentorados sem programa
                      </p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {programsData.unassignedMentees.length} mentorado(s)
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {programsData.unassignedMentees.map((mentee) => (
                        <MenteeItem
                          key={mentee.userId}
                          mentee={mentee}
                          isSelected={settings.selectedUserIds.includes(mentee.userId)}
                          onToggle={() => toggleUser(mentee.userId, null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {programsData && programsData.allMentees.length > 0 && !searchQuery && (
              <p className="mt-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                💡 Selecione uma mentoria inteira para incluir todos os mentorados, ou expanda para selecionar individualmente.
              </p>
            )}
          </div>
        )}

        {/* Info para Público */}
        {settings.visibility === 'public' && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20
            rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">info</span>
              </div>
              <div>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Simulado Público</h3>
                <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                  <li>• Todos os seus mentorados receberão automaticamente</li>
                  <li>• Aparecerá na página de simulados públicos</li>
                  <li>• Qualquer usuário da plataforma pode se inscrever</li>
                  <li>• Ideal para simulados abertos e competições</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info para Privado */}
        {settings.visibility === 'private' && (
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20
            rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">lock</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Simulado Privado</h3>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Apenas você pode ver e acessar</li>
                  <li>• Nenhum aluno receberá automaticamente</li>
                  <li>• Ideal para rascunhos e testes</li>
                  <li>• Você pode mudar a visibilidade depois</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MENTEE ITEM COMPONENT
// ============================================================================

interface MenteeItemProps {
  mentee: Mentee;
  isSelected: boolean;
  onToggle: () => void;
  showProgram?: boolean;
}

function MenteeItem({ mentee, isSelected, onToggle, showProgram }: MenteeItemProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
        isSelected
          ? 'bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700'
          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
        isSelected 
          ? 'bg-violet-500 border-violet-500' 
          : 'border-slate-300 dark:border-slate-600'
      }`}>
        {isSelected && (
          <span className="material-symbols-outlined text-white text-sm">check</span>
        )}
      </div>
      
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
        {mentee.photoUrl ? (
          <Image 
            src={mentee.photoUrl} 
            alt={mentee.displayName} 
            fill 
            className="object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-primary font-semibold">
              {mentee.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
          {mentee.displayName}
        </p>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate">
          {mentee.email}
          {showProgram && mentee.programTitle && (
            <span className="ml-2 text-violet-500">• {mentee.programTitle}</span>
          )}
        </p>
      </div>
    </button>
  );
}
