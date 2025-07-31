import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { useNotifications } from '../../contexts/NotificationContext';

// Enums e interfaces baseados no backend
enum NotificationType {
  GENERAL = 'general',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  CONTENT = 'content',
  EXAM = 'exam',
  SOCIAL = 'social',
  ACHIEVEMENT = 'achievement',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateNotificationPayload {
  userId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  expiresAt?: string | null;
  targetAudience?: 'all' | 'students' | 'teachers' | 'mentors' | 'specific';
  userIds?: string[];
}

interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

type SortField = 'createdAt' | 'priority' | 'type' | 'read';
type SortDirection = 'asc' | 'desc';

const AdminNotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  
  // Estados de filtro e busca
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Estados do modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // Estados do formulário de criação
  const [createForm, setCreateForm] = useState<CreateNotificationPayload>({
    title: '',
    message: '',
    type: NotificationType.GENERAL,
    priority: NotificationPriority.NORMAL,
    targetAudience: 'all',
    userIds: []
  });

  const { notifications: contextNotifications, fetchNotifications } = useNotifications();

  // Adaptar NotificationData (contexto) para Notification (local)
  const notifications: Notification[] = useMemo(() => {
    return contextNotifications.map(n => ({
      ...n,
      type: n.type as NotificationType,
      priority: n.priority as NotificationPriority
    }));
  }, [contextNotifications]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNotifications().finally(() => setLoading(false));
  }, []);

  // Filtros e ordenação local
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications.filter(notification => {
      const matchesSearch = searchTerm === '' || 
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.userId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !filters.type || notification.type === filters.type;
      const matchesPriority = !filters.priority || notification.priority === filters.priority;
      const matchesRead = filters.read === undefined || notification.read === filters.read;
      const matchesUser = !filters.userId || notification.userId === filters.userId;
      
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
      
      return matchesSearch && matchesType && matchesPriority && matchesRead && matchesUser && matchesDateRange;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(sortField) {
        case 'createdAt':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'read':
          aVal = a.read ? 1 : 0;
          bVal = b.read ? 1 : 0;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [notifications, searchTerm, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: string | boolean | undefined) => {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleCreateNotification = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (!res.ok) throw new Error('Erro ao criar notificação');
      
      // Reset form
      setCreateForm({
        title: '',
        message: '',
        type: NotificationType.GENERAL,
        priority: NotificationPriority.NORMAL,
        targetAudience: 'all',
        userIds: []
      });
      
      setShowCreateModal(false);
      await fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar notificação');
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedNotifications.size === 0) return;
    
    const confirmed = confirm(`Tem certeza que deseja ${action} ${selectedNotifications.size} notificações?`);
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedNotifications).map(notificationId => 
        fetchWithAuth(`/api/admin/notifications/${notificationId}`, {
          method: action === 'delete' ? 'DELETE' : 'PUT',
          headers: action !== 'delete' ? { 'Content-Type': 'application/json' } : undefined,
          body: action !== 'delete' ? JSON.stringify({ [action]: value }) : undefined
        })
      );
      
      await Promise.all(promises);
      setSelectedNotifications(new Set());
      await fetchNotifications();
    } catch (err) {
      alert('Erro na operação em lote');
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch(priority) {
      case NotificationPriority.URGENT: return 'text-red-600 bg-red-100';
      case NotificationPriority.HIGH: return 'text-orange-600 bg-orange-100';
      case NotificationPriority.NORMAL: return 'text-blue-600 bg-blue-100';
      case NotificationPriority.LOW: return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch(type) {
      case NotificationType.SYSTEM: return 'text-purple-600 bg-purple-100';
      case NotificationType.ALERT: return 'text-red-600 bg-red-100';
      case NotificationType.PAYMENT: return 'text-green-600 bg-green-100';
      case NotificationType.EXAM: return 'text-blue-600 bg-blue-100';
      case NotificationType.ACHIEVEMENT: return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕️</span>;
    return <span className="text-blue-600">{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>;
  };

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const urgentCount = notifications.filter(n => n.priority === NotificationPriority.URGENT).length;
    const todayCount = notifications.filter(n => 
      new Date(n.createdAt).toDateString() === new Date().toDateString()
    ).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentCount,
      today: todayCount
    };
  }, [notifications]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Notificações</h1>
              <p className="text-gray-600 mt-1">Crie e gerencie notificações para usuários da plataforma</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchNotifications()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                🔄 Recarregar
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Nova Notificação
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">📬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Não Lidas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">🚨</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Urgentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🔍 Filtros</h2>
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              🗑️ Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Busca Geral
              </label>
              <input
                type="text"
                placeholder="Título, mensagem, usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value={NotificationType.GENERAL}>Geral</option>
                <option value={NotificationType.SYSTEM}>Sistema</option>
                <option value={NotificationType.PAYMENT}>Pagamento</option>
                <option value={NotificationType.EXAM}>Exame</option>
                <option value={NotificationType.ALERT}>Alerta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as prioridades</option>
                <option value={NotificationPriority.URGENT}>Urgente</option>
                <option value={NotificationPriority.HIGH}>Alta</option>
                <option value={NotificationPriority.NORMAL}>Normal</option>
                <option value={NotificationPriority.LOW}>Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status de Leitura
              </label>
              <select
                value={filters.read === undefined ? '' : filters.read.toString()}
                onChange={(e) => handleFilterChange('read', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                <option value="false">Não lidas</option>
                <option value="true">Lidas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Ações em Lote */}
        {selectedNotifications.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-blue-700 font-medium">
                  {selectedNotifications.size} notificações selecionadas
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('read', true)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    ✅ Marcar como Lidas
                  </button>
                  <button
                    onClick={() => handleBulkAction('read', false)}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                  >
                    📬 Marcar como Não Lidas
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    🗑️ Deletar
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕ Cancelar Seleção
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando notificações...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">❌</span>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Tabela de Notificações */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Notificações ({filteredAndSortedNotifications.length})
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Itens por página:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.size === filteredAndSortedNotifications.length && filteredAndSortedNotifications.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotifications(new Set(filteredAndSortedNotifications.map(n => n.id)));
                        } else {
                          setSelectedNotifications(new Set());
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-600">Selecionar todos</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seleção
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Data <SortIcon field="createdAt" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center gap-1">
                        Prioridade <SortIcon field="priority" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo <SortIcon field="type" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('read')}
                    >
                      <div className="flex items-center gap-1">
                        Status <SortIcon field="read" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.has(notification.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedNotifications);
                            if (e.target.checked) {
                              newSelected.add(notification.id);
                            } else {
                              newSelected.delete(notification.id);
                            }
                            setSelectedNotifications(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(notification.createdAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {notification.title}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {notification.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{notification.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          notification.read ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
                        }`}>
                          {notification.read ? 'Lida' : 'Não lida'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedNotification(notification);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={async () => {
                              await handleBulkAction('read', !notification.read);
                            }}
                            className={notification.read ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {notification.read ? '📬 Não lida' : '✅ Lida'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredAndSortedNotifications.length === 0 && (
              <div className="text-center py-12">
                <span className="text-gray-400 text-6xl">📬</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma notificação encontrada</h3>
                <p className="mt-2 text-gray-500">Ajuste os filtros ou crie novas notificações.</p>
              </div>
            )}

            {/* Paginação */}
            {filteredAndSortedNotifications.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, filteredAndSortedNotifications.length)} de {filteredAndSortedNotifications.length} notificações
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      ← Anterior
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Página {currentPage} de {Math.ceil(filteredAndSortedNotifications.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAndSortedNotifications.length / itemsPerPage), currentPage + 1))}
                      disabled={currentPage === Math.ceil(filteredAndSortedNotifications.length / itemsPerPage)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Criação de Notificação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nova Notificação</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Título da notificação"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem *
                </label>
                <textarea
                  value={createForm.message}
                  onChange={(e) => setCreateForm({...createForm, message: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Conteúdo da notificação"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({...createForm, type: e.target.value as NotificationType})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={NotificationType.GENERAL}>Geral</option>
                    <option value={NotificationType.SYSTEM}>Sistema</option>
                    <option value={NotificationType.PAYMENT}>Pagamento</option>
                    <option value={NotificationType.EXAM}>Exame</option>
                    <option value={NotificationType.ALERT}>Alerta</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({...createForm, priority: e.target.value as NotificationPriority})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={NotificationPriority.LOW}>Baixa</option>
                    <option value={NotificationPriority.NORMAL}>Normal</option>
                    <option value={NotificationPriority.HIGH}>Alta</option>
                    <option value={NotificationPriority.URGENT}>Urgente</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Público Alvo
                </label>
                <select
                  value={createForm.targetAudience}
                  onChange={(e) => setCreateForm({...createForm, targetAudience: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="students">Apenas estudantes</option>
                  <option value="teachers">Apenas professores</option>
                  <option value="mentors">Apenas mentores</option>
                  <option value="specific">Usuários específicos</option>
                </select>
              </div>
              
              {createForm.targetAudience === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IDs dos Usuários (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    value={createForm.userIds?.join(', ') || ''}
                    onChange={(e) => setCreateForm({
                      ...createForm, 
                      userIds: e.target.value.split(',').map(id => id.trim()).filter(id => id)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="user1, user2, user3..."
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Expiração (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={createForm.expiresAt || ''}
                  onChange={(e) => setCreateForm({...createForm, expiresAt: e.target.value || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNotification}
                  disabled={!createForm.title || !createForm.message}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Enviar Notificação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Notificação */}
      {showDetailsModal && selectedNotification && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detalhes da Notificação</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedNotification(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Informações Básicas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">ID da Notificação</label>
                    <p className="font-medium">{selectedNotification.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Data de Criação</label>
                    <p className="font-medium">{new Date(selectedNotification.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Tipo</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedNotification.type)}`}>
                        {selectedNotification.type}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Prioridade</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedNotification.priority)}`}>
                        {selectedNotification.priority}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Conteúdo</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-blue-700">Título</label>
                    <p className="text-blue-800 font-medium">{selectedNotification.title}</p>
                  </div>
                  <div>
                    <label className="text-sm text-blue-700">Mensagem</label>
                    <p className="text-blue-800">{selectedNotification.message}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Status de Leitura</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-green-700">Status</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedNotification.read ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
                      }`}>
                        {selectedNotification.read ? 'Lida' : 'Não lida'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-green-700">Lida em</label>
                    <p className="font-medium">
                      {selectedNotification.readAt ? new Date(selectedNotification.readAt).toLocaleString('pt-BR') : 'Ainda não lida'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadados */}
              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-3">Dados Adicionais</h4>
                  <pre className="text-sm text-purple-800 bg-purple-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedNotification.data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Ações */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={async () => {
                    await handleBulkAction('read', !selectedNotification.read);
                    setSelectedNotification({
                      ...selectedNotification,
                      read: !selectedNotification.read
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-white ${
                    selectedNotification.read 
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {selectedNotification.read ? '📬 Marcar como Não Lida' : '✅ Marcar como Lida'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPage; 