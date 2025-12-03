'use client';

import { useState, useMemo } from 'react';
import { Calendar, X, Clock } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface MenteeExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mentorshipId: string;
  currentEndDate?: string;
}

export function MenteeExtendModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mentorshipId, 
  currentEndDate 
}: MenteeExtendModalProps) {
  const toast = useToast();
  const [days, setDays] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newEndDate = useMemo(() => {
    const base = currentEndDate ? new Date(currentEndDate) : new Date();
    base.setDate(base.getDate() + parseInt(days || '0'));
    return base.toLocaleDateString('pt-BR');
  }, [currentEndDate, days]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!days || parseInt(days) <= 0) {
      toast.error('Informe um número válido de dias');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/mentorship/mentor/mentees/${mentorshipId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ days: parseInt(days) }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Mentoria estendida em ${days} dias!`);
        onSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao estender mentoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-surface-light via-surface-light to-blue-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-blue-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-2xl dark:shadow-dark-2xl overflow-hidden
                    animate-zoom-in">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        {/* Header */}
        <div className="relative p-6 border-b-2 border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                            flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Estender Mentoria
                </h2>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Adicione mais dias ao período
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gradient-to-br from-background-light to-surface-light 
                       dark:from-background-dark dark:to-surface-dark 
                       border-2 border-border-light dark:border-border-dark
                       hover:border-red-500/50 hover:scale-110
                       transition-all duration-300"
            >
              <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
          {/* Days Input */}
          <div>
            <label className="block text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wider">
              Quantidade de Dias
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min="1"
              className="w-full px-4 py-4 bg-gradient-to-br from-background-light to-surface-light 
                       dark:from-background-dark dark:to-surface-dark 
                       border-2 border-border-light dark:border-border-dark 
                       rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                       text-2xl font-bold text-center transition-all duration-300"
              autoFocus
            />
          </div>

          {/* Quick Options */}
          <div className="grid grid-cols-4 gap-2">
            {[7, 15, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d.toString())}
                className={`
                  py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  ${days === d.toString()
                    ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30'
                    : 'bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:scale-105'
                  }
                `}
              >
                {d} dias
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50/50 
                        dark:from-blue-900/20 dark:via-blue-900/15 dark:to-cyan-900/10 
                        rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                            flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  Nova data de término
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {newEndDate}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-5 rounded-xl font-semibold
                       bg-gradient-to-br from-background-light to-surface-light 
                       dark:from-background-dark dark:to-surface-dark 
                       border-2 border-border-light dark:border-border-dark
                       hover:border-primary/50 hover:scale-[1.02]
                       transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 px-5 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl 
                       font-bold shadow-lg shadow-primary/30
                       hover:shadow-xl hover:scale-[1.02]
                       transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Estender
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
