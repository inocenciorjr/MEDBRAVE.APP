import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { formatDate } from "../../utils/dateUtils";

// Enums e interfaces baseados no backend
enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_EMAIL_VERIFICATION = 'PENDING_EMAIL_VERIFICATION',
}

interface UserStats {
  questionsAnswered: number;
  questionsCorrect: number;
  questionsFlagged: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
  errorsRegistered: number;
  simulatedTestsCompleted: number;
  studyTime: number;
  lastStudySession: Date | null;
  streak: number;
  maxStreak: number;
  pointsTotal: number;
  level: number;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  biography?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  stats?: UserStats;
  specialties?: string[];
  mentorshipAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
}

type SortField = 'displayName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    console.log('🔄 UsersAdminPage: Estado atualizado - Users:', users.length, 'Loading:', loading, 'Error:', !!error);
  }, [users, loading, error]);

  const fetchUsers = async () => {
    console.log('🔄 UsersAdminPage: Iniciando fetchUsers...');
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/users");
      if (!res.ok) throw new Error("Erro ao buscar usuários");
      const json = await res.json();
      console.log('👥 UsersAdminPage: Usuários recebidos:', json.length, 'usuários');
      setUsers(Array.isArray(json) ? json : []);
    } catch (err: any) {
      console.error('❌ UsersAdminPage: Erro ao buscar usuários:', err);
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Filtros e ordenação
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = 
        (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'ALL' || user.role === filterRole;
      const matchesStatus = filterStatus === 'ALL' || user.status === filterStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterRole, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUserAction = async (userId: string, action: string, newValue?: any) => {
    try {
      const endpoint = `/api/users/${userId}`;
      const method = action === 'delete' ? 'DELETE' : 'PUT';
      
      const body = action === 'delete' ? undefined : JSON.stringify({
        [action]: newValue
      });

      const res = await fetchWithAuth(endpoint, {
        method,
        headers: action !== 'delete' ? { 'Content-Type': 'application/json' } : undefined,
        body
      });

      if (!res.ok) throw new Error(`Erro ao ${action} usuário`);
      
      // Recarregar lista
      await fetchUsers();
      
      // Fechar modal se estiver aberto
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || "Erro na operação");
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedUsers.size === 0) return;
    
    const confirmed = confirm(`Tem certeza que deseja ${action} ${selectedUsers.size} usuários?`);
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedUsers).map(userId => 
        handleUserAction(userId, action, value)
      );
      
      await Promise.all(promises);
      setSelectedUsers(new Set());
    } catch (err) {
      alert("Erro na operação em lote");
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return 'text-red-600 bg-red-100';
      case UserRole.TEACHER: return 'text-blue-600 bg-blue-100';
      case UserRole.MENTOR: return 'text-purple-600 bg-purple-100';
      case UserRole.STUDENT: return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch(status) {
      case UserStatus.ACTIVE: return 'text-green-600 bg-green-100';
      case UserStatus.INACTIVE: return 'text-gray-600 bg-gray-100';
      case UserStatus.SUSPENDED: return 'text-red-600 bg-red-100';
      case UserStatus.PENDING_EMAIL_VERIFICATION: return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕️</span>;
    return <span className="text-blue-600">{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
              <p className="text-gray-600 mt-1">Gerencie usuários, roles e permissões da plataforma</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchUsers()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={loading}
              >
                🔄 Recarregar
              </button>
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ➕ Novo Usuário
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filtros e Busca */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Buscar
              </label>
              <input
                type="text"
                placeholder="Nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Filtrar por Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos os roles</option>
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.TEACHER}>Professor</option>
                <option value={UserRole.MENTOR}>Mentor</option>
                <option value={UserRole.STUDENT}>Estudante</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Filtrar por Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as UserStatus | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos os status</option>
                <option value={UserStatus.ACTIVE}>Ativo</option>
                <option value={UserStatus.INACTIVE}>Inativo</option>
                <option value={UserStatus.SUSPENDED}>Suspenso</option>
                <option value={UserStatus.PENDING_EMAIL_VERIFICATION}>Aguardando Verificação</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('ALL');
                  setFilterStatus('ALL');
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🗑️ Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">🎓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Estudantes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'STUDENT').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspensos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'SUSPENDED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações em Lote */}
        {selectedUsers.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-blue-700 font-medium">
                  {selectedUsers.size} usuários selecionados
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('status', 'ACTIVE')}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    ✅ Ativar
                  </button>
                  <button
                    onClick={() => handleBulkAction('status', 'SUSPENDED')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    ⛔ Suspender
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                  >
                    🗑️ Deletar
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedUsers(new Set())}
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
            <p className="text-gray-500">Carregando usuários...</p>
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

        {/* Tabela de Usuários */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Lista de Usuários ({filteredAndSortedUsers.length})
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(new Set(filteredAndSortedUsers.map(u => u.id)));
                      } else {
                        setSelectedUsers(new Set());
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-600">Selecionar todos</label>
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
                      onClick={() => handleSort('displayName')}
                    >
                      <div className="flex items-center gap-1">
                        Usuário <SortIcon field="displayName" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        Email <SortIcon field="email" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Role <SortIcon field="role" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status <SortIcon field="status" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastLoginAt')}
                    >
                      <div className="flex items-center gap-1">
                        Último Login <SortIcon field="lastLoginAt" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedUsers);
                            if (e.target.checked) {
                              newSelected.add(user.id);
                            } else {
                              newSelected.delete(user.id);
                            }
                            setSelectedUsers(newSelected);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.photoURL ? (
                              <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">
                          {user.emailVerified ? '✅ Verificado' : '⚠️ Não verificado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role as UserRole)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status as UserStatus)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'status', 
                              user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                            )}
                            className={user.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {user.status === 'ACTIVE' ? '⛔ Suspender' : '✅ Ativar'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja deletar este usuário?')) {
                                handleUserAction(user.id, 'delete');
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            🗑️ Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredAndSortedUsers.length === 0 && (
              <div className="text-center py-12">
                <span className="text-gray-400 text-6xl">👥</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum usuário encontrado</h3>
                <p className="mt-2 text-gray-500">Ajuste os filtros ou adicione novos usuários.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedUser ? 'Detalhes do Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {selectedUser && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Informações Básicas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Nome</label>
                      <p className="font-medium">{selectedUser.displayName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Telefone</label>
                      <p className="font-medium">{selectedUser.phoneNumber || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Data de Criação</label>
                      <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Estatísticas */}
                {selectedUser.stats && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Estatísticas de Estudo</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{selectedUser.stats.questionsAnswered}</p>
                        <p className="text-sm text-blue-700">Questões Respondidas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round((selectedUser.stats.questionsCorrect / selectedUser.stats.questionsAnswered) * 100) || 0}%
                        </p>
                        <p className="text-sm text-green-700">Taxa de Acerto</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{selectedUser.stats.streak}</p>
                        <p className="text-sm text-purple-700">Dias de Streak</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => handleUserAction(selectedUser.id, 'status', 
                      selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                    )}
                    className={`px-4 py-2 rounded-lg text-white ${
                      selectedUser.status === 'ACTIVE' 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {selectedUser.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersAdminPage;