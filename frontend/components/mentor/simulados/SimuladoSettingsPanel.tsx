'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { SimuladoSettings, SimuladoVisibility } from '@/app/mentor/simulados/criar/page';

interface SimuladoSettingsPanelProps {
  settings: SimuladoSettings;
  onChange: (settings: SimuladoSettings) => void;
}

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function SimuladoSettingsPanel({ settings, onChange }: SimuladoSettingsPanelProps) {
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoadingMentees, setIsLoadingMentees] = useState(false);

  // Carregar mentorados quando visibilidade for 'selected'
  useEffect(() => {
    if (settings.visibility === 'selected' && mentees.length === 0) {
      loadMentees();
    }
  }, [settings.visibility]);

  const loadMentees = async () => {
    setIsLoadingMentees(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implementar chamada real à API
      setMentees([]);
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error);
    } finally {
      setIsLoadingMentees(false);
    }
  };

  const toggleMentee = (menteeId: string) => {
    const newSelected = settings.selectedMentees.includes(menteeId)
      ? settings.selectedMentees.filter(id => id !== menteeId)
      : [...settings.selectedMentees, menteeId];
    onChange({ ...settings, selectedMentees: newSelected });
  };

  const visibilityOptions: { id: SimuladoVisibility; label: string; description: string; icon: string }[] = [
    {
      id: 'public',
      label: 'Público',
      description: 'Qualquer usuário ativo da plataforma pode responder',
      icon: 'public',
    },
    {
      id: 'private',
      label: 'Privado',
      description: 'Apenas seus mentorados podem responder',
      icon: 'lock',
    },
    {
      id: 'selected',
      label: 'Selecionados',
      description: 'Apenas usuários específicos podem responder',
      icon: 'group',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Informações básicas */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
        border border-border-light dark:border-border-dark">
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
          Informações Básicas
        </h2>

        <div className="space-y-5">
          {/* Nome */}
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

          {/* Descrição */}
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
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                resize-none"
            />
          </div>

          {/* Tempo limite */}
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
                minutos (deixe vazio para sem limite)
              </span>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Opções
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark
                rounded-xl cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => onChange({ ...settings, shuffleQuestions: e.target.checked })}
                  className="w-5 h-5 rounded border-border-light dark:border-border-dark
                    text-primary focus:ring-primary/30"
                />
                <div>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    Embaralhar questões
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    A ordem das questões será aleatória para cada usuário
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark
                rounded-xl cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showResults}
                  onChange={(e) => onChange({ ...settings, showResults: e.target.checked })}
                  className="w-5 h-5 rounded border-border-light dark:border-border-dark
                    text-primary focus:ring-primary/30"
                />
                <div>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    Mostrar resultados
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    O usuário verá o gabarito após finalizar o simulado
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Visibilidade */}
      <div className="space-y-6">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
          border border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Visibilidade
          </h2>

          <div className="space-y-3">
            {visibilityOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onChange({ ...settings, visibility: option.id, selectedMentees: [] })}
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
                    settings.visibility === option.id
                      ? 'text-primary'
                      : 'text-text-light-primary dark:text-text-dark-primary'
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

        {/* Seleção de mentorados */}
        {settings.visibility === 'selected' && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
            border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                Selecionar Usuários
              </h3>
              {settings.selectedMentees.length > 0 && (
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {settings.selectedMentees.length} selecionado(s)
                </span>
              )}
            </div>

            {isLoadingMentees ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mentees.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                  group_off
                </span>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Nenhum mentorado encontrado
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mentees.map((mentee) => (
                  <button
                    key={mentee.id}
                    onClick={() => toggleMentee(mentee.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
                      ${settings.selectedMentees.includes(mentee.id)
                        ? 'bg-primary/10 dark:bg-primary/20 border border-primary'
                        : 'bg-background-light dark:bg-background-dark border border-transparent hover:border-primary/30'
                      }`}
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                      {mentee.avatar ? (
                        <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                        {mentee.name}
                      </p>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                        {mentee.email}
                      </p>
                    </div>
                    <span className={`material-symbols-outlined transition-colors ${
                      settings.selectedMentees.includes(mentee.id)
                        ? 'text-primary'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}>
                      {settings.selectedMentees.includes(mentee.id) ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
