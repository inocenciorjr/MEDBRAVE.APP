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
import Dropdown from '@/components/ui/Dropdown';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { getStateName } from '@/lib/utils/stateNames';

interface UniversityData {
  name: string;
  accuracy: number;
  questions: number;
  average?: number;
}

interface UniversityHierarchy {
  stateAbbr: string;
  stateName: string;
  universities: UniversityData[];
}

interface UniversityPerformanceChartProps {
  data: UniversityData[];
  showComparison?: boolean;
  loading?: boolean;
}

export function UniversityPerformanceChart({
  data,
  showComparison = false,
  loading = false,
}: UniversityPerformanceChartProps) {
  const [showGlobalAverage, setShowGlobalAverage] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('year');
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<UniversityData[]>(data);
  const [globalData, setGlobalData] = useState<Array<{ subFilterId: string; universityName: string; averageAccuracy: number }>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Atualizar dados filtrados quando data ou período mudar
  useEffect(() => {
    // Limpar seleção ao mudar período
    setSelectedUniversities([]);
    
    if (timePeriod === 'year') {
      // Ano = todos os dados (padrão)
      setFilteredData(data);
    } else {
      // Buscar dados filtrados por período
      loadFilteredData();
    }
  }, [data, timePeriod]);

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
      const data = await statisticsService.getUserQuestionsByUniversity(period, startDate, endDate);
      
      // Formatar dados (aceita tanto snake_case quanto camelCase)
      const formatted = data.map((item: any) => ({
        name: item.university_name || item.universityName,
        accuracy: item.accuracy,
        questions: item.count,
      }));
      
      setFilteredData(formatted);
    } catch (error) {
      console.error('Erro ao carregar dados filtrados de universidades:', error);
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
      
      const data = await statisticsService.getGlobalAccuracyByUniversity(startDate, endDate);
      setGlobalData(data);
    } catch (error) {
      console.error('Erro ao carregar dados globais de universidades:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Todas as universidades disponíveis (filtradas)
  const availableUniversities = filteredData;

  // Mesclar dados filtrados do usuário com dados globais
  const mergedData = selectedUniversities
    .map(uniName => {
      const userStats = filteredData.find(d => d.name === uniName);
      const global = globalData.find(g => g.universityName === uniName);
      
      return {
        name: uniName,
        accuracy: userStats?.accuracy || 0,
        questions: userStats?.questions || 0,
        average: global?.averageAccuracy || 0,
      };
    })
    .filter(d => d.accuracy > 0 || d.questions > 0); // Remover vazios



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

  if (data.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Desempenho por Universidade
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
            Acurácia por banca/instituição
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
            school
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-2">
            Nenhuma universidade encontrada
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Clique em <span className="font-semibold">"Recalcular"</span> no topo da página para atualizar suas estatísticas
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl h-full flex flex-col">
      {/* Header - Altura fixa */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              Desempenho por Universidade
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Acurácia por banca/instituição
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

        {/* Filtro de Universidades */}
        <MultiSelectDropdown
          label="Universidades"
          options={availableUniversities.map(u => u.name)}
          selectedValues={selectedUniversities}
          onChange={setSelectedUniversities}
          maxSelections={5}
          placeholder="Selecione até 5 universidades"
          fullWidth
        />
      </div>

      {/* Gráfico - Flex grow para ocupar espaço restante */}
      <div className="flex-1 min-h-[400px]">
        {selectedUniversities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              touch_app
            </span>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Selecione universidades acima para visualizar o gráfico
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
