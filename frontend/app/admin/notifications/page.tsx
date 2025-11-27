'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminTable, ColumnDef } from '@/components/admin/ui/AdminTable';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/ui/AdminInput';
import NotificationFilters, { NotificationFilterValues } from '@/components/admin/notifications/NotificationFilters';
import { Notification } from '@/types/admin/notification';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  bulkMarkAsRead,
  bulkMarkAsUnread,
  bulkDeleteNotifications,
  getNotificationStats
} from '@/services/admin/notificationService';

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState<NotificationFilterValues>({
    search: '',
    type: 'all',
    priority: 'all',
    read: 'all',
    startDate: '',
    endDate: ''
  });

  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    targetAudience: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    urgent: 0,
    today: 0
  });

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNotifications({ page: 1, limit: 1000 });
      setNotifications(response.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getNotificationStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesSearch =
        filters.search === '' ||
        notification.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        notification.message.toLowerCase().includes(filters.search.toLowerCase());

      const matchesType = filters.type === 'all' || notification.type === filters.type;
      const matchesPriority = filters.priority === 'all' || notification.priority === filters.priority;
      const matchesRead = filters.read === 'all' || notification.read.toString() === filters.read;

      let matchesDateRange = true;
      if (filters.startDate || filters.endDate) {
        const notificationDate = new Date(notification.createdAt);
        if (filters.startDate) {
          matchesDateRange = matchesDateRange && notificationDate >= new Date(filters.startDate);
        }
        if (filters.endDate) {
          matchesDateRange = matchesDateRange && notificationDate <= new Date(filters.endDate);
        }
      }

      return matchesSearch && matchesType && matchesPriority && matchesRead && matchesDateRange;
    });
  }, [notifications, filters]);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.message.trim()) {
      toast.warning('Campos obrigatórios', 'Título e mensagem são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await createNotification(createForm as any);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        message: '',
        type: 'GENERAL',
        priority: 'NORMAL',
        targetAudience: 'all'
      });
      await loadNotifications();
      await loadStats();
      toast.success('Notificação criada!', 'A notificação foi enviada com sucesso');
    } catch (err: any) {
      toast.error('Erro ao criar', err.message || 'Não foi possível criar a notificação');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      await bulkMarkAsRead(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
      await loadNotifications();
      await loadStats();
      toast.success('Marcadas como lidas', 'Notificações atualizadas');
    } catch (err: any) {
      toast.error('Erro', err.message || 'Não foi possível marcar como lidas');
    }
  };

  const handleBulkMarkAsUnread = async () => {
    try {
      await bulkMarkAsUnread(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
      await loadNotifications();
      await loadStats();
      toast.success('Marcadas como não lidas', 'Notificações atualizadas');
    } catch (err: any) {
      toast.error('Erro', err.message || 'Não foi possível marcar como não lidas');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deletar ${selectedNotifications.size} notificações?`)) return;

    try {
      await bulkDeleteNotifications(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
      await loadNotifications();
      await loadStats();
      toast.success('Excluídas!', 'Notificações excluídas com sucesso');
    } catch (err: any) {
      toast.error('Erro ao excluir', err.message || 'Não foi possível excluir as notificações');
    }
  };

  const getPriorityBadgeVariant = (priority: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      case 'LOW': return 'neutral';
      default: return 'neutral';
    }
  };

  const getTypeBadgeVariant = (type: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (type) {
      case 'SYSTEM': return 'info';
      case 'ALERT': return 'error';
      case 'PAYMENT': return 'success';
      default: return 'neutral';
    }
  };

  const columns: ColumnDef<Notification>[] = [
    {
      key: 'createdAt',
      label: 'Data',
      sortable: true,
      render: (_, notification) => (
        <div className="text-sm">
          <div className="text-text-light-primary dark:text-text-dark-primary">
            {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="text-text-light-tertiary dark:text-text-dark-tertiary text-xs">
            {new Date(notification.createdAt).toLocaleTimeString('pt-BR')}
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Prioridade',
      sortable: true,
      render: (_, notification) => (
        <AdminBadge
          label={notification.priority}
          variant={getPriorityBadgeVariant(notification.priority)}
          size="sm"
        />
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      sortable: true,
      render: (_, notification) => (
        <AdminBadge
          label={notification.type}
          variant={getTypeBadgeVariant(notification.type)}
          size="sm"
        />
      )
    },
    {
      key: 'title',
      label: 'Título',
      render: (_, notification) => (
        <div className="max-w-md">
          <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            {notification.title}
          </div>
          <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary line-clamp-1">
            {notification.message}
          </div>
        </div>
      )
    },
    {
      key: 'read',
      label: 'Status',
      sortable: true,
      render: (_, notification) => (
        <AdminBadge
          label={notification.read ? 'Lida' : 'Não lida'}
          variant={notification.read ? 'success' : 'warning'}
          size="sm"
        />
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, notification) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNotification(notification);
              setShowDetailsModal(true);
            }}
            className="text-primary hover:text-primary-hover text-sm font-medium"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Gestão de Notificações
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Crie e gerencie notificações para usuários da plataforma
          </p>
        </div>
        <div className="flex gap-3">
          <AdminButton onClick={loadNotifications} disabled={loading} variant="outline">
            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
            Recarregar
          </AdminButton>
          <AdminButton onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined text-sm mr-2">add</span>
            Nova Notificação
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats title="Total" value={stats.total} icon="notifications" color="blue" />
        <AdminStats title="Não Lidas" value={stats.unread} icon="mark_email_unread" color="orange" />
        <AdminStats title="Urgentes" value={stats.urgent} icon="priority_high" color="red" />
        <AdminStats title="Hoje" value={stats.today} icon="today" color="green" />
      </div>

      <NotificationFilters
        onFilterChange={setFilters}
        onClear={() => setFilters({
          search: '',
          type: 'all',
          priority: 'all',
          read: 'all',
          startDate: '',
          endDate: ''
        })}
      />

      {selectedNotifications.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-primary font-medium">
              {selectedNotifications.size} notificação(ões) selecionada(s)
            </span>
            <div className="flex gap-2">
              <AdminButton size="sm" variant="outline" onClick={handleBulkMarkAsRead}>
                <span className="material-symbols-outlined text-sm mr-1">mark_email_read</span>
                Marcar Lidas
              </AdminButton>
              <AdminButton size="sm" variant="outline" onClick={handleBulkMarkAsUnread}>
                <span className="material-symbols-outlined text-sm mr-1">mark_email_unread</span>
                Marcar Não Lidas
              </AdminButton>
              <AdminButton size="sm" variant="outline" onClick={handleBulkDelete}>
                <span className="material-symbols-outlined text-sm mr-1">delete</span>
                Deletar
              </AdminButton>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="text-primary hover:text-primary-hover"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Notificações ({filteredNotifications.length})
          </h2>
        </div>
        <AdminTable
          data={filteredNotifications}
          columns={columns}
          loading={loading}
          selectable
          selectedRows={selectedNotifications}
          onSelectionChange={setSelectedNotifications}
          onRowClick={(notification) => {
            setSelectedNotification(notification);
            setShowDetailsModal(true);
          }}
        />
      </div>

      {/* Create Modal */}
      <AdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Notificação"
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <AdminButton variant="outline" onClick={() => setShowCreateModal(false)} disabled={saving}>
              Cancelar
            </AdminButton>
            <AdminButton onClick={handleCreate} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Notificação'}
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminInput
            label="Título *"
            value={createForm.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCreateForm({ ...createForm, title: e.target.value })
            }
            required
          />
          <AdminTextarea
            label="Mensagem *"
            value={createForm.message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setCreateForm({ ...createForm, message: e.target.value })
            }
            rows={4}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <AdminSelect
              label="Tipo"
              value={createForm.type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setCreateForm({ ...createForm, type: e.target.value })
              }
              options={[
                { value: 'GENERAL', label: 'Geral' },
                { value: 'SYSTEM', label: 'Sistema' },
                { value: 'PAYMENT', label: 'Pagamento' },
                { value: 'EXAM', label: 'Exame' },
                { value: 'ALERT', label: 'Alerta' }
              ]}
            />
            <AdminSelect
              label="Prioridade"
              value={createForm.priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setCreateForm({ ...createForm, priority: e.target.value })
              }
              options={[
                { value: 'LOW', label: 'Baixa' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' }
              ]}
            />
          </div>
          <AdminSelect
            label="Público-Alvo"
            value={createForm.targetAudience}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setCreateForm({ ...createForm, targetAudience: e.target.value })
            }
            options={[
              { value: 'all', label: 'Todos os usuários' },
              { value: 'students', label: 'Estudantes' },
              { value: 'teachers', label: 'Professores' },
              { value: 'mentors', label: 'Mentores' }
            ]}
          />
        </div>
      </AdminModal>

      {/* Details Modal */}
      {selectedNotification && (
        <AdminModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedNotification(null);
          }}
          title="Detalhes da Notificação"
          size="md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <AdminButton
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedNotification(null);
                }}
              >
                Fechar
              </AdminButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Título
              </label>
              <p className="text-text-light-primary dark:text-text-dark-primary mt-1">
                {selectedNotification.title}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Mensagem
              </label>
              <p className="text-text-light-primary dark:text-text-dark-primary mt-1">
                {selectedNotification.message}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  Tipo
                </label>
                <div className="mt-1">
                  <AdminBadge
                    label={selectedNotification.type}
                    variant={getTypeBadgeVariant(selectedNotification.type)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  Prioridade
                </label>
                <div className="mt-1">
                  <AdminBadge
                    label={selectedNotification.priority}
                    variant={getPriorityBadgeVariant(selectedNotification.priority)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Data de Criação
              </label>
              <p className="text-text-light-primary dark:text-text-dark-primary mt-1">
                {new Date(selectedNotification.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
