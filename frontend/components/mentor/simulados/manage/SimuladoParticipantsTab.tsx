'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';

interface Mentee {
  mentorshipId: string;
  userId: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  programId?: string | null;
  programTitle?: string | null;
}

interface Program {
  id: string;
  title: string;
  mentees: Mentee[];
}

interface SimuladoParticipantsTabProps {
  simulado: {
    id: string;
    visibility: 'public' | 'private' | 'selected';
    allowed_user_ids: string[];
    selected_mentorship_ids: string[];
  };
  canEdit: boolean;
  onUpdate: (updates: any) => Promise<boolean>;
  onRefresh: () => void;
}

export function SimuladoParticipantsTab({ simulado, canEdit, onUpdate, onRefresh }: SimuladoParticipantsTabProps) {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [unassignedMentees, setUnassignedMentees] = useState<Mentee[]>([]);
  const [allMentees, setAllMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedMentorshipIds, setSelectedMentorshipIds] = useState<Set<string>>(
    new Set(simulado.selected_mentorship_ids || [])
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(simulado.allowed_user_ids || [])
  );

  // Carregar programas e mentorados
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(
          `/api/mentorship/mentor-simulados/programs`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPrograms(data.data.programs || []);
          setUnassignedMentees(data.data.unassignedMentees || []);
          setAllMentees(data.data.allMentees || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Toggle mentoria
  const toggleMentorship = (mentorshipId: string, userId: string) => {
    if (!canEdit) return;
    
    const newMentorshipIds = new Set(selectedMentorshipIds);
    const newUserIds = new Set(selectedUserIds);
    
    if (newMentorshipIds.has(mentorshipId)) {
      newMentorshipIds.delete(mentorshipId);
      newUserIds.delete(userId);
    } else {
      newMentorshipIds.add(mentorshipId);
      newUserIds.add(userId);
    }
    
    setSelectedMentorshipIds(newMentorshipIds);
    setSelectedUserIds(newUserIds);
  };

  // Toggle programa inteiro
  const toggleProgram = (program: Program) => {
    if (!canEdit) return;
    
    const programMentorshipIds = program.mentees.map(m => m.mentorshipId);
    const programUserIds = program.mentees.map(m => m.userId);
    
    const allSelected = programMentorshipIds.every(id => selectedMentorshipIds.has(id));
    
    const newMentorshipIds = new Set(selectedMentorshipIds);
    const newUserIds = new Set(selectedUserIds);
    
    if (allSelected) {
      programMentorshipIds.forEach(id => newMentorshipIds.delete(id));
      programUserIds.forEach(id => newUserIds.delete(id));
    } else {
      programMentorshipIds.forEach(id => newMentorshipIds.add(id));
      programUserIds.forEach(id => newUserIds.add(id));
    }
    
    setSelectedMentorshipIds(newMentorshipIds);
    setSelectedUserIds(newUserIds);
  };

  // Selecionar todos
  const selectAll = () => {
    if (!canEdit) return;
    
    const allMentorshipIds = allMentees.map(m => m.mentorshipId);
    const allUserIds = allMentees.map(m => m.userId);
    
    setSelectedMentorshipIds(new Set(allMentorshipIds));
    setSelectedUserIds(new Set(allUserIds));
  };

  // Limpar seleção
  const clearSelection = () => {
    if (!canEdit) return;
    
    setSelectedMentorshipIds(new Set());
    setSelectedUserIds(new Set());
  };

  // Salvar alterações
  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Não é possível editar após o horário de início');
      return;
    }

    setSaving(true);
    
    const success = await onUpdate({
      selectedMentorshipIds: Array.from(selectedMentorshipIds),
      selectedUserIds: Array.from(selectedUserIds)
    });
    
    if (success) {
      // Sincronizar atribuições
      try {
        await fetch(
          `/api/mentorship/mentor-simulados/${simulado.id}/sync-assignments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userIds: Array.from(selectedUserIds),
              mentorshipIds: Array.from(selectedMentorshipIds)
            })
          }
        );
        toast.success('Participantes atualizados!');
        onRefresh();
      } catch (error) {
        console.error('Erro ao sincronizar:', error);
      }
    }
    
    setSaving(false);
  };

  const hasChanges = 
    JSON.stringify(Array.from(selectedMentorshipIds).sort()) !== 
    JSON.stringify((simulado.selected_mentorship_ids || []).sort());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-20 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-40 bg-gradient-to-r from-border-light to-border-light/50 
                                dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-emerald-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-emerald-500/10 
                    rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 
                          flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="material-symbols-outlined text-white text-2xl">group</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {selectedUserIds.size}
              </span>
              <span className="text-text-light-secondary dark:text-text-dark-secondary ml-2">
                participante(s) selecionado(s)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={selectAll}
              disabled={!canEdit}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl
                       bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary
                       border-2 border-primary/30 hover:border-primary/50
                       shadow-sm hover:shadow-md hover:scale-105
                       disabled:opacity-50 disabled:hover:scale-100
                       transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">select_all</span>
                Selecionar Todos
              </span>
            </button>
            <button
              onClick={clearSelection}
              disabled={!canEdit}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl
                       bg-border-light dark:bg-border-dark
                       text-text-light-secondary dark:text-text-dark-secondary
                       border-2 border-border-light dark:border-border-dark
                       hover:border-red-300 dark:hover:border-red-700 hover:text-red-500
                       shadow-sm hover:shadow-md hover:scale-105
                       disabled:opacity-50 disabled:hover:scale-100
                       transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">deselect</span>
                Limpar
              </span>
            </button>
            
            {hasChanges && canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl 
                         font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                         disabled:opacity-50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    Salvar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Programas */}
      {programs.map((program) => {
        const programMentorshipIds = program.mentees.map(m => m.mentorshipId);
        const selectedCount = programMentorshipIds.filter(id => selectedMentorshipIds.has(id)).length;
        const allSelected = selectedCount === program.mentees.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <div
            key={program.id}
            className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-blue-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-blue-500/10 
                      rounded-2xl border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl"
          >
            {/* Header do Programa */}
            <div 
              className={`p-5 flex items-center justify-between transition-all duration-200
                        ${canEdit ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10' : 'cursor-not-allowed'}`}
              onClick={() => toggleProgram(program)}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox customizado */}
                <div className={`
                  w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                  ${allSelected 
                    ? 'bg-gradient-to-br from-primary to-violet-500 border-primary shadow-lg shadow-primary/30' 
                    : someSelected 
                      ? 'bg-gradient-to-br from-primary/50 to-violet-500/50 border-primary/50' 
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                  }
                `}>
                  {(allSelected || someSelected) && (
                    <span className="material-symbols-outlined text-white text-lg">
                      {allSelected ? 'check' : 'remove'}
                    </span>
                  )}
                </div>
                
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                              flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="material-symbols-outlined text-white">folder_special</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">
                    {program.title}
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{program.mentees.length}</span> mentorado(s) • 
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1">{selectedCount}</span> selecionado(s)
                  </p>
                </div>
              </div>
              
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-2xl">
                expand_more
              </span>
            </div>

            {/* Lista de Mentorados */}
            <div className="border-t-2 border-border-light dark:border-border-dark divide-y divide-border-light/50 dark:divide-border-dark/50">
              {program.mentees.map((mentee) => (
                <div
                  key={mentee.mentorshipId}
                  className={`p-4 flex items-center gap-4 transition-all duration-200
                            ${canEdit ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10' : 'cursor-not-allowed'}`}
                  onClick={() => toggleMentorship(mentee.mentorshipId, mentee.userId)}
                >
                  {/* Checkbox */}
                  <div className={`
                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                    ${selectedMentorshipIds.has(mentee.mentorshipId)
                      ? 'bg-gradient-to-br from-primary to-violet-500 border-primary shadow-md shadow-primary/30'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }
                  `}>
                    {selectedMentorshipIds.has(mentee.mentorshipId) && (
                      <span className="material-symbols-outlined text-white text-sm">check</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                                flex items-center justify-center overflow-hidden border-2 border-primary/20
                                shadow-md">
                    {mentee.photoUrl ? (
                      <img src={mentee.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-primary text-xl">person</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                      {mentee.displayName}
                    </p>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                      {mentee.email}
                    </p>
                  </div>
                  
                  {selectedMentorshipIds.has(mentee.mentorshipId) && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold
                                   bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700
                                   dark:from-emerald-900/40 dark:to-green-900/40 dark:text-emerald-400
                                   border border-emerald-200 dark:border-emerald-800/50">
                      Selecionado
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Mentorados sem programa */}
      {unassignedMentees.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-purple-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-purple-500/10 
                      rounded-2xl border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="p-5 border-b-2 border-border-light dark:border-border-dark">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 
                            flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="material-symbols-outlined text-white">person</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">
                  Mentorados Individuais
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Mentorados sem programa associado
                </p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-border-light/50 dark:divide-border-dark/50">
            {unassignedMentees.map((mentee) => (
              <div
                key={mentee.mentorshipId}
                className={`p-4 flex items-center gap-4 transition-all duration-200
                          ${canEdit ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10' : 'cursor-not-allowed'}`}
                onClick={() => toggleMentorship(mentee.mentorshipId, mentee.userId)}
              >
                {/* Checkbox */}
                <div className={`
                  w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                  ${selectedMentorshipIds.has(mentee.mentorshipId)
                    ? 'bg-gradient-to-br from-primary to-violet-500 border-primary shadow-md shadow-primary/30'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                  }
                `}>
                  {selectedMentorshipIds.has(mentee.mentorshipId) && (
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  )}
                </div>
                
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                              flex items-center justify-center overflow-hidden border-2 border-primary/20
                              shadow-md">
                  {mentee.photoUrl ? (
                    <img src={mentee.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                    {mentee.displayName}
                  </p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                    {mentee.email}
                  </p>
                </div>
                
                {selectedMentorshipIds.has(mentee.mentorshipId) && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold
                                 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700
                                 dark:from-emerald-900/40 dark:to-green-900/40 dark:text-emerald-400
                                 border border-emerald-200 dark:border-emerald-800/50">
                    Selecionado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso de edição bloqueada */}
      {!canEdit && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-50 via-rose-50 to-red-50 
                      dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 
                      border-2 border-red-200 dark:border-red-800/50 rounded-2xl p-5
                      shadow-lg shadow-red-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 
                          flex items-center justify-center shadow-lg shadow-red-500/30 flex-shrink-0">
              <span className="material-symbols-outlined text-white">warning</span>
            </div>
            <div>
              <h4 className="font-bold text-red-800 dark:text-red-200 mb-1">Edição Bloqueada</h4>
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                O simulado já iniciou. Não é possível adicionar ou remover participantes após o início.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
