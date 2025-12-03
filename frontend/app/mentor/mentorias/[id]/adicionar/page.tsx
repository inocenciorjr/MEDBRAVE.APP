'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { mentorProgramService, MentorProgram } from '@/lib/services/mentorProgramService';
import { mentorshipBatchService } from '@/lib/services/mentorshipBatchService';
import Image from 'next/image';
import { 
  ArrowLeft, Search, Users, Calendar, Check, X, Filter, 
  ChevronDown, Clock, UserCheck, Loader2, AlertCircle,
  CheckCircle2, User, Mail, CalendarDays, UserPlus, Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UserWithMentorshipStatus {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: string;
  created_at: string;
  isMentee: boolean;
  mentorshipStatus: string | null;
  mentorshipId: string | null;
  mentorshipEndDate: string | null;
}

type DurationOption = 30 | 60 | 90 | 180 | 'custom';

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdicionarMentoradosPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const programId = params.id as string;

  // Core states
  const [program, setProgram] = useState<MentorProgram | null>(null);
  const [users, setUsers] = useState<UserWithMentorshipStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duration states
  const [durationOption, setDurationOption] = useState<DurationOption>(30);
  const [customDays, setCustomDays] = useState(30);
  const [useEndDate, setUseEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('available');

  const minDate = new Date().toISOString().split('T')[0];
  
  const defaultEndDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (durationOption === 'custom' ? customDays : durationOption as number));
    return date.toISOString().split('T')[0];
  }, [durationOption, customDays]);

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    loadProgram();
  }, [programId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadProgram = async () => {
    try {
      const data = await mentorProgramService.getProgram(programId);
      setProgram(data);
    } catch (err: any) {
      toast.error('Erro ao carregar programa');
      router.back();
    }
  };

  const loadUsers = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      if (!append) setUsers([]);
    }
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
      });
      
      if (programId) params.append('programId', programId);
      if (searchQuery.trim().length >= 2) params.append('search', searchQuery.trim());
      
      const url = `/mentorship/mentor/users?${params.toString()}`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          setUsers(prev => [...prev, ...(data.data || [])]);
        } else {
          setUsers(data.data || []);
        }
        setHasMore(data.hasMore || false);
        setTotalUsers(data.total || 0);
        setPage(pageNum);
      } else {
        throw new Error(data.error || 'Erro ao carregar usuários');
      }
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [programId, searchQuery, toast]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadUsers(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, loadUsers]);

  // ============================================
  // HANDLERS
  // ============================================

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const availableUsers = filteredUsers.filter(user => !user.isMentee);
    setSelectedUserIds(new Set(availableUsers.map(user => user.id)));
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        programId,
        menteeIds: Array.from(selectedUserIds),
        ...(useEndDate && endDate 
          ? { endDate: new Date(endDate + 'T23:59:59').toISOString() } 
          : { durationDays: durationOption === 'custom' ? customDays : durationOption as number }
        )
      };

      await mentorshipBatchService.addMentees(request);
      
      toast.success(`${selectedUserIds.size} mentorado(s) adicionado(s) com sucesso!`);
      router.push(`/mentor/mentorias/${programId}?tab=mentees`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar mentorados');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (filterStatus === 'available') {
      result = result.filter(user => !user.isMentee);
    } else if (filterStatus === 'mentees') {
      result = result.filter(user => user.isMentee);
    }
    
    return result;
  }, [users, filterStatus]);

  const availableUsers = filteredUsers.filter(user => !user.isMentee);
  const selectedUsers = users.filter(user => selectedUserIds.has(user.id));

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
  };

  // ============================================
  // RENDER
  // ============================================

  if (!program) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-text-light-secondary dark:text-text-dark-secondary">Carregando programa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-10">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2.5 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-all duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 text-text-light-secondary group-hover:text-primary transition-colors" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Adicionar Mentorados
                </h1>
                <p className="text-text-light-secondary dark:text-text-dark-secondary mt-0.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {program.title}
                </p>
              </div>
            </div>
            
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {selectedUserIds.size} selecionado{selectedUserIds.size !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all
                    shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Adicionar Mentorados
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-background-light dark:bg-background-dark border border-border-light 
                      dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 
                      focus:border-primary transition-all text-text-light-primary dark:text-text-dark-primary"
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-5 py-3.5 border border-border-light dark:border-border-dark rounded-xl font-medium 
                    transition-all flex items-center gap-2 ${
                    showFilters 
                      ? 'bg-primary text-white border-primary' 
                      : 'hover:bg-background-light dark:hover:bg-background-dark text-text-light-primary dark:text-text-dark-primary'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  Filtros
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showFilters && (
                <div className="mt-5 pt-5 border-t border-border-light dark:border-border-dark animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'all', label: 'Todos' },
                      { value: 'available', label: 'Disponíveis' },
                      { value: 'mentees', label: 'Já são mentorados' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterStatus(option.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          filterStatus === option.value
                            ? 'bg-primary text-white'
                            : 'bg-background-light dark:bg-background-dark text-text-light-secondary hover:text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Usuários Disponíveis
                    </h2>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                      {totalUsers} usuário{totalUsers !== 1 ? 's' : ''} encontrado{totalUsers !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {availableUsers.length > 0 && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={selectAll}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Selecionar todos
                      </button>
                      {selectedUserIds.size > 0 && (
                        <>
                          <span className="text-text-light-secondary">•</span>
                          <button
                            onClick={clearSelection}
                            className="text-sm text-red-500 hover:text-red-400 font-medium transition-colors"
                          >
                            Limpar seleção
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div 
                className="max-h-[600px] overflow-y-auto"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                  if (bottom && hasMore && !isLoadingMore) {
                    loadMore();
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-text-light-secondary/30 mx-auto mb-4" />
                    <p className="text-text-light-secondary text-lg">
                      {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
                    </p>
                    <p className="text-text-light-secondary/70 text-sm mt-1">
                      {searchQuery ? 'Tente buscar com outros termos' : 'Todos os usuários já são mentorados'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-light dark:divide-border-dark">
                    {filteredUsers.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        isSelected={selectedUserIds.has(user.id)}
                        onToggle={() => !user.isMentee && toggleUserSelection(user.id)}
                      />
                    ))}
                    
                    {isLoadingMore && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Duration Settings */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 shadow-sm sticky top-28">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-5 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Duração da Mentoria
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[30, 60, 90, 180].map((days) => (
                    <button
                      key={days}
                      onClick={() => {
                        setDurationOption(days as DurationOption);
                        setUseEndDate(false);
                      }}
                      className={`p-3.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        durationOption === days && !useEndDate
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50 text-text-light-primary dark:text-text-dark-primary'
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    setDurationOption('custom');
                    setUseEndDate(false);
                  }}
                  className={`w-full p-3.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    durationOption === 'custom' && !useEndDate
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 text-text-light-primary dark:text-text-dark-primary'
                  }`}
                >
                  Personalizado
                </button>
                
                {durationOption === 'custom' && !useEndDate && (
                  <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                      className="flex-1 px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                        dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                    />
                    <span className="text-sm text-text-light-secondary">dias</span>
                  </div>
                )}
                
                <div className="border-t border-border-light dark:border-border-dark pt-4">
                  <button
                    onClick={() => setUseEndDate(!useEndDate)}
                    className={`w-full p-3.5 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                      useEndDate
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border-light dark:border-border-dark hover:border-primary/50 text-text-light-primary dark:text-text-dark-primary'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Definir data específica
                  </button>
                  
                  {useEndDate && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="date"
                        min={minDate}
                        value={endDate || defaultEndDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                          dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-xs text-text-light-secondary mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Termina em {formatDate(endDate || defaultEndDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Users Summary */}
            {selectedUsers.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Selecionados ({selectedUsers.length})
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center gap-3 p-2.5 bg-background-light dark:bg-background-dark rounded-xl
                        hover:bg-primary/5 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {user.photo_url ? (
                          <Image
                            src={user.photo_url}
                            alt={user.display_name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                          {user.display_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-text-light-secondary truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleUserSelection(user.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500 
                          opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Configuração Financeira
                  </p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                    Após adicionar os mentorados, você poderá configurar as informações financeiras 
                    de cada um na aba de mentorados do programa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// USER ROW COMPONENT
// ============================================

interface UserRowProps {
  user: UserWithMentorshipStatus;
  isSelected: boolean;
  onToggle: () => void;
}

function UserRow({ user, isSelected, onToggle }: UserRowProps) {
  const isAvailable = !user.isMentee;
  
  return (
    <div
      className={`p-5 hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200 
        ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''} 
        ${!isAvailable ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={isAvailable ? onToggle : undefined}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div className="flex-shrink-0">
          {isAvailable ? (
            <div
              className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                  : 'border-border-light dark:border-border-dark hover:border-primary'
              }`}
            >
              {isSelected && <Check className="w-4 h-4" />}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <X className="w-3 h-3 text-gray-400" />
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-800">
          {user.photo_url ? (
            <Image
              src={user.photo_url}
              alt={user.display_name || 'User'}
              width={48}
              height={48}
              className="w-12 h-12 object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-primary" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
              {user.display_name || 'Sem nome'}
            </h3>
            {!isAvailable && (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Já é mentorado
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-text-light-secondary">
            <span className="flex items-center gap-1.5 truncate">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </span>
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <CalendarDays className="w-4 h-4" />
              {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          
          {user.isMentee && user.mentorshipEndDate && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Mentoria expira em {new Date(user.mentorshipEndDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          {isAvailable ? (
            isSelected ? (
              <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Selecionado
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
                Disponível
              </span>
            )
          ) : (
            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-semibold rounded-full">
              Indisponível
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
