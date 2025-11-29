'use client';

import React, { useState } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import type { User } from '@/types/admin/user';
import { useToast } from '@/lib/contexts/ToastContext';

interface SuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: (userId: string, reason: string, duration?: number) => Promise<void>;
}

export function SuspendUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: SuspendUserModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [durationType, setDurationType] = useState<'temporary' | 'indefinite'>('temporary');
  const [durationDays, setDurationDays] = useState(7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!reason.trim()) {
      toast.error('O motivo da suspensão é obrigatório');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('O motivo deve ter pelo menos 10 caracteres');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(
        user.id,
        reason.trim(),
        durationType === 'temporary' ? durationDays : undefined
      );
      
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao suspender usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDurationType('temporary');
    setDurationDays(7);
    onClose();
  };

  const calculateReactivationDate = () => {
    if (durationType === 'indefinite') return null;
    const date = new Date();
    date.setDate(date.getDate() + durationDays);
    return date;
  };

  const reactivationDate = calculateReactivationDate();

  if (!user) return null;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Suspender Usuário"
      subtitle="Esta ação bloqueará temporariamente o acesso do usuário"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info */}
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">
              warning
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Você está prestes a suspender:
              </h4>
              <div className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                <p><strong>Nome:</strong> {user.display_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Type */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Tipo de Suspensão
          </label>
          
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-surface-light dark:hover:bg-surface-dark/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
              <input
                type="radio"
                name="durationType"
                value="temporary"
                checked={durationType === 'temporary'}
                onChange={(e) => setDurationType(e.target.value as 'temporary')}
                className="mt-1 w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  Suspensão Temporária
                </div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  O usuário será reativado automaticamente após o período especificado
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-surface-light dark:hover:bg-surface-dark/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10">
              <input
                type="radio"
                name="durationType"
                value="indefinite"
                checked={durationType === 'indefinite'}
                onChange={(e) => setDurationType(e.target.value as 'indefinite')}
                className="mt-1 w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  Suspensão Indefinida
                </div>
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  O usuário permanecerá suspenso até reativação manual
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Duration Days */}
        {durationType === 'temporary' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Duração da Suspensão
            </label>
            
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    durationDays === days
                      ? 'border-primary bg-primary text-white'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Ou especifique (dias)
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                min="1"
                max="365"
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {reactivationDate && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                    event
                  </span>
                  <span className="text-blue-700 dark:text-blue-300">
                    Reativação automática em: <strong>{reactivationDate.toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Motivo da Suspensão *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da suspensão (mínimo 10 caracteres)..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary/50 dark:placeholder:text-text-dark-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            required
          />
          <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
            <span>Mínimo 10 caracteres</span>
            <span className={reason.length < 10 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
              {reason.length} caracteres
            </span>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
              info
            </span>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-semibold mb-1">Importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>O usuário não poderá fazer login durante a suspensão</li>
                <li>Todas as sessões ativas serão encerradas</li>
                <li>Esta ação será registrada nos logs de auditoria</li>
                <li>O usuário será notificado por email</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
          <AdminButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            type="submit"
            variant="danger"
            loading={loading}
            icon="block"
          >
            Suspender Usuário
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
