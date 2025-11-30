'use client';

import { useState, useEffect } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import { useToast } from '@/lib/contexts/ToastContext';
import { createUserPlan } from '@/services/admin/userPlanService';
import { searchUsers } from '@/services/admin/userService';
import type { PaymentMethod } from '@/types/admin/plan';
import type { User } from '@/types/admin/user';

interface AddUsersToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  onSuccess: () => void;
}

export function AddUsersToPlanModal({
  isOpen,
  onClose,
  planId,
  planName,
  onSuccess,
}: AddUsersToPlanModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ADMIN');
  const [autoRenew, setAutoRenew] = useState(false);
  const [searching, setSearching] = useState(false);

  // Carregar lista inicial de usuários ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadInitialUsers();
    }
  }, [isOpen]);

  const loadInitialUsers = async () => {
    setSearching(true);
    try {
      const results = await searchUsers('', 100); // Busca vazia retorna os primeiros usuários
      setSearchResults(results);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Buscar usuários quando o query mudar
  useEffect(() => {
    if (!searchQuery.trim()) {
      return; // Não buscar se estiver vazio, já temos a lista inicial
    }

    const delaySearch = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(searchQuery, 50);
        setSearchResults(results);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const newSelected = new Set(selectedUsers);
    searchResults.forEach(user => newSelected.add(user.id));
    setSelectedUsers(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUsers.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const results = await Promise.allSettled(
        Array.from(selectedUsers).map(userId =>
          createUserPlan({
            userId,
            planId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            paymentMethod,
            autoRenew,
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`${successful} usuário(s) adicionado(s) com sucesso!`);
      }
      if (failed > 0) {
        toast.error(`${failed} usuário(s) falharam ao ser adicionados`);
      }

      if (successful > 0) {
        handleClose();
        onSuccess();
      }
    } catch (error: any) {
      toast.error('Erro ao adicionar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers(new Set());
    setDurationDays(30);
    setPaymentMethod('ADMIN');
    setAutoRenew(false);
    onClose();
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Adicionar Usuários ao Plano: ${planName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Busca de usuários */}
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Buscar Usuários *
            </label>
            <AdminInput
              placeholder="Digite nome ou email para buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon="search"
            />
            {searching && (
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                Buscando...
              </p>
            )}
          </div>

          {/* Lista de resultados */}
          {searchResults.length > 0 && (
            <div className="border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
              <div className="bg-surface-light dark:bg-surface-dark px-4 py-2 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  {searchResults.length} resultado(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    Selecionar todos
                  </button>
                  {selectedUsers.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 cursor-pointer border-b border-border-light dark:border-border-dark last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt={user.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {user.display_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-text-light-primary dark:text-text-dark-primary text-sm">
                          {user.display_name}
                        </div>
                        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Usuários selecionados */}
          {selectedUsers.size > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{selectedUsers.size}</span> usuário(s) selecionado(s)
              </p>
            </div>
          )}

          {/* Configurações do plano */}
          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="Duração (dias) *"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
              min="1"
              required
            />

            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Método de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="ADMIN">Admin (Manual)</option>
                <option value="PIX">PIX</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border-light dark:border-border-dark text-primary focus:ring-2 focus:ring-primary"
            />
            <label
              htmlFor="autoRenew"
              className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer"
            >
              Ativar renovação automática
            </label>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                info
              </span>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Atenção:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Todos os usuários receberão o mesmo plano</li>
                  <li>A data de início será hoje</li>
                  <li>A data de término será calculada automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-border-light dark:border-border-dark">
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
            loading={loading}
            icon="person_add"
            disabled={selectedUsers.size === 0}
          >
            Adicionar {selectedUsers.size > 0 ? `${selectedUsers.size} ` : ''}Usuários
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
