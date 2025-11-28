'use client';

import React, { useState, useEffect } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import type { UserPlan } from '@/types/admin/plan';
import { useToast } from '@/lib/contexts/ToastContext';

interface EditUserPlanDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPlan: UserPlan;
  onConfirm: (data: {
    startDate: Date;
    endDate: Date;
  }) => Promise<void>;
}

export function EditUserPlanDatesModal({
  isOpen,
  onClose,
  userPlan,
  onConfirm,
}: EditUserPlanDatesModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen && userPlan) {
      setStartDate(new Date(userPlan.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(userPlan.endDate).toISOString().split('T')[0]);
    }
  }, [isOpen, userPlan]);

  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      toast.error('Data de término deve ser posterior à data de início');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        startDate: start,
        endDate: end,
      });
      
      toast.success('Datas atualizadas com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar datas');
    } finally {
      setLoading(false);
    }
  };

  const duration = calculateDuration();
  const originalDuration = Math.ceil(
    (new Date(userPlan.endDate).getTime() - new Date(userPlan.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const durationChange = duration - originalDuration;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Período do Plano"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Info */}
        <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl">
          <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            Informações Atuais
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">Usuário:</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {userPlan.user?.name || userPlan.userId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">Plano:</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {userPlan.plan?.name || userPlan.planId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">Duração Original:</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {originalDuration} dias
              </span>
            </div>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Data de Término *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>
        </div>

        {/* Duration Info */}
        <div className={`p-4 rounded-xl ${
          durationChange > 0 
            ? 'bg-green-50 dark:bg-green-900/20' 
            : durationChange < 0 
            ? 'bg-orange-50 dark:bg-orange-900/20'
            : 'bg-blue-50 dark:bg-blue-900/20'
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${
                durationChange > 0 
                  ? 'text-green-700 dark:text-green-300' 
                  : durationChange < 0 
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                Nova Duração:
              </span>
              <span className={`font-bold ${
                durationChange > 0 
                  ? 'text-green-700 dark:text-green-300' 
                  : durationChange < 0 
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {duration} dias
              </span>
            </div>
            
            {durationChange !== 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`material-symbols-outlined ${
                  durationChange > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {durationChange > 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span className={`${
                  durationChange > 0 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {durationChange > 0 ? '+' : ''}{durationChange} dias
                  {durationChange > 0 ? ' (extensão)' : ' (redução)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        {durationChange < 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
                warning
              </span>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-semibold mb-1">Atenção!</p>
                <p>Você está reduzindo o período do plano. Esta ação pode afetar o acesso do usuário.</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-border-light dark:border-border-dark">
          <AdminButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            type="submit"
            loading={loading}
            icon="save"
          >
            Salvar Alterações
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
