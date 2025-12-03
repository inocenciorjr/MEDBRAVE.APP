'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import MenteeManagementModal from './MenteeManagementModal';

interface AddMenteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programId?: string; // ID do programa de mentoria (opcional)
  openFinancialAfterAdd?: boolean; // Abrir modal financeiro após adicionar
}

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

interface AddedMentee {
  id: string;
  mentorshipId: string;
  name: string;
  email: string;
  avatar?: string;
  status: string;
  expirationDate?: string;
}

export default function AddMenteeModal({ isOpen, onClose, onSuccess, programId, openFinancialAfterAdd = true }: AddMenteeModalProps) {
  const toast = useToast();
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  // Data states
  const [users, setUsers] = useState<UserWithMentorshipStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Duration states
  const [durationOption, setDurationOption] = useState<DurationOption>(30);
  const [customDays, setCustomDays] = useState(30);
  const [useEndDate, setUseEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Financial modal state
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [addedMentees, setAddedMentees] = useState<AddedMentee[]>([]);
  const [currentMenteeIndex, setCurrentMenteeIndex] = useState(0);
  
  // View mode: 'list' or 'details'
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserWithMentorshipStatus | null>(null);

  // Calculate minimum date for calendar (today)
  const minDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Calculate default end date based on duration
  const defaultEndDate = useMemo(() => {
    const date = new Date();
    const days = durationOption === 'custom' ? customDays : durationOption;
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, [durationOption, customDays]);

  // Load users when modal opens
  const loadUsers = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setUsers([]);
    }
    
    try {
      // Construir URL com paginação
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
  }, [toast, programId, searchQuery]);

  // Carregar mais usuários (scroll infinito)
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadUsers(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, loadUsers]);

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      
      // Animar primeiro, carregar depois
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      
      // Carregar usuários apenas se não tiver nenhum carregado
      if (users.length === 0) {
        setTimeout(() => {
          loadUsers(1, false);
        }, 100);
      }
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        setSearchQuery('');
        setSelectedUserIds(new Set());
        setDurationOption(30);
        setCustomDays(30);
        setUseEndDate(false);
        setEndDate('');
        setUsers([]); // Limpar usuários ao fechar
        setPage(1);
        setHasMore(true);
      }, 200);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Debounce search - recarregar quando busca mudar
  useEffect(() => {
    if (!isOpen) return;
    
    // Não recarregar se a busca estiver vazia e já tiver usuários
    if (!searchQuery.trim() && users.length > 0) return;
    
    const timer = setTimeout(() => {
      loadUsers(1, false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Usar users diretamente (busca já é feita no servidor)
  const filteredUsers = users;

  // Separate available and already added users
  const { availableUsers, addedUsers } = useMemo(() => {
    const available: UserWithMentorshipStatus[] = [];
    const added: UserWithMentorshipStatus[] = [];
    filteredUsers.forEach(user => {
      if (user.isMentee) {
        added.push(user);
      } else {
        available.push(user);
      }
    });
    return { availableUsers: available, addedUsers: added };
  }, [filteredUsers]);

  const toggleUserSelection = (userId: string, isMentee: boolean) => {
    if (isMentee) return;
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

  const selectAllAvailable = () => {
    setSelectedUserIds(new Set(availableUsers.map(u => u.id)));
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
      const body: any = { menteeIds: Array.from(selectedUserIds) };
      if (useEndDate && endDate) {
        // Enviar data no formato ISO mas com hora 23:59:59 para evitar problemas de timezone
        const [year, month, day] = endDate.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
        body.endDate = dateObj.toISOString();
      } else {
        body.durationDays = durationOption === 'custom' ? customDays : durationOption;
      }
      // Adicionar programId se fornecido
      if (programId) {
        body.programId = programId;
      }
      const response = await fetchWithAuth('/mentorship/mentor/mentees/batch', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        const { created, skipped, mentorships } = data.data;
        const createdText = created === 1 ? '1 mentorado adicionado' : `${created} mentorados adicionados`;
        const skippedText = skipped === 1 ? '1 já era mentorado' : `${skipped} já eram mentorados`;
        
        if (skipped > 0) {
          toast.success(`${createdText}. ${skippedText}.`);
        } else {
          toast.success(`${createdText} com sucesso!`);
        }
        
        // Se openFinancialAfterAdd está ativo e temos mentorados criados
        if (openFinancialAfterAdd && mentorships && mentorships.length > 0) {
          const newMentees: AddedMentee[] = mentorships.map((m: any) => {
            const user = users.find(u => u.id === m.mentee_id);
            return {
              id: m.mentee_id,
              mentorshipId: m.id,
              name: user?.display_name || 'Sem nome',
              email: user?.email || '',
              avatar: user?.photo_url,
              status: m.status || 'active',
              expirationDate: m.end_date,
            };
          });
          setAddedMentees(newMentees);
          setCurrentMenteeIndex(0);
          setShowFinancialModal(true);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        throw new Error(data.error || 'Erro ao adicionar mentorados');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar mentorados:', error);
      toast.error(error.message || 'Erro ao adicionar mentorados');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFinancialSuccess = () => {
    // Se há mais mentorados para configurar
    if (currentMenteeIndex < addedMentees.length - 1) {
      setCurrentMenteeIndex(prev => prev + 1);
    } else {
      // Todos configurados
      setShowFinancialModal(false);
      setAddedMentees([]);
      setCurrentMenteeIndex(0);
      onSuccess();
      onClose();
    }
  };
  
  const handleSkipFinancial = () => {
    // Pular configuração financeira
    if (currentMenteeIndex < addedMentees.length - 1) {
      setCurrentMenteeIndex(prev => prev + 1);
    } else {
      setShowFinancialModal(false);
      setAddedMentees([]);
      setCurrentMenteeIndex(0);
      onSuccess();
      onClose();
    }
  };
  
  const handleViewDetails = (user: UserWithMentorshipStatus) => {
    setSelectedUserForDetails(user);
    setViewMode('details');
  };
  
  const handleBackToList = () => {
    setSelectedUserForDetails(null);
    setViewMode('list');
  };

  const formatDate = (dateString: string) => {
    // Usar data local sem conversão de timezone
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
  };

  if (!shouldRender) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-[9999] transition-opacity duration-200
          ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-surface-light dark:bg-surface-dark
          shadow-2xl z-[10000] transform transition-transform duration-200 ease-out will-change-transform
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark
            bg-background-light dark:bg-background-dark">
            <div>
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Adicionar Mentorados
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                Selecione os alunos que deseja mentorar
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all duration-200">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
            {viewMode === 'details' && selectedUserForDetails ? (
              <UserDetailsView 
                user={selectedUserForDetails} 
                onBack={handleBackToList}
                onSelect={() => toggleUserSelection(selectedUserForDetails.id, selectedUserForDetails.isMentee)}
                isSelected={selectedUserIds.has(selectedUserForDetails.id)}
              />
            ) : (
            <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">Buscar Usuário</label>
                  {totalUsers > 0 && (
                    <p className="text-xs text-text-light-secondary mt-0.5">
                      {totalUsers} usuário{totalUsers !== 1 ? 's' : ''} encontrado{totalUsers !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {availableUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllAvailable} className="text-xs text-primary hover:text-primary/80">Selecionar visíveis</button>
                    {selectedUserIds.size > 0 && (
                      <>
                        <span className="text-text-light-secondary">•</span>
                        <button onClick={clearSelection} className="text-xs text-red-500 hover:text-red-400">Limpar</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary">search</span>
                <input
                  type="text"
                  placeholder="Digite o email ou nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {availableUsers.length > 0 && (
                  <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500 text-lg">person_add</span>
                      Disponíveis ({availableUsers.length})
                    </h3>
                    <div 
                      className="space-y-1 flex-1 overflow-y-auto pr-2"
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                        if (bottom && hasMore && !isLoadingMore) {
                          loadMore();
                        }
                      }}
                    >
                      {availableUsers.map((user) => (
                        <UserRow key={user.id} user={user} isSelected={selectedUserIds.has(user.id)} 
                          onToggle={() => toggleUserSelection(user.id, false)}
                          onViewDetails={() => handleViewDetails(user)} />
                      ))}
                      {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {addedUsers.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-text-light-secondary flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>
                      {addedUsers.length === 1 ? 'Já é mentorado (1)' : `Já são mentorados (${addedUsers.length})`}
                    </h3>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 opacity-60">
                      {addedUsers.map((user) => (
                        <UserRow key={user.id} user={user} isSelected={false} onToggle={() => {}} disabled endDate={user.mentorshipEndDate} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-text-light-secondary mb-2">search_off</span>
                    <p className="text-text-light-secondary">{searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}</p>
                  </div>
                )}
              </div>
            )}
            {selectedUserIds.size > 0 && (
              <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">Duração da Mentoria</label>
                  <button onClick={() => setUseEndDate(!useEndDate)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">{useEndDate ? 'timer' : 'calendar_month'}</span>
                    {useEndDate ? 'Usar dias' : 'Escolher data'}
                  </button>
                </div>
                {!useEndDate ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {([30, 60, 90, 180] as const).map((days) => (
                        <button key={days} onClick={() => setDurationOption(days)}
                          className={`py-3 rounded-xl font-medium transition-all ${durationOption === days ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:border-primary/30'}`}>
                          {days} dias
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDurationOption('custom')}
                        className={`px-3 py-2 rounded-lg text-sm ${durationOption === 'custom' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-text-light-secondary hover:text-primary'}`}>
                        Personalizado:
                      </button>
                      <input type="number" min="1" max="365" value={customDays}
                        onChange={(e) => { setCustomDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1))); setDurationOption('custom'); }}
                        className="w-20 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <span className="text-sm text-text-light-secondary">dias</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input type="date" min={minDate} value={endDate || defaultEndDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <p className="text-xs text-text-light-secondary">A mentoria terminará em {formatDate(endDate || defaultEndDate)}</p>
                  </div>
                )}
                
                {/* Info sobre configuração financeira */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">info</span>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Após adicionar, você poderá configurar as informações financeiras de cada mentorado (forma de pagamento, parcelas, lembretes, etc.)
                  </p>
                </div>
              </div>
            )}
            </>
            )}
          </div>
          <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="flex-1 py-3 px-4 border border-border-light dark:border-border-dark rounded-xl font-semibold text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={selectedUserIds.size === 0 || isSubmitting}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Adicionando...</>
                ) : (
                  <><span className="material-symbols-outlined">person_add</span>{selectedUserIds.size === 0 ? 'Adicionar' : selectedUserIds.size === 1 ? 'Adicionar (1)' : `Adicionar (${selectedUserIds.size})`}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Financial Configuration Modal */}
      {showFinancialModal && addedMentees.length > 0 && (
        <>
          <MenteeManagementModal
            isOpen={showFinancialModal}
            onClose={handleSkipFinancial}
            onSuccess={handleFinancialSuccess}
            mentee={addedMentees[currentMenteeIndex]}
          />
          {/* Progress indicator for multiple mentees */}
          {addedMentees.length > 1 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10001] bg-surface-light dark:bg-surface-dark 
              rounded-full px-4 py-2 shadow-xl border border-border-light dark:border-border-dark flex items-center gap-3">
              <span className="text-sm text-text-light-secondary">
                Configurando {currentMenteeIndex + 1} de {addedMentees.length}
              </span>
              <div className="flex gap-1">
                {addedMentees.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full ${
                    idx < currentMenteeIndex ? 'bg-emerald-500' :
                    idx === currentMenteeIndex ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                ))}
              </div>
              <button onClick={handleSkipFinancial} className="text-xs text-text-light-secondary hover:text-primary">
                Pular
              </button>
            </div>
          )}
        </>
      )}
    </>,
    document.body
  );
}

interface UserRowProps {
  user: UserWithMentorshipStatus;
  isSelected: boolean;
  onToggle: () => void;
  onViewDetails?: () => void;
  disabled?: boolean;
  endDate?: string | null;
}

function UserRow({ user, isSelected, onToggle, onViewDetails, disabled, endDate }: UserRowProps) {
  return (
    <div className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all
      ${disabled ? 'bg-surface-light/50 dark:bg-surface-dark/50' : isSelected ? 'bg-primary/10 border-2 border-primary' : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30'}`}>
      <button onClick={onToggle} disabled={disabled}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
          ${disabled ? 'border-gray-300 bg-gray-100 cursor-not-allowed' : isSelected ? 'border-primary bg-primary cursor-pointer' : 'border-border-light dark:border-border-dark cursor-pointer hover:border-primary'}`}>
        {(isSelected || disabled) && <span className={`material-symbols-outlined text-sm ${disabled ? 'text-gray-400' : 'text-white'}`}>check</span>}
      </button>
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
        {user.photo_url ? (
          <Image src={user.photo_url} alt={user.display_name || 'User'} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-primary">person</span></div>
        )}
      </div>
      <button onClick={onToggle} disabled={disabled} className="flex-1 min-w-0 text-left">
        <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">{user.display_name || 'Sem nome'}</p>
        <p className="text-sm text-text-light-secondary truncate">{user.email}</p>
        <p className="text-xs text-text-light-secondary mt-0.5">
          Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
        </p>
      </button>
      <div className="flex items-center gap-2">
        {onViewDetails && !disabled && (
          <button onClick={onViewDetails} className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-lg transition-colors"
            title="Ver detalhes">
            <span className="material-symbols-outlined text-text-light-secondary text-lg">visibility</span>
          </button>
        )}
        {user.isMentee ? (
          <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check</span>Adicionado
            </span>
            {endDate && (
              <span className="text-xs text-text-light-secondary">
                até {(() => {
                  const date = new Date(endDate);
                  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                })()}
              </span>
            )}
          </div>
        ) : isSelected ? (
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">Selecionado</span>
        ) : (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">Disponível</span>
        )}
      </div>
    </div>
  );
}

// User Details View Component
function UserDetailsView({ user, onBack, onSelect, isSelected }: {
  user: UserWithMentorshipStatus;
  onBack: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          Detalhes do Usuário
        </h3>
      </div>
      
      {/* Profile Card */}
      <div className="bg-background-light dark:bg-background-dark rounded-2xl p-6 border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
            {user.photo_url ? (
              <Image src={user.photo_url} alt={user.display_name || 'User'} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">person</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {user.display_name || 'Sem nome'}
            </h4>
            <p className="text-text-light-secondary">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                user.role === 'mentor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {user.role === 'admin' ? 'Admin' : user.role === 'mentor' ? 'Mentor' : 'Aluno'}
              </span>
              {user.isMentee && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">
                  Já é mentorado
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon="calendar_today" label="Cadastrado em" value={new Date(user.created_at).toLocaleDateString('pt-BR')} />
          <InfoItem icon="badge" label="Função" value={user.role === 'admin' ? 'Administrador' : user.role === 'mentor' ? 'Mentor' : 'Aluno'} />
          {user.isMentee && user.mentorshipStatus && (
            <InfoItem icon="assignment_ind" label="Status Mentoria" value={
              user.mentorshipStatus === 'active' ? 'Ativo' :
              user.mentorshipStatus === 'suspended' ? 'Suspenso' :
              user.mentorshipStatus === 'expired' ? 'Expirado' : user.mentorshipStatus
            } />
          )}
          {user.isMentee && user.mentorshipEndDate && (
            <InfoItem icon="event" label="Expira em" value={new Date(user.mentorshipEndDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} />
          )}
        </div>
      </div>
      
      {/* Action Button */}
      {!user.isMentee && (
        <button onClick={onSelect}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isSelected 
              ? 'bg-primary/10 text-primary border-2 border-primary' 
              : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30'
          }`}>
          <span className="material-symbols-outlined">{isSelected ? 'check_circle' : 'person_add'}</span>
          {isSelected ? 'Selecionado para adicionar' : 'Selecionar para adicionar'}
        </button>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-light dark:bg-surface-dark rounded-xl">
      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
      <div>
        <p className="text-xs text-text-light-secondary">{label}</p>
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{value}</p>
      </div>
    </div>
  );
}
