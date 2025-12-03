'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { mentorshipBatchService, MentorshipWithUser } from '@/lib/services/mentorshipBatchService';
import Image from 'next/image';
import Checkbox from '@/components/ui/Checkbox';
import {
  Search, Users, X, Loader2, Clock, Mail, UserPlus,
  User, Pause, Play, Trash2, CalendarPlus, DollarSign,
  CheckCircle2, XCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface MenteesTabProps {
  programId: string;
  programStatus: string;
  onTotalChange?: (total: number) => void;
}

type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
type BatchAction = 'suspend' | 'reactivate' | 'extend' | 'remove' | 'financial';
type SortField = 'name' | 'status' | 'startDate' | 'daysRemaining' | 'financial';
type SortDirection = 'asc' | 'desc';

// ============================================
// MAIN COMPONENT
// ============================================

export function MenteesTab({ programId, programStatus, onTotalChange }: MenteesTabProps) {
  const router = useRouter();
  const toast = useToast();

  // Data states
  const [mentees, setMentees] = useState<MentorshipWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [, setPage] = useState(1);
  const [, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Action states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [showFinancialModal, setShowFinancialModal] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // ============================================
  // DATA LOADING
  // ============================================

  const loadMentees = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) setIsLoading(true);
    
    try {
      const response = await mentorshipBatchService.getProgramMentees(programId, {
        search: searchQuery.length >= 2 ? searchQuery : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: pageNum,
        limit: 50,
      });

      if (append) {
        setMentees(prev => [...prev, ...response.data]);
      } else {
        setMentees(response.data);
      }
      
      setTotal(response.total);
      setHasMore(response.hasMore);
      setPage(pageNum);
      
      // Notificar o componente pai sobre a contagem total
      if (onTotalChange) {
        onTotalChange(response.total);
      }
    } catch (error: any) {
      console.error('Erro ao carregar mentorados:', error);
      toast.error('Erro ao carregar mentorados');
    } finally {
      setIsLoading(false);
    }
  }, [programId, searchQuery, statusFilter, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMentees(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadMentees(1, false);
  }, [programId]);

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mentees.map(m => m.id)));
    }
    setIsAllSelected(!isAllSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsAllSelected(false);
  };

  // ============================================
  // BATCH ACTIONS
  // ============================================

  const handleBatchAction = async (action: BatchAction) => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um mentorado');
      return;
    }

    const ids = Array.from(selectedIds);

    if (action === 'financial') {
      setShowFinancialModal(true);
      return;
    }

    if (action === 'extend') {
      setShowExtendModal(true);
      return;
    }

    if (action === 'remove') {
      if (!confirm(`Tem certeza que deseja remover ${ids.length} mentorado(s)?`)) return;
    }

    setIsActionLoading(true);
    try {
      switch (action) {
        case 'suspend':
          await mentorshipBatchService.suspendMentees(ids);
          toast.success(`${ids.length} mentorado(s) suspenso(s)`);
          break;
        case 'reactivate':
          await mentorshipBatchService.reactivateMentees(ids);
          toast.success(`${ids.length} mentorado(s) reativado(s)`);
          break;
        case 'remove':
          await mentorshipBatchService.removeMentees({ mentorshipIds: ids });
          toast.success(`${ids.length} mentorado(s) removido(s)`);
          break;
      }
      
      clearSelection();
      loadMentees(1, false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (selectedIds.size === 0) return;
    
    setIsActionLoading(true);
    try {
      await mentorshipBatchService.extendMentees(Array.from(selectedIds), extendDays);
      toast.success(`Tempo estendido em ${extendDays} dias para ${selectedIds.size} mentorado(s)`);
      setShowExtendModal(false);
      clearSelection();
      loadMentees(1, false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao estender tempo');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFinancialUpdate = async (data: {
    paymentType: string;
    paymentModality: string;
    totalAmount: number;
    installments: number;
    billingFrequency: string;
    customFrequencyDays?: number;
  }) => {
    if (selectedIds.size === 0) return;
    
    setIsActionLoading(true);
    try {
      await mentorshipBatchService.updateFinancialInfo({
        mentorshipIds: Array.from(selectedIds),
        paymentType: data.paymentType,
        paymentModality: data.paymentModality,
        totalAmount: data.totalAmount,
        installments: data.installments,
        billingFrequency: data.billingFrequency,
        customFrequencyDays: data.customFrequencyDays,
      });
      toast.success(`Informações financeiras atualizadas para ${selectedIds.size} mentorado(s)`);
      setShowFinancialModal(false);
      clearSelection();
      loadMentees(1, false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar informações financeiras');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Sorted mentees
  const sortedMentees = useMemo(() => {
    const sorted = [...mentees].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = (a.user.display_name || '').localeCompare(b.user.display_name || '');
          break;
        case 'startDate':
          comparison = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
          break;
        case 'daysRemaining':
          const daysA = a.endDate ? Math.ceil((new Date(a.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 9999;
          const daysB = b.endDate ? Math.ceil((new Date(b.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 9999;
          comparison = daysA - daysB;
          break;
        case 'status':
          const statusOrder: Record<string, number> = { 'ACTIVE': 1, 'SUSPENDED': 2, 'EXPIRED': 3, 'CANCELLED': 4 };
          comparison = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
          break;
        case 'financial':
          const finStatusA = a.financialInfo?.status === 'active' ? 1 : 0;
          const finStatusB = b.financialInfo?.status === 'active' ? 1 : 0;
          comparison = finStatusA - finStatusB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [mentees, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary" /> 
      : <ArrowDown className="w-4 h-4 text-primary" />;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light-secondary" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'ACTIVE', 'SUSPENDED', 'EXPIRED'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
              >
                {status === 'all' ? 'Todos' : 
                 status === 'ACTIVE' ? 'Ativos' : 
                 status === 'SUSPENDED' ? 'Suspensos' : 'Expirados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-primary font-semibold">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <button onClick={clearSelection} className="text-sm text-text-light-secondary hover:text-primary">
              Limpar seleção
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <ActionButton 
              icon={Pause} 
              label="Suspender" 
              onClick={() => handleBatchAction('suspend')}
              disabled={isActionLoading}
              variant="amber"
            />
            <ActionButton 
              icon={Play} 
              label="Reativar" 
              onClick={() => handleBatchAction('reactivate')}
              disabled={isActionLoading}
              variant="green"
            />
            <ActionButton 
              icon={CalendarPlus} 
              label="Estender" 
              onClick={() => handleBatchAction('extend')}
              disabled={isActionLoading}
              variant="blue"
            />
            <ActionButton 
              icon={DollarSign} 
              label="Financeiro" 
              onClick={() => handleBatchAction('financial')}
              disabled={isActionLoading}
              variant="purple"
            />
            <ActionButton 
              icon={Trash2} 
              label="Remover" 
              onClick={() => handleBatchAction('remove')}
              disabled={isActionLoading}
              variant="red"
            />
          </div>
        </div>
      )}

      {/* Mentees List */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
        {/* List Header with Sort */}
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={isAllSelected}
              onChange={selectAll}
            />
            <span className="text-sm text-text-light-secondary">
              {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </span>
            
            <button 
              onClick={() => loadMentees(1, false)} 
              className="ml-auto p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 text-text-light-secondary ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Sort Headers */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
            <div className="w-5" /> {/* Checkbox space */}
            <div className="w-12" /> {/* Avatar space */}
            
            <button 
              onClick={() => handleSort('name')}
              className="flex-1 flex items-center justify-start gap-2 text-sm font-medium text-text-light-secondary hover:text-primary transition-colors text-left"
            >
              Nome <SortIcon field="name" />
            </button>
            
            <button 
              onClick={() => handleSort('status')}
              className="hidden md:flex items-center justify-center gap-2 text-sm font-medium text-text-light-secondary hover:text-primary transition-colors w-24"
            >
              Status <SortIcon field="status" />
            </button>
            
            <button 
              onClick={() => handleSort('startDate')}
              className="hidden md:flex items-center justify-center gap-2 text-sm font-medium text-text-light-secondary hover:text-primary transition-colors w-28"
            >
              Inclusão <SortIcon field="startDate" />
            </button>
            
            <button 
              onClick={() => handleSort('daysRemaining')}
              className="flex items-center justify-center gap-2 text-sm font-medium text-text-light-secondary hover:text-primary transition-colors w-24"
            >
              Restante <SortIcon field="daysRemaining" />
            </button>
            
            <button 
              onClick={() => handleSort('financial')}
              className="flex items-center justify-center gap-2 text-sm font-medium text-text-light-secondary hover:text-primary transition-colors w-28"
            >
              Financeiro <SortIcon field="financial" />
            </button>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : mentees.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-text-light-secondary/30 mx-auto mb-4" />
            <p className="text-text-light-secondary text-lg">Nenhum mentorado encontrado</p>
            {programStatus === 'active' && (
              <button
                onClick={() => router.push(`/mentor/mentorias/${programId}/adicionar`)}
                className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 
                  transition-all inline-flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Adicionar Mentorados
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {sortedMentees.map((mentee) => (
              <MenteeRow
                key={mentee.id}
                mentee={mentee}
                isSelected={selectedIds.has(mentee.id)}
                onToggle={() => toggleSelection(mentee.id)}
                onClick={() => router.push(`/mentor/mentorados/${mentee.user.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extend Modal */}
      {showExtendModal && (
        <ExtendModal
          count={selectedIds.size}
          days={extendDays}
          onDaysChange={setExtendDays}
          onConfirm={handleExtend}
          onCancel={() => setShowExtendModal(false)}
          isLoading={isActionLoading}
        />
      )}

      {/* Financial Modal */}
      {showFinancialModal && (
        <FinancialModal
          count={selectedIds.size}
          onConfirm={handleFinancialUpdate}
          onCancel={() => setShowFinancialModal(false)}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
}


// ============================================
// ACTION BUTTON COMPONENT
// ============================================

function ActionButton({ icon: Icon, label, onClick, disabled, variant }: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'amber' | 'green' | 'blue' | 'purple' | 'red';
}) {
  const variantClasses = {
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50',
    green: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 
        disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================
// MENTEE ROW COMPONENT
// ============================================

function MenteeRow({ mentee, isSelected, onToggle, onClick }: {
  mentee: MentorshipWithUser;
  isSelected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const daysRemaining = mentee.endDate 
    ? Math.ceil((new Date(mentee.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      ACTIVE: { 
        label: 'Ativo', 
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: CheckCircle2
      },
      SUSPENDED: { 
        label: 'Suspenso', 
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: Pause
      },
      EXPIRED: { 
        label: 'Expirado', 
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle
      },
      CANCELLED: { 
        label: 'Cancelado', 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: X
      },
    };
    return config[status] || config.ACTIVE;
  };

  const statusConfig = getStatusBadge(mentee.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div 
      className={`p-4 hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200 
        ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onChange={onToggle}
          />
        </div>

        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center 
            flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-800 cursor-pointer"
          onClick={onClick}
        >
          {mentee.user.photo_url ? (
            <Image
              src={mentee.user.photo_url}
              alt={mentee.user.display_name}
              width={48}
              height={48}
              className="w-12 h-12 object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-primary" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate hover:text-primary transition-colors mb-1">
            {mentee.user.display_name || 'Sem nome'}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-text-light-secondary truncate">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{mentee.user.email}</span>
          </div>
        </div>

        {/* Status Badge - hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0 justify-center w-24">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.className}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>

        {/* Start Date - hidden on mobile */}
        <div className="hidden md:block flex-shrink-0 text-center w-28">
          {mentee.startDate && (
            <p className="text-sm text-text-light-secondary">
              {new Date(mentee.startDate).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Days Remaining */}
        <div className="flex-shrink-0 text-right w-24">
          {daysRemaining !== null && (
            <div className={`flex items-center justify-end gap-1.5 text-sm ${
              daysRemaining <= 0 ? 'text-red-600' :
              daysRemaining <= 7 ? 'text-amber-600' :
              'text-text-light-secondary'
            }`}>
              <Clock className="w-4 h-4" />
              {daysRemaining > 0 ? `${daysRemaining}d` : 'Expirado'}
            </div>
          )}
          {mentee.endDate && (
            <p className="text-xs text-text-light-secondary mt-1">
              {new Date(mentee.endDate).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Financial Status */}
        <div className="flex-shrink-0 w-28">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            mentee.financialInfo?.status === 'active' 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            <DollarSign className="w-3 h-3 inline mr-1" />
            {mentee.financialInfo?.status === 'active' ? 'Configurado' : 'Pendente'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXTEND MODAL COMPONENT
// ============================================

function ExtendModal({ count, days, onDaysChange, onConfirm, onCancel, isLoading }: {
  count: number;
  days: number;
  onDaysChange: (days: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
          Estender Tempo
        </h3>
        <p className="text-text-light-secondary mb-6">
          Estender o tempo de mentoria para {count} mentorado{count !== 1 ? 's' : ''}.
        </p>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => onDaysChange(d)}
                className={`py-3 rounded-xl font-medium transition-all ${
                  days === d
                    ? 'bg-primary text-white'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-light-secondary">Personalizado:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => onDaysChange(parseInt(e.target.value) || 30)}
              className="w-24 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light 
                dark:border-border-dark rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-text-light-secondary">dias</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 border border-border-light dark:border-border-dark rounded-xl font-medium 
              hover:bg-background-light dark:hover:bg-background-dark transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 
              transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CalendarPlus className="w-5 h-5" />
                Estender
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FINANCIAL MODAL COMPONENT
// ============================================

interface FinancialFormData {
  paymentType: string;
  paymentModality: string;
  totalAmount: number;
  installments: number;
  billingFrequency: string;
  customFrequencyDays?: number;
  notes?: string;
}

const paymentTypeOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
];

const billingFrequencyOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

function FinancialModal({ count, onConfirm, onCancel, isLoading }: {
  count: number;
  onConfirm: (data: FinancialFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<FinancialFormData>({
    paymentType: 'pix',
    paymentModality: 'cash',
    totalAmount: 0,
    installments: 1,
    billingFrequency: 'monthly',
    notes: '',
  });

  const handleChange = (field: keyof FinancialFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Configurar Financeiro
            </h3>
            <p className="text-sm text-text-light-secondary">
              Aplicar para {count} mentorado{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              Tipo de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('paymentType', option.value)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    formData.paymentType === option.value
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('paymentModality', 'cash')}
                className={`py-4 rounded-xl font-medium transition-all ${
                  formData.paymentModality === 'cash'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
              >
                💵 À Vista
              </button>
              <button
                type="button"
                onClick={() => handleChange('paymentModality', 'installment')}
                className={`py-4 rounded-xl font-medium transition-all ${
                  formData.paymentModality === 'installment'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
              >
                💳 Parcelado
              </button>
            </div>
          </div>

          {/* Valor e Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                Valor Total (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.totalAmount || ''}
                  onChange={(e) => handleChange('totalAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                    dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            {formData.paymentModality === 'installment' && (
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Parcelas
                </label>
                <select
                  value={formData.installments}
                  onChange={(e) => handleChange('installments', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                    dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>{n}x de R$ {(formData.totalAmount / n).toFixed(2)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Frequência de Cobrança */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              Frequência de Cobrança
            </label>
            <div className="grid grid-cols-3 gap-2">
              {billingFrequencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('billingFrequency', option.value)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.billingFrequency === option.value
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {formData.billingFrequency === 'custom' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-text-light-secondary">A cada</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.customFrequencyDays || 30}
                  onChange={(e) => handleChange('customFrequencyDays', parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light 
                    dark:border-border-dark rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-sm text-text-light-secondary">dias</span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Anotações sobre o pagamento..."
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light 
                dark:border-border-dark rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Resumo */}
          {formData.totalAmount > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h4 className="font-semibold text-primary mb-2">Resumo</h4>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-text-light-secondary">Valor Total:</span>
                  <span className="font-semibold">R$ {formData.totalAmount.toFixed(2)}</span>
                </p>
                {formData.paymentModality === 'installment' && formData.installments > 1 && (
                  <p className="flex justify-between">
                    <span className="text-text-light-secondary">Parcelas:</span>
                    <span className="font-semibold">{formData.installments}x de R$ {(formData.totalAmount / formData.installments).toFixed(2)}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span className="text-text-light-secondary">Frequência:</span>
                  <span className="font-semibold">
                    {billingFrequencyOptions.find(o => o.value === formData.billingFrequency)?.label}
                    {formData.billingFrequency === 'custom' && ` (${formData.customFrequencyDays || 30} dias)`}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-text-light-secondary">Mentorados:</span>
                  <span className="font-semibold">{count}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 border border-border-light dark:border-border-dark rounded-xl font-medium 
              hover:bg-background-light dark:hover:bg-background-dark transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(formData)}
            disabled={isLoading || formData.totalAmount <= 0}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 
              transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Aplicar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenteesTab;
