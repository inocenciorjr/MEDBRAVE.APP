'use client';

import React, { useState, useEffect } from 'react';
import { AdminButton } from '../ui/AdminButton';
import type { UserLog } from '@/types/admin/user';
import { getUserLogs } from '@/services/admin/userService';
import { useToast } from '@/lib/contexts/ToastContext';

interface UserLogsTableProps {
  userId: string;
}

export function UserLogsTable({ userId }: UserLogsTableProps) {
  const toast = useToast();
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const limit = 10;

  useEffect(() => {
    loadLogs();
  }, [userId, page, filterAction]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const result = await getUserLogs(userId, { limit, offset });
      
      let filteredLogs = result.logs;
      if (filterAction !== 'ALL') {
        filteredLogs = filteredLogs.filter(log => log.action === filterAction);
      }
      
      setLogs(filteredLogs);
      setTotal(result.total);
    } catch (error: any) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      'LOGIN': 'login',
      'LOGOUT': 'logout',
      'PASSWORD_CHANGE': 'key',
      'EMAIL_CHANGE': 'mail',
      'PROFILE_UPDATE': 'edit',
      'PLAN_PURCHASE': 'shopping_cart',
      'PLAN_CANCEL': 'cancel',
      'QUESTION_ANSWER': 'quiz',
      'STUDY_SESSION': 'school',
      'ADMIN_ACTION': 'admin_panel_settings',
    };
    return icons[action] || 'info';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'LOGIN': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      'LOGOUT': 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20',
      'PASSWORD_CHANGE': 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
      'EMAIL_CHANGE': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      'PROFILE_UPDATE': 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
      'PLAN_PURCHASE': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      'PLAN_CANCEL': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
      'QUESTION_ANSWER': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      'STUDY_SESSION': 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
      'ADMIN_ACTION': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    };
    return colors[action] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          Logs de Atividade
        </h3>
        
        <div className="flex items-center gap-3">
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="ALL">Todas as Ações</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="PASSWORD_CHANGE">Mudança de Senha</option>
            <option value="EMAIL_CHANGE">Mudança de Email</option>
            <option value="PROFILE_UPDATE">Atualização de Perfil</option>
            <option value="PLAN_PURCHASE">Compra de Plano</option>
            <option value="PLAN_CANCEL">Cancelamento de Plano</option>
            <option value="ADMIN_ACTION">Ação Administrativa</option>
          </select>

          <AdminButton
            size="sm"
            variant="outline"
            onClick={loadLogs}
            icon="refresh"
          >
            Atualizar
          </AdminButton>
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
            history
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum log encontrado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                  <span className="material-symbols-outlined text-xl">
                    {getActionIcon(log.action)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                        {log.action.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                        {log.description}
                      </p>
                    </div>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors">
                        Ver detalhes
                      </summary>
                      <div className="mt-2 p-3 bg-background-light dark:bg-background-dark rounded-lg">
                        <pre className="text-xs text-text-light-secondary dark:text-text-dark-secondary overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* IP Address */}
                  {log.ip_address && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      <span className="material-symbols-outlined text-sm">
                        location_on
                      </span>
                      <span>IP: {log.ip_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-border-dark">
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Página {page} de {totalPages} ({total} logs no total)
          </div>
          
          <div className="flex items-center gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              icon="chevron_left"
            >
              Anterior
            </AdminButton>
            
            <AdminButton
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              icon="chevron_right"
            >
              Próxima
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}
