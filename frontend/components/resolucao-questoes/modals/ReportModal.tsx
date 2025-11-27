'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';

interface ReportModalProps {
  questionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ questionId, isOpen, onClose }: ReportModalProps) {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset form when closing
      setReportType('');
      setDescription('');
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType || !description.trim()) {
      toast.warning('Por favor, selecione um tipo de problema e descreva-o');
      return;
    }

    try {
      setLoading(true);
      // TODO: Implementar API de reports
      console.log('Report:', { questionId, reportType, description });
      toast.success('Obrigado pelo seu feedback! Vamos analisar o problema reportado.');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar report:', error);
      toast.error('Erro ao enviar report. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const reportTypes = [
    { value: 'wrong_answer', label: 'Resposta incorreta' },
    { value: 'typo', label: 'Erro de digitação' },
    { value: 'unclear', label: 'Enunciado confuso' },
    { value: 'outdated', label: 'Conteúdo desatualizado' },
    { value: 'image_issue', label: 'Problema com imagem' },
    { value: 'other', label: 'Outro' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] max-w-2xl w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border-light dark:border-border-dark p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Reportar Problema
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Ajude-nos a melhorar a qualidade das questões
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all hover:scale-110 active:scale-95"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Problema */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              Tipo de Problema *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                    reportType === type.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Descrição do Problema *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema encontrado..."
              className="w-full px-4 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows={5}
              required
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-all hover:scale-105 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !reportType || !description.trim()}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  Enviar Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
