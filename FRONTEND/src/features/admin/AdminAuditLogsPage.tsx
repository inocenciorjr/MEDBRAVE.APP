import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { formatDate, formatTime, formatDateTime } from "../../utils/dateUtils";

// Interfaces baseadas no backend
interface AdminAction {
  type: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AdminAuditLog {
  id: string;
  action: AdminAction;
  createdAt: string;
}

interface AuditLogFilterOptions {
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  descriptionContains?: string;
}

type SortField = 'createdAt' | 'actionType' | 'performedBy';
type SortDirection = 'asc' | 'desc';

const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  
  // Estados de filtro e busca
  const [filters, setFilters] = useState<AuditLogFilterOptions>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Estados do modal de detalhes
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, itemsPerPage, filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortField,
        sortDirection,
        ...filters
      });

      const res = await fetchWithAuth(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar logs de auditoria");
      
      const json = await res.json();
      setLogs(Array.isArray(json.logs) ? json.logs : json);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Filtros e ordenação local (para funcionar mesmo com dados simulados)
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.performedBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActionType = !filters.actionType || log.action.type === filters.actionType;
      const matchesUser = !filters.userId || log.action.performedBy === filters.userId;
      const matchesDescription = !filters.descriptionContains || 
        log.action.description.toLowerCase().includes(filters.descriptionContains.toLowerCase());
      
      let matchesDateRange = true;
      if (filters.startDate || filters.endDate) {
        const logDate = new Date(log.createdAt);
        if (filters.startDate) {
          matchesDateRange = matchesDateRange && logDate >= new Date(filters.startDate);
        }
        if (filters.endDate) {
          matchesDateRange = matchesDateRange && logDate <= new Date(filters.endDate);
        }
      }
      
      return matchesSearch && matchesActionType && matchesUser && matchesDescription && matchesDateRange;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(sortField) {
        case 'createdAt':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'actionType':
          aVal = a.action.type;
          bVal = b.action.type;
          break;
        case 'performedBy':
          aVal = a.action.performedBy;
          bVal = b.action.performedBy;
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
  }, [logs, searchTerm, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilterOptions, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const exportLogs = () => {
    const csvHeaders = ['Data/Hora', 'Ação', 'Usuário', 'Descrição', 'Metadados'];
    const csvData = filteredAndSortedLogs.map(log => [
      formatDateTime(log.createdAt),
      log.action.type,
      log.action.performedBy,
      log.action.description,
      log.action.metadata ? JSON.stringify(log.action.metadata) : ''
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionTypeColor = (actionType: string) => {
    switch(actionType.toLowerCase()) {
      case 'create':
      case 'add':
        return 'text-green-600 bg-green-100';
      case 'update':
      case 'edit':
      case 'modify':
        return 'text-blue-600 bg-blue-100';
      case 'delete':
      case 'remove':
        return 'text-red-600 bg-red-100';
      case 'login':
      case 'auth':
        return 'text-purple-600 bg-purple-100';
      case 'suspend':
      case 'ban':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕️</span>;
    return <span className="text-blue-600">{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>;
  };

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const actionTypes = logs.reduce((acc, log) => {
      acc[log.action.type] = (acc[log.action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const last24h = logs.filter(log => 
      new Date(log.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      total: logs.length,
      last24h,
      actionTypes,
      mostActive: Object.entries(actionTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
    };
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Logs de Auditoria</h1>
              <p className="text-gray-600 mt-1">Monitore todas as ações administrativas da plataforma</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchAuditLogs()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                🔄 Recarregar
              </button>
              <button
                onClick={exportLogs}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                disabled={filteredAndSortedLogs.length === 0}
              >
                📥 Exportar CSV
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
                <p className="text-sm font-medium text-gray-500">Total de Logs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">🕐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Últimas 24h</p>
                <p className="text-2xl font-bold text-gray-900">{stats.last24h}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ação Mais Comum</p>
                <p className="text-lg font-bold text-gray-900">{stats.mostActive}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Filtrados</p>
                <p className="text-2xl font-bold text-gray-900">{filteredAndSortedLogs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🔍 Filtros Avançados</h2>
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              🗑️ Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Busca Geral
              </label>
              <input
                type="text"
                placeholder="Descrição, ação, usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ação
              </label>
              <select
                value={filters.actionType || ''}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="create">Criação</option>
                <option value="update">Atualização</option>
                <option value="delete">Exclusão</option>
                <option value="login">Login</option>
                <option value="suspend">Suspensão</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                type="text"
                placeholder="ID ou nome do usuário"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando logs de auditoria...</p>
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

        {/* Tabela de Logs */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Logs de Auditoria ({filteredAndSortedLogs.length})
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
                      checked={selectedLogs.size === filteredAndSortedLogs.length && filteredAndSortedLogs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLogs(new Set(filteredAndSortedLogs.map(l => l.id)));
                        } else {
                          setSelectedLogs(new Set());
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
                        Data/Hora <SortIcon field="createdAt" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('actionType')}
                    >
                      <div className="flex items-center gap-1">
                        Ação <SortIcon field="actionType" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('performedBy')}
                    >
                      <div className="flex items-center gap-1">
                        Usuário <SortIcon field="performedBy" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedLogs.has(log.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedLogs);
                            if (e.target.checked) {
                              newSelected.add(log.id);
                            } else {
                              newSelected.delete(log.id);
                            }
                            setSelectedLogs(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(log.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionTypeColor(log.action.type)}`}>
                          {log.action.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.action.performedBy}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.action.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          👁️ Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredAndSortedLogs.length === 0 && (
              <div className="text-center py-12">
                <span className="text-gray-400 text-6xl">📊</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum log encontrado</h3>
                <p className="mt-2 text-gray-500">Ajuste os filtros ou aguarde novos logs.</p>
              </div>
            )}

            {/* Paginação */}
            {filteredAndSortedLogs.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, filteredAndSortedLogs.length)} de {filteredAndSortedLogs.length} logs
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
                      Página {currentPage} de {Math.ceil(filteredAndSortedLogs.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAndSortedLogs.length / itemsPerPage), currentPage + 1))}
                      disabled={currentPage === Math.ceil(filteredAndSortedLogs.length / itemsPerPage)}
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

      {/* Modal de Detalhes do Log */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Detalhes do Log de Auditoria</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLog(null);
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
                    <label className="text-sm text-gray-500">ID do Log</label>
                    <p className="font-medium">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Data/Hora</label>
                    <p className="font-medium">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Tipo de Ação</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionTypeColor(selectedLog.action.type)}`}>
                        {selectedLog.action.type}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Usuário</label>
                    <p className="font-medium">{selectedLog.action.performedBy}</p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Descrição da Ação</h4>
                <p className="text-blue-800">{selectedLog.action.description}</p>
              </div>

              {/* Metadados */}
              {selectedLog.action.metadata && Object.keys(selectedLog.action.metadata).length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">Metadados</h4>
                  <pre className="text-sm text-green-800 bg-green-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.action.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Ações */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                    alert('Log copiado para a área de transferência!');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  📋 Copiar JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;