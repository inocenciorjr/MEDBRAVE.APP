'use client';

import React, { useState } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import type { User } from '@/types/admin/user';
import { useToast } from '@/lib/contexts/ToastContext';

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: (userId: string, reason: string) => Promise<void>;
}

export function BanUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: BanUserModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!reason.trim()) {
      toast.error('O motivo do banimento é obrigatório');
      return;
    }

    if (reason.trim().length < 20) {
      toast.error('O motivo deve ter pelo menos 20 caracteres');
      return;
    }

    if (confirmText !== 'BANIR') {
      toast.error('Digite "BANIR" para confirmar');
      return;
    }

    if (!understood) {
      toast.error('Você precisa confirmar que entendeu as consequências');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(user.id, reason.trim());
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao banir usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmText('');
    setUnderstood(false);
    onClose();
  };

  const canSubmit = reason.trim().length >= 20 && confirmText === 'BANIR' && understood;

  if (!user) return null;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Banir Usuário Permanentemente"
      subtitle="ATENÇÃO: Esta ação é irreversível e permanente"
      size="md"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Critical Warning */}
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl animate-pulse">
              dangerous
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-red-900 dark:text-red-100 text-lg mb-2">
                AÇÃO CRÍTICA E PERMANENTE
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Você está prestes a banir permanentemente este usuário. Esta é a ação mais severa disponível.
              </p>
              <div className="space-y-1 text-sm text-red-800 dark:text-red-200">
                <p><strong>Nome:</strong> {user.display_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded">{user.id}</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Consequences */}
        <div className="space-y-3">
          <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">
              gavel
            </span>
            Consequências do Banimento
          </h4>
          
          <div className="space-y-2">
            {[
              'O usuário será PERMANENTEMENTE bloqueado',
              'Todas as sessões ativas serão encerradas imediatamente',
              'O acesso à plataforma será negado para sempre',
              'Não será possível reverter esta ação',
              'O usuário não poderá criar nova conta com o mesmo email',
              'Todos os dados serão mantidos para auditoria',
              'Esta ação será registrada nos logs permanentes',
            ].map((consequence, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-background-light dark:bg-background-dark rounded-lg">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm mt-0.5">
                  close
                </span>
                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  {consequence}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Motivo do Banimento Permanente *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva detalhadamente o motivo do banimento permanente (mínimo 20 caracteres)..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border-2 border-red-300 dark:border-red-700 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary/50 dark:placeholder:text-text-dark-secondary/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            required
          />
          <div className="flex justify-between text-xs">
            <span className="text-text-light-secondary dark:text-text-dark-secondary">
              Mínimo 20 caracteres (seja específico e detalhado)
            </span>
            <span className={reason.length < 20 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400'}>
              {reason.length} caracteres
            </span>
          </div>
        </div>

        {/* Understanding Checkbox */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-yellow-500 text-yellow-600 focus:ring-2 focus:ring-yellow-500"
            />
            <div className="flex-1 text-sm text-yellow-900 dark:text-yellow-100">
              <p className="font-semibold mb-1">Eu entendo que:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
                <li>Esta ação é <strong>PERMANENTE e IRREVERSÍVEL</strong></li>
                <li>O usuário nunca mais poderá acessar a plataforma</li>
                <li>Sou responsável por esta decisão</li>
                <li>Esta ação será auditada e registrada</li>
              </ul>
            </div>
          </label>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Digite "BANIR" para confirmar *
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Digite BANIR em letras maiúsculas"
            className={`w-full px-4 py-3 rounded-xl border-2 font-mono font-bold text-center text-lg ${
              confirmText === 'BANIR'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary'
            } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
            required
          />
          {confirmText && confirmText !== 'BANIR' && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              Texto incorreto. Digite exatamente "BANIR"
            </p>
          )}
        </div>

        {/* Final Warning */}
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl">
              warning
            </span>
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-bold mb-1">ÚLTIMA CONFIRMAÇÃO:</p>
              <p>
                Ao clicar em "Banir Permanentemente", você confirma que revisou todas as informações,
                entende as consequências e assume total responsabilidade por esta ação irreversível.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t-2 border-red-200 dark:border-red-800">
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
            disabled={!canSubmit}
            icon="gavel"
          >
            Banir Permanentemente
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
