'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  menteeFinancialService,
  BillingReminder,
  ReminderStatus,
  MentorFinancialStats,
} from '@/lib/services/menteeFinancialService';

type TabId = 'today' | 'week' | 'pending' | 'overdue' | 'paid' | 'all';

export default function CobrancasPage() {
  const toast = useToast();
  const [reminders, setReminders] = useState<BillingReminder[]>([]);
  const [stats, setStats] = useState<MentorFinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, remindersData] = await Promise.all([
        menteeFinancialService.getStats(),
        activeTab === 'today'
          ? menteeFinancialService.getTodayReminders()
          : activeTab === 'week'
          ? menteeFinancialService.getWeekReminders()
          : menteeFinancialService.listReminders(
              activeTab === 'all' ? undefined : {
                status: activeTab === 'pending' ? [ReminderStatus.PENDING] :
                        activeTab === 'overdue' ? [ReminderStatus.OVERDUE] :
                        activeTab === 'paid' ? [ReminderStatus.PAID] : undefined
              }
            ).then(r => r.data),
      ]);
      setStats(statsData);
      setReminders(remindersData);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReminders = useMemo(() => {
    if (!searchQuery) return reminders;
    const query = searchQuery.toLowerCase();
    return reminders.filter(r =>
      r.mentee?.display_name?.toLowerCase().includes(query) ||
      r.mentee?.email?.toLowerCase().includes(query)
    );
  }, [reminders, searchQuery]);

  const handleConfirmPayment = async (reminderId: string) => {
    setConfirmingId(reminderId);
    try {
      await menteeFinancialService.confirmPayment(reminderId);
      toast.success('Pagamento confirmado!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRevertPayment = async (reminderId: string) => {
    if (!confirm('Tem certeza que deseja reverter este pagamento? O registro será removido do histórico.')) return;
    
    setConfirmingId(reminderId);
    try {
      await menteeFinancialService.revertPayment(reminderId);
      toast.success('Pagamento revertido!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reverter pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusBadge = (status: ReminderStatus) => {
    const styles = {
      [ReminderStatus.PENDING]: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      [ReminderStatus.PAID]: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      [ReminderStatus.OVERDUE]: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      [ReminderStatus.SENT]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      [ReminderStatus.CANCELLED]: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    };
    const labels = {
      [ReminderStatus.PENDING]: 'Pendente',
      [ReminderStatus.PAID]: 'Pago',
      [ReminderStatus.OVERDUE]: 'Atrasado',
      [ReminderStatus.SENT]: 'Enviado',
      [ReminderStatus.CANCELLED]: 'Cancelado',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Cobranças', icon: 'payments', href: '/mentor/cobrancas' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Lembretes de Cobrança
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Gerencie os pagamentos dos seus mentorados
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon="today"
            label="Hoje"
            value={stats.todayReminders}
            color="blue"
          />
          <StatCard
            icon="pending"
            label="Pendentes"
            value={stats.pendingReminders}
            color="amber"
          />
          <StatCard
            icon="warning"
            label="Atrasados"
            value={stats.overdueReminders}
            color="red"
          />
          <StatCard
            icon="attach_money"
            label="A Receber"
            value={formatCurrency(stats.pendingPayments)}
            color="emerald"
            isText
          />
        </div>
      )}

      {/* Tabs e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <TabGroup
          tabs={[
            { id: 'today', label: 'Hoje', icon: 'today' },
            { id: 'week', label: 'Próx. 7 dias', icon: 'date_range' },
            { id: 'pending', label: 'Pendentes', icon: 'pending' },
            { id: 'overdue', label: 'Atrasados', icon: 'warning' },
            { id: 'paid', label: 'Pagos', icon: 'check_circle' },
            { id: 'all', label: 'Todos', icon: 'list' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />

        <div className="relative flex-1 lg:w-64 lg:flex-none">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar mentorado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Lista de Lembretes */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-primary/10 rounded-2xl">
              <span className="material-symbols-outlined text-primary text-5xl">
                {activeTab === 'today' ? 'event_available' : 'payments'}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {activeTab === 'today' ? 'Nenhuma cobrança para hoje!' : 
             activeTab === 'week' ? 'Nenhuma cobrança nos próximos 7 dias!' : 
             'Nenhum lembrete encontrado'}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {activeTab === 'today' 
              ? 'Você não tem cobranças pendentes para hoje.'
              : activeTab === 'week'
              ? 'Você não tem cobranças pendentes para os próximos 7 dias.'
              : 'Não há lembretes com os filtros selecionados.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-5
                border-2 transition-all duration-200
                ${reminder.status === ReminderStatus.OVERDUE 
                  ? 'border-red-300 dark:border-red-800' 
                  : 'border-border-light dark:border-border-dark'
                }`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
                  {reminder.mentee?.photo_url ? (
                    <Image src={reminder.mentee.photo_url} alt={reminder.mentee.display_name || ''} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">person</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                      {reminder.mentee?.display_name || 'Sem nome'}
                    </h4>
                    {getStatusBadge(reminder.status)}
                  </div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {reminder.mentee?.email}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-light-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      Vencimento: {formatDate(reminder.dueDate)}
                    </span>
                    {reminder.installmentNumber && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">receipt</span>
                        Parcela {reminder.installmentNumber}/{reminder.totalInstallments}
                      </span>
                    )}
                  </div>
                </div>

                {/* Valor e Ações */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                    {formatCurrency(reminder.amount)}
                  </span>
                  {reminder.status === ReminderStatus.PENDING || reminder.status === ReminderStatus.OVERDUE ? (
                    <button
                      onClick={() => handleConfirmPayment(reminder.id)}
                      disabled={confirmingId === reminder.id}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold
                        hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {confirmingId === reminder.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">check</span>
                      )}
                      Confirmar
                    </button>
                  ) : reminder.status === ReminderStatus.PAID && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Pago em {reminder.paidAt ? formatDate(reminder.paidAt) : '-'}
                      </span>
                      <button
                        onClick={() => handleRevertPayment(reminder.id)}
                        disabled={confirmingId === reminder.id}
                        className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 
                          rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        {confirmingId === reminder.id ? (
                          <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-sm">undo</span>
                        )}
                        Reverter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Componente de Card de Estatística
function StatCard({ 
  icon, 
  label, 
  value, 
  color,
  isText = false 
}: { 
  icon: string; 
  label: string; 
  value: number | string; 
  color: 'blue' | 'amber' | 'red' | 'emerald';
  isText?: boolean;
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4
      border border-border-light dark:border-border-dark">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{label}</p>
          <p className={`font-bold text-text-light-primary dark:text-text-dark-primary ${isText ? 'text-base' : 'text-xl'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
