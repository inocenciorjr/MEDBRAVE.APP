'use client';

import { useState } from 'react';
import { AdminButton } from '../ui/AdminButton';
import { useToast } from '@/lib/contexts/ToastContext';
import { cancelUserPlan, renewUserPlan, updateUserPlanDates } from '@/services/admin/userPlanService';
import type { UserPlan } from '@/types/admin/plan';

interface PlanUsersTableProps {
  planId: string;
  userPlans: UserPlan[];
  onRefresh: () => void;
}

export function PlanUsersTable({ planId, userPlans, onRefresh }: PlanUsersTableProps) {
  const toast = useToast();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editDates, setEditDates] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUserPlans = userPlans.filter(up => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      up.user?.email?.toLowerCase().includes(query) ||
      up.user?.name?.toLowerCase().includes(query) ||
      up.userId.toLowerCase().includes(query)
    );
  });

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUserPlans.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUserPlans.map(up => up.id)));
    }
  };

  const handleSelectUser = (userPlanId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userPlanId)) {
      newSelected.delete(userPlanId);
    } else {
      newSelected.add(userPlanId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkCancel = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    if (!confirm(`Tem certeza que deseja cancelar ${selectedUsers.size} plano(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedUsers).map(id =>
          cancelUserPlan(id, { reason: 'Cancelamento em lote pelo admin' })
        )
      );
      toast.success(`${selectedUsers.size} plano(s) cancelado(s) com sucesso`);
      setSelectedUsers(new Set());
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao cancelar planos');
    }
  };

  const handleBulkRenew = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    const days = prompt('Quantos dias deseja renovar?', '30');
    if (!days) return;

    try {
      await Promise.all(
        Array.from(selectedUsers).map(id =>
          renewUserPlan(id, {
            durationDays: parseInt(days),
            paymentMethod: 'admin',
          })
        )
      );
      toast.success(`${selectedUsers.size} plano(s) renovado(s) com sucesso`);
      setSelectedUsers(new Set());
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao renovar planos');
    }
  };

  const handleCancelPlan = async (userPlanId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este plano?')) return;

    try {
      await cancelUserPlan(userPlanId, { reason: 'Cancelado pelo admin' });
      toast.success('Plano cancelado com sucesso');
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao cancelar plano');
    }
  };

  const handleRenewPlan = async (userPlanId: string) => {
    const days = prompt('Quantos dias deseja renovar?', '30');
    if (!days) return;

    try {
      await renewUserPlan(userPlanId, {
        durationDays: parseInt(days),
        paymentMethod: 'admin',
      });
      toast.success('Plano renovado com sucesso');
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao renovar plano');
    }
  };

  const handleStartEdit = (userPlan: UserPlan) => {
    setEditingPlan(userPlan.id);
    setEditDates({
      startDate: new Date(userPlan.startDate).toISOString().split('T')[0],
      endDate: new Date(userPlan.endDate).toISOString().split('T')[0],
    });
  };

  const handleSaveEdit = async (userPlanId: string) => {
    try {
      await updateUserPlanDates(
        userPlanId,
        new Date(editDates.startDate),
        new Date(editDates.endDate)
      );
      toast.success('Datas atualizadas com sucesso');
      setEditingPlan(null);
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao atualizar datas');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          icon: 'check_circle',
          label: 'Ativo',
        };
      case 'EXPIRED':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          icon: 'event_busy',
          label: 'Expirado',
        };
      case 'CANCELLED':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'cancel',
          label: 'Cancelado',
        };
      case 'TRIAL':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'schedule',
          label: 'Trial',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'help',
          label: status,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {selectedUsers.size > 0 && (
          <div className="flex gap-2">
            <AdminButton
              onClick={handleBulkRenew}
              icon="autorenew"
              variant="outline"
              size="sm"
            >
              Renovar ({selectedUsers.size})
            </AdminButton>
            <AdminButton
              onClick={handleBulkCancel}
              icon="cancel"
              variant="outline"
              size="sm"
            >
              Cancelar ({selectedUsers.size})
            </AdminButton>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredUserPlans.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            people
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário com este plano'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg">
            <input
              type="checkbox"
              checked={selectedUsers.size === filteredUserPlans.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Selecionar todos ({filteredUserPlans.length})
            </span>
          </div>

          {/* User Plans */}
          {filteredUserPlans.map((userPlan) => {
            const statusConfig = getStatusConfig(userPlan.status);
            const isEditing = editingPlan === userPlan.id;
            const isSelected = selectedUsers.has(userPlan.id);

            return (
              <div
                key={userPlan.id}
                className={`p-5 bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary shadow-lg'
                    : 'border-border-light dark:border-border-dark hover:shadow-lg'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectUser(userPlan.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />

                  {/* User Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                        <span className={`material-symbols-outlined ${statusConfig.text}`}>
                          person
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-text-light-primary dark:text-text-dark-primary">
                          {userPlan.user?.email || userPlan.userId}
                        </h4>
                        {userPlan.user?.name && (
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {userPlan.user.name}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          Data de Início
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDates.startDate}
                            onChange={(e) => setEditDates({ ...editDates, startDate: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                          />
                        ) : (
                          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                            {new Date(userPlan.startDate).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          Data de Término
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDates.endDate}
                            onChange={(e) => setEditDates({ ...editDates, endDate: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
                          />
                        ) : (
                          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                            {new Date(userPlan.endDate).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex flex-wrap gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>Criado em {new Date(userPlan.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {userPlan.autoRenew && (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <span className="material-symbols-outlined text-sm">autorenew</span>
                          <span>Renovação Automática</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(userPlan.id)}
                          className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title="Salvar"
                        >
                          <span className="material-symbols-outlined text-lg">save</span>
                        </button>
                        <button
                          onClick={() => setEditingPlan(null)}
                          className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                          title="Cancelar"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(userPlan)}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Editar datas"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {userPlan.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleRenewPlan(userPlan.id)}
                              className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              title="Renovar"
                            >
                              <span className="material-symbols-outlined text-lg">autorenew</span>
                            </button>
                            <button
                              onClick={() => handleCancelPlan(userPlan.id)}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Cancelar plano"
                            >
                              <span className="material-symbols-outlined text-lg">cancel</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
