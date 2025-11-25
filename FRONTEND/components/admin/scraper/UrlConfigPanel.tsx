/**
 * UrlConfigPanel Component
 * 
 * Painel de configuração individual para cada URL no batch processing.
 * Permite configurar se a URL deve ser salva como prova oficial e seus metadados.
 */

import React, { useState } from 'react';
import Checkbox from '@/components/ui/Checkbox';

interface UrlConfigPanelProps {
  url: string;
  config: {
    saveAsOfficial: boolean;
    officialExamData?: {
      examName: string;
      examYear: number;
      examEdition?: string;
      institution?: string;
      examType: 'revalida' | 'enare' | 'residencia' | 'concurso' | 'outro';
      title: string;
      description?: string;
      timeLimitMinutes?: number;
      passingScore?: number;
    };
  };
  onChange: (url: string, config: any) => void;
  onRemove: (url: string) => void;
}

export const UrlConfigPanel: React.FC<UrlConfigPanelProps> = ({
  url,
  config,
  onChange,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleOfficial = () => {
    onChange(url, {
      ...config,
      saveAsOfficial: !config.saveAsOfficial,
      officialExamData: !config.saveAsOfficial
        ? {
            examName: '',
            examYear: new Date().getFullYear(),
            examType: 'revalida' as const,
            title: '',
            passingScore: 60,
          }
        : undefined,
    });
  };

  const handleExamDataChange = (field: string, value: any) => {
    onChange(url, {
      ...config,
      officialExamData: {
        ...config.officialExamData,
        [field]: value,
      },
    });
  };

  // Validar URL
  const isValidUrl = () => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('provaderesidencia.com.br');
    } catch {
      return false;
    }
  };

  const urlValid = isValidUrl();

  return (
    <div className="border border-border-light dark:border-border-dark rounded-lg p-4 bg-surface-light dark:bg-surface-dark">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {urlValid ? (
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            ) : (
              <span className="text-red-600 dark:text-red-400 text-sm">✗</span>
            )}
            <span className="text-sm font-mono text-text-light-primary dark:text-text-dark-primary truncate">
              {url}
            </span>
          </div>

          {/* Toggle Prova Oficial */}
          <Checkbox
            checked={config.saveAsOfficial}
            onChange={handleToggleOfficial}
            label="Salvar como Prova Oficial"
          />

          {/* Formulário de Prova Oficial */}
          {config.saveAsOfficial && (
            <div className="mt-3 space-y-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
                {isExpanded ? 'Ocultar' : 'Configurar'} metadados da prova
              </button>

              {isExpanded && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Título *</label>
                      <input
                        type="text"
                        value={config.officialExamData?.title || ''}
                        onChange={(e) => handleExamDataChange('title', e.target.value)}
                        placeholder="Ex: Revalida 2025"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Nome do Exame *</label>
                      <input
                        type="text"
                        value={config.officialExamData?.examName || ''}
                        onChange={(e) => handleExamDataChange('examName', e.target.value)}
                        placeholder="Ex: Revalida"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Ano *</label>
                      <input
                        type="number"
                        value={config.officialExamData?.examYear || new Date().getFullYear()}
                        onChange={(e) => handleExamDataChange('examYear', parseInt(e.target.value))}
                        min="2000"
                        max="2100"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Edição</label>
                      <input
                        type="text"
                        value={config.officialExamData?.examEdition || ''}
                        onChange={(e) => handleExamDataChange('examEdition', e.target.value)}
                        placeholder="1ª Etapa"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Tipo *</label>
                      <select
                        value={config.officialExamData?.examType || 'revalida'}
                        onChange={(e) => handleExamDataChange('examType', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      >
                        <option value="revalida">Revalida</option>
                        <option value="enare">ENARE</option>
                        <option value="residencia">Residência</option>
                        <option value="concurso">Concurso</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Instituição</label>
                    <input
                      type="text"
                      value={config.officialExamData?.institution || ''}
                      onChange={(e) => handleExamDataChange('institution', e.target.value)}
                      placeholder="Ex: INEP"
                      className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Descrição</label>
                    <textarea
                      value={config.officialExamData?.description || ''}
                      onChange={(e) => handleExamDataChange('description', e.target.value)}
                      placeholder="Descrição da prova..."
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Tempo (min)</label>
                      <input
                        type="number"
                        value={config.officialExamData?.timeLimitMinutes || 0}
                        onChange={(e) => handleExamDataChange('timeLimitMinutes', parseInt(e.target.value))}
                        placeholder="180"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Nota de Corte (%)</label>
                      <input
                        type="number"
                        value={config.officialExamData?.passingScore || 60}
                        onChange={(e) => handleExamDataChange('passingScore', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão Remover */}
        <button
          onClick={() => onRemove(url)}
          className="px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          title="Remover URL"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>

      {!urlValid && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          ⚠️ URL inválida ou domínio não suportado
        </div>
      )}
    </div>
  );
};
