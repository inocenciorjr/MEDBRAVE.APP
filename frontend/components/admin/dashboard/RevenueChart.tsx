'use client';

import React, { useEffect, useState } from 'react';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { getRevenueChartData, type RevenueChartData } from '@/services/admin/statsService';

interface RevenueChartProps {
  data?: RevenueChartData[];
}

export function RevenueChart({ data: propData }: RevenueChartProps) {
  const [data, setData] = useState<RevenueChartData[]>(propData || []);
  const [loading, setLoading] = useState(!propData);

  useEffect(() => {
    if (!propData) {
      loadData();
    }
  }, [propData]);

  const loadData = async () => {
    try {
      const stats = await getRevenueChartData();
      setData(stats);
    } catch (error) {
      console.error('Error loading revenue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Receita dos Últimos 30 Dias
          </h3>
        }
      >
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminCard>
    );
  }
  if (data.length === 0) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Receita dos Últimos 30 Dias
          </h3>
        }
      >
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            show_chart
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum dado de receita disponível
          </p>
        </div>
      </AdminCard>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <AdminCard
      header={
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Receita dos Últimos 30 Dias
          </h3>
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Total: {formatCurrency(data.reduce((sum, d) => sum + d.revenue, 0))}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Simple bar chart */}
        <div className="flex items-end gap-1 h-48">
          {data.map((item, index) => {
            const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${formatDate(item.date)}: ${formatCurrency(item.revenue)} (${item.payments} pagamentos)`}
              >
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full bg-primary hover:bg-primary/80 transition-all rounded-t"
                    style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                  />
                </div>
                {index % 5 === 0 && (
                  <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    {formatDate(item.date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-between text-sm text-text-light-secondary dark:text-text-dark-secondary pt-4 border-t border-border-light dark:border-border-dark">
          <div>
            <span className="material-symbols-outlined text-base align-middle mr-1">
              payments
            </span>
            {data.reduce((sum, d) => sum + d.payments, 0)} pagamentos
          </div>
          <div>
            Média: {formatCurrency(data.reduce((sum, d) => sum + d.revenue, 0) / data.length)}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
