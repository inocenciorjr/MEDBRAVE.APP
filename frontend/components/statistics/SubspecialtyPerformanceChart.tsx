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
  Legend,
} from 'recharts';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';

interface SubspecialtyData {
  name: string;
  accuracy: number;
  questions: number;
  average?: number;
}

interface SubspecialtyPerformanceChartProps {
  data: SubspecialtyData[];
  showComparison?: boolean;
  loading?: boolean;
}

export function SubspecialtyPerformanceChart({
  data,
  showComparison = false,
  loading = false,
}: SubspecialtyPerformanceChartProps) {
  const [showGlobalAverage, setShowGlobalAverage] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('year');
  const [selectedSubspecialties, setSelectedSubspecialties] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<SubspecialtyData[]>(data);
  const [globalData, setGlobalData] = useState<Array<{ subFilterId: string; subspecialtyName: string; averageAccuracy: number }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Buscar dados sempre (não usa dados pré-calculados)
  useEffect(() => {
    // Limpar seleção ao mudar período
    setSelectedSubspecialties([]);
    loadFilteredData();
  }, [timePeriod]);

  // Não selecionar nada por padrão - usuário escolhe manualmente

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
      console.log('[SubspecialtyChart] Buscando dados:', { period, startDate, endDate });
      
      const data = await statisticsService.getUserQuestionsBySubspecialty(period, startDate, endDate);
      
      const formatted = data
        .map((item: any) => ({
          name: item.subspecialty_name || item.subspecialtyName,
          accuracy: item.accuracy,
          questions: item.count,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      
      setFilteredData(formatted);
    } catch (error) {
      console.error('Erro ao carregar dados filtrados de subespecialidades:', error);
      setFilteredData([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadGlobalData = async () => {
    try {
      setLoadingGlobal(true);
      const { statisticsService } = await import('@/services/statisticsService');
      
      let startDate: Date;
      const endDate = new Date();
      
      if (timePeriod === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (timePeriod === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      const data = await statisticsService.getGlobalAccuracyBySubspecialty(startDate, endDate);
      // Transformar para o formato esperado
      const transformed = data.map((item: any) => ({
        subFilterId: item.sub_filter_id || item.subFilterId,
        subspecialtyName: item.subspecialty_name || item.subspecialtyName,
        averageAccuracy: item.average_accuracy || item.averageAccuracy,
      }));
      setGlobalData(transformed);
    } catch (error) {
      console.error('Erro ao carregar dados globais de subespecialidades:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const availableSubspecialties = filteredData;

  const mergedData = selectedSubspecialties
    .map(subName => {
      const userStats = filteredData.find(d => d.name === subName);
      const global = globalData.find(g => g.subspecialtyName === subName);
      
      return {
        name: subName,
        accuracy: userStats?.accuracy || 0,
        questions: userStats?.questions || 0,
        average: global?.averageAccuracy || 0,
      };
    })
    .filter(d => d.questions > 0); // Só remover se não tiver questões

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
            {showGlobalAverage && data.average > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Média Global: <span className="font-semibold">{data.average.toFixed(1)}%</span>
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

  if (loading || loadingData) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-64 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  if (!loadingData && filteredData.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Desempenho por Subespecialidade
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
            Acurácia em áreas específicas
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
            medical_services
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-2">
            Nenhuma subespecialidade encontrada para o período selecionado
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Tente selecionar um período maior ou responda mais questões
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              Desempenho por Subespecialidade
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Acurácia em áreas específicas
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
                  title={`Filtrar por ${period === 'week' ? 'última semana' : period === 'month' ? 'último mês' : 'todos os dados'}`}
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

        {/* Filtro de Subespecialidades */}
        {availableSubspecialties.length > 0 && (
          <MultiSelectDropdown
            label="Subespecialidades"
            options={availableSubspecialties.map(s => s.name).filter(Boolean)}
            selectedValues={selectedSubspecialties}
            onChange={setSelectedSubspecialties}
            maxSelections={5}
            placeholder="Selecione até 5 subespecialidades"
            fullWidth
          />
        )}
      </div>

      {/* Gráfico */}
      <div className="h-[400px] w-full">
        {selectedSubspecialties.length === 0 || mergedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              {selectedSubspecialties.length === 0 ? 'touch_app' : 'bar_chart'}
            </span>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              {selectedSubspecialties.length === 0 
                ? 'Selecione subespecialidades acima para visualizar o gráfico'
                : 'Nenhum dado disponível para as subespecialidades selecionadas'}
            </p>
          </div>
        ) : (
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
              <Legend />
              <Bar
                dataKey="accuracy"
                name="Sua Média"
                radius={[8, 8, 0, 0]}
                fill="#8b5cf6"
                animationDuration={800}
              />
              {showGlobalAverage && (
                <Bar
                  dataKey="average"
                  name="Média Global"
                  radius={[8, 8, 0, 0]}
                  fill="#3b82f6"
                  opacity={0.8}
                  animationDuration={800}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
