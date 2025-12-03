'use client';

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, RefreshCw, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface MenteeChargesTabProps {
  mentorshipId: string;
}

export function MenteeChargesTab({ mentorshipId }: MenteeChargesTabProps) {
  const toast = useToast();
  const [charges, setCharges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    loadCharges();
  }, [mentorshipId]);

  const loadCharges = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`/mentorship/financial/mentorship/${mentorshipId}/reminders`);
      const data = await response.json();
      if (data.success) {
        setCharges(data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar cobranças:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (reminderId: string) => {
    setConfirmingId(reminderId);
    try {
      const response = await fetchWithAuth(`/mentorship/financial/reminders/${reminderId}/confirm`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Pagamento confirmado!');
        loadCharges();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelReminder = async (reminderId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta cobrança?')) return;
    
    try {
      const response = await fetchWithAuth(`/mentorship/financial/reminders/${reminderId}/cancel`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Cobrança cancelada');
        loadCharges();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar cobrança');
    }
  };

  const handleRevertPayment = async (reminderId: string) => {
    if (!confirm('Tem certeza que deseja reverter este pagamento?')) return;
    
    setConfirmingId(reminderId);
    try {
      const response = await fetchWithAuth(`/mentorship/financial/reminders/${reminderId}/revert`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Pagamento revertido!');
        loadCharges();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reverter pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; bg: string; text: string; border: string; gradient: string }> = {
      pending: { 
        label: 'Pendente', 
        bg: 'bg-amber-100 dark:bg-amber-900/30', 
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/50',
        gradient: 'from-amber-500 to-orange-500'
      },
      paid: { 
        label: 'Pago', 
        bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        gradient: 'from-emerald-500 to-green-500'
      },
      overdue: { 
        label: 'Atrasado', 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/50',
        gradient: 'from-red-500 to-rose-500'
      },
      sent: { 
        label: 'Enviado', 
        bg: 'bg-blue-100 dark:bg-blue-900/30', 
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/50',
        gradient: 'from-blue-500 to-cyan-500'
      },
      cancelled: { 
        label: 'Cancelado', 
        bg: 'bg-gray-100 dark:bg-gray-800', 
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
        gradient: 'from-gray-500 to-slate-500'
      },
    };
    return configs[status] || configs.pending;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const stats = useMemo(() => {
    const pending = charges.filter(c => c.status === 'pending' || c.status === 'overdue');
    const paid = charges.filter(c => c.status === 'paid');
    const overdue = charges.filter(c => c.status === 'overdue');
    
    return {
      total: charges.length,
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length,
      pendingAmount: pending.reduce((sum, c) => sum + (c.amount || 0), 0),
      paidAmount: paid.reduce((sum, c) => sum + (c.amount || 0), 0),
    };
  }, [charges]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-24 bg-gradient-to-r from-border-light to-border-light/50 
                                  dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          ))}
        </div>
        <div className="animate-pulse h-96 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 
                        flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Cobranças do Mentorado
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Gerencie pagamentos e parcelas
            </p>
          </div>
        </div>
        <button 
          onClick={loadCharges} 
          className="p-3 rounded-xl bg-gradient-to-br from-background-light to-surface-light 
                   dark:from-background-dark dark:to-surface-dark 
                   border-2 border-border-light dark:border-border-dark
                   hover:border-primary/50 shadow-lg hover:shadow-xl
                   transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <RefreshCw className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-blue-500/5 
                      dark:from-surface-dark dark:to-blue-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {stats.total}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Total
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-amber-500/5 
                      dark:from-surface-dark dark:to-amber-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pending}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Pendentes
              </p>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-emerald-500/5 
                      dark:from-surface-dark dark:to-emerald-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.paid}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Pagos
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-red-500/5 
                      dark:from-surface-dark dark:to-red-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.overdue}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Atrasados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {charges.length === 0 ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-pink-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-pink-500/10 
                      rounded-2xl p-16 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                          dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <DollarSign className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
              Nenhuma cobrança encontrada
            </h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
              Configure o financeiro deste mentorado para gerar cobranças automaticamente.
            </p>
          </div>
        </div>
      ) : (
        /* Charges Table */
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-pink-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-pink-500/10 
                      rounded-2xl border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-background-light to-surface-light 
                             dark:from-background-dark dark:to-surface-dark
                             border-b-2 border-border-light dark:border-border-dark">
                  <th className="px-6 py-4 text-left text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                    Parcela
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border-light dark:divide-border-dark">
                {charges.map((charge) => {
                  const statusConfig = getStatusConfig(charge.status);
                  return (
                    <tr 
                      key={charge.id} 
                      className={`
                        hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent
                        transition-all duration-300 group
                        ${charge.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                      `}
                    >
                      <td className="px-6 py-4">
                        {charge.installmentNumber ? (
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${statusConfig.gradient}
                                          flex items-center justify-center shadow-md
                                          group-hover:scale-110 transition-transform`}>
                              <span className="text-white font-bold text-sm">
                                {charge.installmentNumber}
                              </span>
                            </div>
                            <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                              {charge.installmentNumber}/{charge.totalInstallments}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-light-secondary">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          charge.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-text-light-primary dark:text-text-dark-primary'
                        }`}>
                          {formatDate(charge.dueDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">
                          {formatCurrency(charge.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                                        ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}
                                        shadow-sm transition-all duration-200 hover:scale-105`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {(charge.status === 'pending' || charge.status === 'overdue') && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(charge.id)}
                                disabled={confirmingId === charge.id}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl 
                                         text-xs font-bold shadow-lg shadow-emerald-500/30
                                         hover:shadow-xl hover:scale-105 transition-all duration-300 
                                         disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {confirmingId === charge.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Pago
                              </button>
                              <button
                                onClick={() => handleCancelReminder(charge.id)}
                                className="p-2 bg-gradient-to-br from-background-light to-surface-light 
                                         dark:from-background-dark dark:to-surface-dark 
                                         border-2 border-border-light dark:border-border-dark
                                         rounded-xl hover:border-red-500/50 hover:scale-105 
                                         transition-all duration-300"
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          {charge.status === 'paid' && (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Pago em {charge.paidAt ? formatDate(charge.paidAt) : '-'}
                              </span>
                              <button
                                onClick={() => handleRevertPayment(charge.id)}
                                disabled={confirmingId === charge.id}
                                className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 
                                         hover:bg-red-50 dark:hover:bg-red-900/20 
                                         rounded-lg transition-all duration-300 
                                         disabled:opacity-50 flex items-center gap-1"
                              >
                                {confirmingId === charge.id ? (
                                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                Reverter
                              </button>
                            </div>
                          )}
                          {charge.status === 'cancelled' && (
                            <span className="text-xs text-gray-500 font-medium">Cancelado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
