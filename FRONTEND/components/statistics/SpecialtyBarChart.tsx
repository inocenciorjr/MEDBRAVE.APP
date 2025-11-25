'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SpecialtyData {
  name: string;
  accuracy: number;
  questions: number;
  averageAccuracy?: number;
}

interface SpecialtyBarChartProps {
  data: SpecialtyData[];
  showComparison?: boolean;
  loading?: boolean;
}

export function SpecialtyBarChart({
  data,
  showComparison = false,
  loading = false,
}: SpecialtyBarChartProps) {
  const [showGlobalAverage, setShowGlobalAverage] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('year');
  const [filteredData, setFilteredData] = useState<SpecialtyData[]>(data);
  const [globalData, setGlobalData] = useState<Array<{ filterId: string; filterName: string; averageAccuracy: number }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Atualizar dados filtrados quando data ou período mudar
  useEffect(() => {
    if (timePeriod === 'year') {
      // Ano = todos os dados (padrão)
      setFilteredData(data);
    } else {
      // Buscar dados filtrados por período
      loadFilteredData();
    }
  }, [data, timePeriod]);

  // Buscar dados globais quando ativar comparação
  useEffect(() => {
    if (showGlobalAverage && showComparison) {
      loadGlobalData();
    }
  }, [showGlobalAverage, timePeriod, showComparison]);

  const loadFilteredData = async () => {
    try {
      setLoadingData(true);
      const { statisticsService } = await import('@/services/statisticsService');
      
      // Calcular datas baseado no período
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (timePeriod === 'week') {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (timePeriod === 'month') {
        endDate = new Date();
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      }
      // year = sem filtro de data
      
      const period = timePeriod === 'week' ? 'week' : 'month';
      const data = await statisticsService.getUserQuestionsBySpecialty(period, startDate, endDate);
      
      // Formatar dados (aceita tanto snake_case quanto camelCase)
      const formatted = data
        .filter((item: any) => item.filterName || item.filter_name) // Remover itens sem nome
        .map((item: any) => ({
          name: (item.filter_name || item.filterName).replace(/([A-Z])/g, ' $1').trim(),
          accuracy: item.accuracy,
          questions: item.count,
        }));
      
      setFilteredData(formatted);
    } catch (error) {
      console.error('Erro ao carregar dados filtrados de especialidades:', error);
      setFilteredData(data); // Fallback para dados originais
    } finally {
      setLoadingData(false);
    }
  };

  const loadGlobalData = async () => {
    try {
      setLoadingGlobal(true);
      const { statisticsService } = await import('@/services/statisticsService');
      
      // Calcular datas baseado no período selecionado
      let startDate: Date;
      const endDate = new Date();
      
      if (timePeriod === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (timePeriod === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // year
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      const data = await statisticsService.getGlobalAccuracyBySpecialty(startDate, endDate);
      setGlobalData(data);
    } catch (error) {
      console.error('Erro ao carregar dados globais de especialidades:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Mesclar dados filtrados do usuário com dados globais
  const mergedData = filteredData.map(item => {
    const global = globalData.find(g => g.filterName === item.name);
    return {
      ...item,
      averageAccuracy: global?.averageAccuracy || 0,
    };
  });

  if (loading || loadingData) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-80 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
          Desempenho por Especialidade
        </h3>
        <div className="flex flex-col items-center justify-center h-80 text-center">
          <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4 opacity-50">
            medical_services
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-2">
            Nenhuma especialidade encontrada
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Clique em <span className="font-semibold text-primary">"Recalcular"</span> no topo da página
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const correctAnswers = Math.round((data.accuracy / 100) * data.questions);
      
      return (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {data.name}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary"></div>
              <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                Você: <span className="font-bold">{data.accuracy.toFixed(1)}%</span>
              </p>
            </div>
            {showGlobalAverage && data.averageAccuracy > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-text-light-secondary dark:bg-text-dark-secondary opacity-60"></div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Média Global: <span className="font-semibold">{data.averageAccuracy.toFixed(1)}%</span>
                </p>
              </div>
            )}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 pt-2 border-t border-border-light dark:border-border-dark space-y-1">
            <p>{correctAnswers} acertos de {data.questions} questões</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl h-full flex flex-col">
      {/* Header - Altura fixa */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              Desempenho por Especialidade
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Acurácia em cada área médica
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timePeriod === period
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                  title={`Mostrar dados ${period === 'week' ? 'da última semana' : period === 'month' ? 'do último mês' : 'do último ano'}`}
                >
                  {period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>

            {/* Toggle Comparação */}
            {showComparison && (
              <button
                onClick={() => setShowGlobalAverage(!showGlobalAverage)}
                disabled={loadingGlobal}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  showGlobalAverage
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-border-light/80 dark:hover:bg-border-dark/80'
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${loadingGlobal ? 'animate-spin' : ''}`}>
                  {loadingGlobal ? 'refresh' : showGlobalAverage ? 'visibility' : 'visibility_off'}
                </span>
                Comparar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico - Flex grow para ocupar espaço restante */}
      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mergedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} fill="#8b5cf6" animationDuration={800} />
            {showGlobalAverage && (
              <Bar
                dataKey="averageAccuracy"
                fill="#9ca3af"
                opacity={0.6}
                radius={[8, 8, 0, 0]}
                animationDuration={800}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

