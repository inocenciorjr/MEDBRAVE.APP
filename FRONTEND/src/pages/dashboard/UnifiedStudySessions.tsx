import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import SpatialLayout from '../../../components/neural/SpatialLayout';
// import NeuralCard from '../../../components/neural/NeuralCard';
// import { Card } from '../../../components/ui/card'; // Substituindo NeuralCard
// import SynapticButton from '../../../components/neural/SynapticButton';
import { useAuth } from '../../../../contexts/AuthContext';
// REMOVIDO FASE 2: studySessionService SM-2 legacy
// import { studySessionService } from '../../../../services/studySessionService';

// Mock temporário para evitar erro - será substituído na Fase 3
const studySessionService = {
  getAllSessions: async () => ({ data: [] })
};

// Tipos definidos localmente para resolver erros de importação e tipo
export interface StudySession {
  id: string;
  title: string;
  description?: string;
  objectives?: string[];
  duration?: string;
  estimatedTime?: number;
  date: string;
  completed: boolean;
  type?: 'flashcards' | 'questions' | 'reading' | 'error-review' | string;
}

interface ManualSession extends StudySession {
  type: 'manual';
  sessionType: 'flashcards' | 'questions' | 'reading' | 'error-review';
}

const UnifiedStudySessions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ManualSession[]>([]);
  const [filter, setFilter] = useState<'all' | 'manual'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'completed'>('all');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Verificar mensagem de sucesso
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setShowSuccessMessage(true);
      window.history.replaceState({}, document.title);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [location.state]);

  // Carregar sessões manuais
  useEffect(() => {
    const loadManualSessions = async () => {
      setLoading(true);
      try {
        const response = await studySessionService.getAllSessions();
        // A API mock retorna { data: [] }, então pegamos a propriedade data
        const manualSessions: StudySession[] = Array.isArray(response.data) ? response.data : [];

        const formattedSessions: ManualSession[] = manualSessions.map((session: StudySession) => ({
          ...session,
          type: 'manual',
          sessionType: (session.type?.toLowerCase() as ManualSession['sessionType']) || 'reading',
        }));

        formattedSessions.sort((a, b) => {
          // Lida com datas potencialmente inválidas
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        
        setSessions(formattedSessions);
      } catch (error) {
        console.error('❌ Erro ao carregar sessões manuais:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadManualSessions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Data não definida';
    const date = new Date(dateString);
    const now = new Date();
    // Verifique se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === -1) return 'Ontem';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return `Há ${Math.abs(diffDays)} dias`;
    if (diffDays > 0) return `Em ${diffDays} dias`;
    return date.toLocaleDateString();
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6" />
        </svg>
      ),
      href: '/dashboard',
      isActive: false,
    },
    {
      id: 'questoes',
      label: 'Banco de Questões',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/dashboard/questoes/banco',
      isActive: false,
    },
    {
      id: 'listas',
      label: 'Listas de Questões',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/dashboard/questoes/listas',
      isActive: false,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      href: '/dashboard/flashcards',
      isActive: false,
    },
    {
      id: 'study-sessions',
      label: 'Sessões de Estudo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/dashboard/study-sessions',
      isActive: true,
    },
    {
      id: 'caderno-erros',
      label: 'Caderno de Erros',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      href: '/dashboard/questoes/caderno-erros',
      isActive: false,
    },
  ];

  const handleCreateManualSession = () => {
    navigate('/dashboard/study-sessions/create');
  };

  const handleStartSession = (session: ManualSession) => {
    navigate(`/dashboard/study-sessions/active/${session.id}`);
  };

  const handleViewSession = (session: ManualSession) => {
    navigate(`/dashboard/study-sessions/${session.id}`);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTypeFilter = filter === 'all' || session.type === filter;
    const matchesStatusFilter = statusFilter === 'all' || (session.completed ? 'completed' : 'planned') === statusFilter;
    return matchesSearch && matchesTypeFilter && matchesStatusFilter;
  });

  const getSessionIcon = (session: ManualSession) => {
    switch (session.sessionType) {
      case 'flashcards': return '🃏';
      case 'questions': return '❓';
      case 'error-review': return '⚠️';
      default: return '📖';
    }
  };

  const getStatusColor = (completed: boolean) => {
    if (completed) {
      return { bg: 'rgba(74, 222, 128, 0.2)', color: 'rgb(74, 222, 128)' };
    }
    return { bg: 'rgba(156, 163, 175, 0.2)', color: 'rgb(156, 163, 175)' };
  };

  const getStatusLabel = (completed: boolean) => {
    return completed ? 'Concluída' : 'Planejada';
  };

  return (
    <div>
      <div className="p-4 md:p-6 space-y-6">
        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'manual')}
            className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="all">Todos os Tipos</option>
            <option value="manual">Manuais</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'planned' | 'completed')}
            className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="all">Todos os Status</option>
            <option value="planned">Planejadas</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>

        {/* Botão de Criar para Mobile */}
        <button
          onClick={handleCreateManualSession}
          className="w-full md:hidden"
        >
          Criar Sessão Manual
        </button>

        {loading ? (
          <div className="text-center py-10">Carregando sessões...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map(session => {
              const statusColor = getStatusColor(session.completed);
              return (
                <Card
                  key={session.id}
                  className="flex flex-col justify-between"
                  onClick={() => handleViewSession(session)}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-4xl">{getSessionIcon(session)}</span>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.color }}
                      >
                        {getStatusLabel(session.completed)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mt-4">{session.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(session.date)}</p>
                    {session.duration && <p className="text-sm text-gray-500 dark:text-gray-400">Duração: {session.duration}</p>}
                  </div>
                  <button
                    className="w-full mt-4"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleStartSession(session);
                    }}
                  >
                    Iniciar Sessão
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedStudySessions;