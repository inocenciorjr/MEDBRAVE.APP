'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import Dropdown from '@/components/ui/Dropdown';
import { 
  ClockIcon, 
  XMarkIcon, 
  RectangleStackIcon,
  ListBulletIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface PlannerScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ScheduleSettings {
  flashcard_start_hour: number;
  flashcard_end_hour: number;
  question_start_hour: number;
  question_end_hour: number;
  error_notebook_start_hour: number;
  error_notebook_end_hour: number;
}

export function PlannerScheduleSettingsModal({ isOpen, onClose, onSuccess }: PlannerScheduleSettingsModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [pendingType, setPendingType] = useState<'flashcard' | 'question' | 'error_notebook' | null>(null);
  
  const [settings, setSettings] = useState<ScheduleSettings>({
    flashcard_start_hour: 10,
    flashcard_end_hour: 14,
    question_start_hour: 15,
    question_end_hour: 17,
    error_notebook_start_hour: 18,
    error_notebook_end_hour: 20,
  });

  const [originalSettings, setOriginalSettings] = useState<ScheduleSettings>(settings);

  // Animação do modal
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
      loadSettings();
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const response = await fetchWithAuth('/api/review-preferences');
      if (response.ok) {
        const data = await response.json();
        const prefs = data.data;
        
        const loadedSettings = {
          flashcard_start_hour: prefs.flashcard_start_hour || 10,
          flashcard_end_hour: prefs.flashcard_end_hour || 14,
          question_start_hour: prefs.question_start_hour || 15,
          question_end_hour: prefs.question_end_hour || 17,
          error_notebook_start_hour: prefs.error_notebook_start_hour || 18,
          error_notebook_end_hour: prefs.error_notebook_end_hour || 20,
        };
        
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSave = async (type: 'flashcard' | 'question' | 'error_notebook') => {
    setPendingType(type);
    setShowApplyDialog(true);
  };

  const applyChanges = async (updateFutureOnly: boolean) => {
    if (!pendingType) return;
    
    setIsSaving(true);
    setShowApplyDialog(false);

    try {
      // 1. Salvar preferências
      const response = await fetchWithAuth('/api/review-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Erro ao salvar preferências');

      // 2. Atualizar eventos existentes
      const updateResponse = await fetchWithAuth('/api/review-preferences/update-planner-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateFutureOnly }),
      });

      if (!updateResponse.ok) throw new Error('Erro ao atualizar eventos');

      const result = await updateResponse.json();
      
      toast.success(`Horários salvos! ${result.data.updated} eventos atualizados.`);
      setOriginalSettings(settings);
      setPendingType(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (type: 'flashcard' | 'question' | 'error_notebook') => {
    const prefix = type;
    return (
      settings[`${prefix}_start_hour` as keyof ScheduleSettings] !== 
      originalSettings[`${prefix}_start_hour` as keyof ScheduleSettings] ||
      settings[`${prefix}_end_hour` as keyof ScheduleSettings] !== 
      originalSettings[`${prefix}_end_hour` as keyof ScheduleSettings]
    );
  };

  const renderTimeSelect = (value: number, onChange: (value: number) => void, label: string) => {
    const timeOptions = Array.from({ length: 24 }, (_, i) => ({
      value: i.toString(),
      label: `${i.toString().padStart(2, '0')}:00`
    }));

    return (
      <Dropdown
        options={timeOptions}
        value={value.toString()}
        onChange={(val) => onChange(parseInt(val))}
        label={label}
        fullWidth
      />
    );
  };

  const renderScheduleCard = (
    type: 'flashcard' | 'question' | 'error_notebook',
    title: string,
    color: string
  ) => {
    const startKey = `${type}_start_hour` as keyof ScheduleSettings;
    const endKey = `${type}_end_hour` as keyof ScheduleSettings;

    return (
      <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-lg sm:rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
            color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
            color === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900/30' : 
            'bg-green-100 dark:bg-green-900/30'
          }`}>
            {type === 'flashcard' && <RectangleStackIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />}
            {type === 'question' && <ListBulletIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 dark:text-cyan-400" />}
            {type === 'error_notebook' && <BookOpenIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />}
          </div>
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {renderTimeSelect(
            settings[startKey], 
            (value) => setSettings({ ...settings, [startKey]: value }),
            'Horário de Início'
          )}

          {renderTimeSelect(
            settings[endKey], 
            (value) => setSettings({ ...settings, [endKey]: value }),
            'Horário de Término'
          )}

          <button
            onClick={() => handleSave(type)}
            disabled={!hasChanges(type) || isSaving}
            className={`w-full py-2 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              hasChanges(type) && !isSaving
                ? (color === 'purple' ? 'bg-purple-600 text-white hover:bg-purple-700' :
                   color === 'cyan' ? 'bg-cyan-600 text-white hover:bg-cyan-700' :
                   'bg-green-600 text-white hover:bg-green-700')
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Salvando...' : 'Salvar Horário'}
          </button>
        </div>
      </div>
    );
  };

  if (!shouldRender) return null;

  const modalContent = (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9998] ${
          isAnimating ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg lg:max-w-2xl bg-white dark:bg-surface-dark shadow-2xl z-[9999] transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-border-dark px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">
              Configurar Horários
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
            Defina os horários padrão para cada tipo de revisão. Novos eventos serão criados automaticamente com esses horários.
          </p>

          <div className="space-y-4 sm:space-y-6">
            {renderScheduleCard('flashcard', 'Flashcards', 'purple')}
            {renderScheduleCard('question', 'Questões', 'cyan')}
            {renderScheduleCard('error_notebook', 'Caderno de Erros', 'green')}
          </div>
        </div>
      </div>

      {/* Dialog de Aplicação */}
      {showApplyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-surface-dark rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              Aplicar Alterações
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Deseja aplicar os novos horários apenas para eventos futuros ou também para os existentes?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => applyChanges(true)}
                disabled={isSaving}
                className="flex-1 py-2 px-3 sm:px-4 bg-primary text-white rounded-lg font-medium text-sm sm:text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Apenas Futuros
              </button>
              <button
                onClick={() => applyChanges(false)}
                disabled={isSaving}
                className="flex-1 py-2 px-3 sm:px-4 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setShowApplyDialog(false);
                  setPendingType(null);
                }}
                disabled={isSaving}
                className="py-2 px-3 sm:px-4 border border-gray-300 dark:border-border-dark text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-background-dark transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
