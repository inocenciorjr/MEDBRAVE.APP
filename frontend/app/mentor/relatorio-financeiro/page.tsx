'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useToast } from '@/lib/contexts/ToastContext';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Calendar,
  CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw, Download
} from 'lucide-react';

interface FinancialReport {
  summary: {
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    paidThisMonth: number;
    paidLastMonth: number;
    growthPercentage: number;
    averageTicket: number;
    totalPayments: number;
  };
  recentPayments: {
    id: string;
    amount: number;
    paymentType: string;
    paymentDate: string;
    installmentNumber?: number;
    mentee?: { id: string; display_name: string; email: string; photo_url?: string };
  }[];
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  payments: number;
}

interface PaymentTypeData {
  type: string;
  label: string;
  revenue: number;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface TopMentee {
  menteeId: string;
  name: string;
  email: string;
  avatar?: string;
  totalPaid: number;
  paymentsCount: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];


export default function RelatorioFinanceiroPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [paymentTypeData, setPaymentTypeData] = useState<PaymentTypeData[]>([]);
  const [topMentees, setTopMentees] = useState<TopMentee[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180' | '365'>('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        params.append('startDate', startDate.toISOString());
      }

      const [reportRes, monthlyRes, typeRes, topRes] = await Promise.all([
        fetchWithAuth(`/mentorship/financial/report?${params}`),
        fetchWithAuth('/mentorship/financial/report/monthly'),
        fetchWithAuth('/mentorship/financial/report/by-payment-type'),
        fetchWithAuth('/mentorship/financial/report/top-mentees?limit=5'),
      ]);

      const [reportData, monthlyDataRes, typeDataRes, topDataRes] = await Promise.all([
        reportRes.json(),
        monthlyRes.json(),
        typeRes.json(),
        topRes.json(),
      ]);

      if (reportData.success) setReport(reportData.data);
      if (monthlyDataRes.success) setMonthlyData(monthlyDataRes.data);
      if (typeDataRes.success) setPaymentTypeData(typeDataRes.data);
      if (topDataRes.success) setTopMentees(topDataRes.data);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar relatório');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const paymentTypeLabels: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    bank_transfer: 'Transferência',
    cash: 'Dinheiro',
    other: 'Outro',
  };

  // Skeleton Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Mentor', icon: 'school', href: '/mentor' },
            { label: 'Relatório Financeiro', icon: 'analytics', href: '/mentor/relatorio-financeiro' },
          ]}
        />
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
            <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Relatório Financeiro', icon: 'analytics', href: '/mentor/relatorio-financeiro' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Relatório Financeiro
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Acompanhe sua receita e pagamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light 
              dark:border-border-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todo período</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 6 meses</option>
            <option value="365">Último ano</option>
          </select>
          <button
            onClick={loadData}
            className="p-2.5 bg-surface-light dark:bg-surface-dark border border-border-light 
              dark:border-border-dark rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-text-light-secondary" />
          </button>
        </div>
      </div>


      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Receita Total"
            value={formatCurrency(report.summary.totalRevenue)}
            color="emerald"
            subtitle={`${report.summary.totalPayments} pagamentos`}
          />
          <SummaryCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Este Mês"
            value={formatCurrency(report.summary.paidThisMonth)}
            color="blue"
            trend={report.summary.growthPercentage}
            trendLabel="vs mês anterior"
          />
          <SummaryCard
            icon={<Calendar className="w-6 h-6" />}
            label="Pendente"
            value={formatCurrency(report.summary.pendingAmount)}
            color="amber"
            subtitle="A receber"
          />
          <SummaryCard
            icon={<CreditCard className="w-6 h-6" />}
            label="Ticket Médio"
            value={formatCurrency(report.summary.averageTicket)}
            color="purple"
            subtitle="Por pagamento"
          />
        </div>
      )}

      {/* Alert for Overdue */}
      {report && report.summary.overdueAmount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-700 dark:text-red-400">
              Você tem {formatCurrency(report.summary.overdueAmount)} em cobranças atrasadas
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">
              Entre em contato com seus mentorados para regularizar os pagamentos
            </p>
          </div>
          <a
            href="/mentor/cobrancas?tab=overdue"
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Ver Atrasados
          </a>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Receita Mensal
          </h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Nenhum dado de receita disponível" />
          )}
        </div>

        {/* Payment Type Distribution */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Receita por Tipo de Pagamento
          </h3>
          {paymentTypeData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="revenue"
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {paymentTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {paymentTypeData.map((item, index) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {item.label}
                      </p>
                      <p className="text-xs text-text-light-secondary">
                        {item.count} pagamentos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                        {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-xs text-text-light-secondary">
                        {item.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="Nenhum pagamento registrado" />
          )}
        </div>
      </div>


      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Mentees */}
        <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-5 border-b border-border-light dark:border-border-dark">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Top Mentorados
            </h3>
          </div>
          {topMentees.length > 0 ? (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {topMentees.map((mentee, index) => (
                <div key={mentee.menteeId} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      {mentee.avatar ? (
                        <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                      ) : (
                        <span className="text-primary font-semibold">
                          {mentee.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                      {mentee.name}
                    </p>
                    <p className="text-xs text-text-light-secondary truncate">
                      {mentee.paymentsCount} pagamentos
                    </p>
                  </div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(mentee.totalPaid)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-text-light-secondary">Nenhum pagamento registrado</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Pagamentos Recentes
            </h3>
            <a
              href="/mentor/cobrancas?tab=paid"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          {report && report.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-light-secondary uppercase tracking-wider">
                      Mentorado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-light-secondary uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-light-secondary uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-light-secondary uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {report.recentPayments.slice(0, 10).map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {payment.mentee?.photo_url ? (
                              <Image src={payment.mentee.photo_url} alt="" width={32} height={32} className="object-cover" />
                            ) : (
                              <span className="text-primary text-sm font-semibold">
                                {payment.mentee?.display_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                              {payment.mentee?.display_name || 'Sem nome'}
                            </p>
                            {payment.installmentNumber && (
                              <p className="text-xs text-text-light-secondary">
                                Parcela {payment.installmentNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                          {paymentTypeLabels[payment.paymentType] || payment.paymentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-light-secondary">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-text-light-secondary">Nenhum pagamento registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Comparison Bar Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-6">
            Quantidade de Pagamentos por Mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'payments' ? `${value} pagamentos` : formatCurrency(value),
                  name === 'payments' ? 'Pagamentos' : 'Receita'
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              />
              <Bar
                dataKey="payments"
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}


// ============================================
// COMPONENTES AUXILIARES
// ============================================

function SummaryCard({
  icon,
  label,
  value,
  color,
  subtitle,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'red';
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-5
      hover:shadow-lg dark:hover:shadow-dark-lg transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          {subtitle}
        </p>
      )}
      {trendLabel && trend !== undefined && (
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          {trendLabel}
        </p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
        <DollarSign className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
        {message}
      </p>
    </div>
  );
}
