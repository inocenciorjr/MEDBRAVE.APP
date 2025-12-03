'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface SimuladoOverviewTabProps {
  simulado: {
    id: string;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'closed';
    visibility: 'public' | 'private' | 'selected';
    scheduled_at: string | null;
    time_limit_minutes: number | null;
    shuffle_questions: boolean;
    show_results: boolean;
    question_count: number;
    respondents_count: number;
    average_score: number | null;
    created_at: string;
    updated_at: string;
  };
  canEdit: boolean;
  onUpdate: (updates: any) => Promise<boolean>;
}

export function SimuladoOverviewTab({ simulado, canEdit, onUpdate }: SimuladoOverviewTabProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleEdit = (field: string, value: string) => {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(value);
  };

  const handleSave = async (field: string) => {
    setSaving(true);
    const success = await onUpdate({ [field]: editValue });
    if (success) {
      setEditingField(null);
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'closed') => {
    await onUpdate({ status: newStatus });
  };

  const handleVisibilityChange = async (newVisibility: 'public' | 'private' | 'selected') => {
    await onUpdate({ visibility: newVisibility, is_public: newVisibility === 'public' });
  };

  const statusConfig = {
    draft: { label: 'Rascunho', icon: 'edit_note', gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-400' },
    active: { label: 'Ativo', icon: 'play_circle', gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-700 dark:text-emerald-400' },
    closed: { label: 'Encerrado', icon: 'check_circle', gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50 dark:bg-slate-800/20', border: 'border-slate-200 dark:border-slate-700/50', text: 'text-slate-600 dark:text-slate-400' }
  };

  const visibilityConfig = {
    public: { label: 'Público', icon: 'public', gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-700 dark:text-blue-400' },
    private: { label: 'Privado', icon: 'lock', gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50 dark:bg-slate-800/20', border: 'border-slate-200 dark:border-slate-700/50', text: 'text-slate-600 dark:text-slate-400' },
    selected: { label: 'Selecionados', icon: 'group', gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/50', text: 'text-purple-700 dark:text-purple-400' }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Informações Principais */}
      <div className="lg:col-span-2 space-y-6">
        {/* Nome e Descrição */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 
                            flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white text-xl">info</span>
              </div>
              <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Informações do Simulado
              </h3>
            </div>
            
            <div className="space-y-5">
              {/* Nome */}
              <div className="group">
                <label className="block text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">
                  Nome
                </label>
                {editingField === 'name' ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-primary bg-background-light dark:bg-background-dark 
                               text-text-light-primary dark:text-text-dark-primary font-medium
                               focus:ring-4 focus:ring-primary/20 transition-all duration-200"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave('name')}
                      disabled={saving}
                      className="px-5 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl 
                               font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                               disabled:opacity-50 transition-all duration-200 hover:scale-105"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-5 py-3 bg-border-light dark:bg-border-dark rounded-xl font-semibold
                               hover:opacity-80 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`
                      flex items-center justify-between p-4 rounded-xl 
                      bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                      border-2 border-border-light dark:border-border-dark
                      shadow-sm hover:shadow-md dark:shadow-dark-lg
                      transition-all duration-300
                      ${canEdit ? 'cursor-pointer hover:border-primary/50 hover:scale-[1.01] group-hover:bg-primary/5' : ''}
                    `}
                    onClick={() => handleEdit('name', simulado.name)}
                  >
                    <span className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                      {simulado.name}
                    </span>
                    {canEdit && (
                      <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                     group-hover:text-primary transition-colors">
                        edit
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="group">
                <label className="block text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wider">
                  Descrição
                </label>
                {editingField === 'description' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-primary bg-background-light dark:bg-background-dark 
                               text-text-light-primary dark:text-text-dark-primary
                               focus:ring-4 focus:ring-primary/20 transition-all duration-200 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave('description')}
                        disabled={saving}
                        className="px-5 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl 
                                 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                                 disabled:opacity-50 transition-all duration-200 hover:scale-105"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="px-5 py-3 bg-border-light dark:bg-border-dark rounded-xl font-semibold
                                 hover:opacity-80 transition-all duration-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`
                      p-4 rounded-xl min-h-[100px]
                      bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                      border-2 border-border-light dark:border-border-dark
                      shadow-sm hover:shadow-md dark:shadow-dark-lg
                      transition-all duration-300
                      ${canEdit ? 'cursor-pointer hover:border-primary/50 hover:scale-[1.01]' : ''}
                    `}
                    onClick={() => handleEdit('description', simulado.description || '')}
                  >
                    <span className={`${simulado.description ? 'text-text-light-primary dark:text-text-dark-primary' : 'text-text-light-secondary dark:text-text-dark-secondary italic'}`}>
                      {simulado.description || 'Sem descrição - clique para adicionar'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          {/* Background decoration */}
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                            flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="material-symbols-outlined text-white text-xl">settings</span>
              </div>
              <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Configurações
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Tempo Limite */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg dark:shadow-dark-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 
                                flex items-center justify-center shadow-md shadow-violet-500/30
                                group-hover:shadow-lg group-hover:shadow-violet-500/40 transition-shadow">
                    <span className="material-symbols-outlined text-white">timer</span>
                  </div>
                  <span className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Tempo Limite
                  </span>
                </div>
                <span className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {simulado.time_limit_minutes ? `${simulado.time_limit_minutes} min` : 'Sem limite'}
                </span>
              </div>

              {/* Embaralhar */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg dark:shadow-dark-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 
                                flex items-center justify-center shadow-md shadow-pink-500/30
                                group-hover:shadow-lg group-hover:shadow-pink-500/40 transition-shadow">
                    <span className="material-symbols-outlined text-white">shuffle</span>
                  </div>
                  <span className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Embaralhar
                  </span>
                </div>
                <span className={`text-2xl font-bold ${simulado.shuffle_questions ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {simulado.shuffle_questions ? 'Sim' : 'Não'}
                </span>
              </div>

              {/* Mostrar Resultados */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg dark:shadow-dark-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 
                                flex items-center justify-center shadow-md shadow-blue-500/30
                                group-hover:shadow-lg group-hover:shadow-blue-500/40 transition-shadow">
                    <span className="material-symbols-outlined text-white">visibility</span>
                  </div>
                  <span className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Mostrar Resultados
                  </span>
                </div>
                <span className={`text-2xl font-bold ${simulado.show_results ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {simulado.show_results ? 'Sim' : 'Não'}
                </span>
              </div>

              {/* Agendamento */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg dark:shadow-dark-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 
                                flex items-center justify-center shadow-md shadow-orange-500/30
                                group-hover:shadow-lg group-hover:shadow-orange-500/40 transition-shadow">
                    <span className="material-symbols-outlined text-white">schedule</span>
                  </div>
                  <span className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                    Agendamento
                  </span>
                </div>
                <span className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  {simulado.scheduled_at 
                    ? format(new Date(simulado.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : 'Imediato'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Status */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-amber-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-amber-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 
                          flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="material-symbols-outlined text-white">flag</span>
            </div>
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Status
            </h3>
          </div>
          <div className="space-y-3">
            {(['draft', 'active', 'closed'] as const).map((status) => {
              const config = statusConfig[status];
              const isSelected = simulado.status === status;
              return (
                <button
                  key={status}
                  onClick={() => canEdit && handleStatusChange(status)}
                  disabled={!canEdit}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-3
                    border-2 shadow-md hover:shadow-lg
                    ${isSelected 
                      ? `${config.bg} ${config.border} ${config.text} scale-[1.02]` 
                      : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark hover:border-primary/30'
                    }
                    ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md
                                ${isSelected ? `bg-gradient-to-br ${config.gradient} shadow-lg` : 'bg-border-light dark:bg-border-dark'}`}>
                    <span className={`material-symbols-outlined ${isSelected ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                      {config.icon}
                    </span>
                  </div>
                  <span className={`font-semibold ${isSelected ? config.text : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                    {config.label}
                  </span>
                  {isSelected && (
                    <span className="material-symbols-outlined ml-auto text-lg">check_circle</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibilidade */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-blue-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-blue-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                          flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="material-symbols-outlined text-white">visibility</span>
            </div>
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Visibilidade
            </h3>
          </div>
          <div className="space-y-3">
            {(['public', 'private', 'selected'] as const).map((visibility) => {
              const config = visibilityConfig[visibility];
              const isSelected = simulado.visibility === visibility;
              return (
                <button
                  key={visibility}
                  onClick={() => canEdit && handleVisibilityChange(visibility)}
                  disabled={!canEdit}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-3
                    border-2 shadow-md hover:shadow-lg
                    ${isSelected 
                      ? `${config.bg} ${config.border} ${config.text} scale-[1.02]` 
                      : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark hover:border-primary/30'
                    }
                    ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md
                                ${isSelected ? `bg-gradient-to-br ${config.gradient} shadow-lg` : 'bg-border-light dark:bg-border-dark'}`}>
                    <span className={`material-symbols-outlined ${isSelected ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                      {config.icon}
                    </span>
                  </div>
                  <span className={`font-semibold ${isSelected ? config.text : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                    {config.label}
                  </span>
                  {isSelected && (
                    <span className="material-symbols-outlined ml-auto text-lg">check_circle</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-emerald-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-emerald-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 
                          flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="material-symbols-outlined text-white">bar_chart</span>
            </div>
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Estatísticas
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-background-light dark:bg-background-dark
                          border border-border-light dark:border-border-dark">
              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">Questões</span>
              <span className="font-bold text-lg text-cyan-600 dark:text-cyan-400">
                {simulado.question_count}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-background-light dark:bg-background-dark
                          border border-border-light dark:border-border-dark">
              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">Participantes</span>
              <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                {simulado.respondents_count}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-background-light dark:bg-background-dark
                          border border-border-light dark:border-border-dark">
              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">Média</span>
              <span className="font-bold text-lg text-violet-600 dark:text-violet-400">
                {simulado.average_score !== null ? formatPercentSimple(simulado.average_score) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
