import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Brain,
  Calendar,
  Zap,
  BarChart3
} from 'lucide-react';

export default function PlannerStats({ userId, events }) {
  const [stats, setStats] = useState({
    today: { total: 0, completed: 0, pending: 0 },
    week: { total: 0, completed: 0, pending: 0 },
    month: { total: 0, completed: 0, pending: 0 },
    byType: {},
    streak: 0,
    avgCompletion: 0,
    loading: true
  });

  useEffect(() => {
    if (!events || events.length === 0) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // Filtrar tarefas por período
    const todayTasks = events.filter(e => e.start?.slice(0, 10) === today).map(e => e.extendedProps);
    const weekTasks = events.filter(e => e.start?.slice(0, 10) >= weekStart).map(e => e.extendedProps);
    const monthTasks = events.filter(e => e.start?.slice(0, 10) >= monthStart).map(e => e.extendedProps);

    // Calcular estatísticas por tipo
    const byType = {};
    events.forEach(event => {
      const task = event.extendedProps;
      if (!byType[task.type]) {
        byType[task.type] = { total: 0, completed: 0 };
      }
      byType[task.type].total++;
      if (task.status === 'COMPLETED') {
        byType[task.type].completed++;
      }
    });

    // Calcular streak (dias consecutivos com tarefas concluídas)
    let streak = 0;
    const checkDate = new Date();
    while (streak < 30) { // Máximo 30 dias
      const dateStr = checkDate.toISOString().slice(0, 10);
      const dayTasks = events.filter(e => e.start?.slice(0, 10) === dateStr).map(e => e.extendedProps);
      const hasCompletedTasks = dayTasks.some(task => task.status === 'COMPLETED');
      
      if (hasCompletedTasks) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calcular média de conclusão dos últimos 7 dias
    let totalDays = 0;
    let completedDays = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().slice(0, 10);
      const dayTasks = events.filter(e => e.start?.slice(0, 10) === dateStr).map(e => e.extendedProps);
      
      if (dayTasks.length > 0) {
        totalDays++;
        const completedCount = dayTasks.filter(task => task.status === 'COMPLETED').length;
        if (completedCount > 0) completedDays++;
      }
    }

    const avgCompletion = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    setStats({
      today: {
        total: todayTasks.length,
        completed: todayTasks.filter(t => t.status === 'COMPLETED').length,
        pending: todayTasks.filter(t => t.status === 'PENDING').length
      },
      week: {
        total: weekTasks.length,
        completed: weekTasks.filter(t => t.status === 'COMPLETED').length,
        pending: weekTasks.filter(t => t.status === 'PENDING').length
      },
      month: {
        total: monthTasks.length,
        completed: monthTasks.filter(t => t.status === 'COMPLETED').length,
        pending: monthTasks.filter(t => t.status === 'PENDING').length
      },
      byType,
      streak,
      avgCompletion,
      loading: false
    });
  }, [events]);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const todayCompletionRate = stats.today.total > 0 ? Math.round((stats.today.completed / stats.today.total) * 100) : 0;
  const weekCompletionRate = stats.week.total > 0 ? Math.round((stats.week.completed / stats.week.total) * 100) : 0;
  const monthCompletionRate = stats.month.total > 0 ? Math.round((stats.month.completed / stats.month.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hoje */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{stats.today.completed}</p>
                  <p className="text-sm text-muted-foreground">/ {stats.today.total}</p>
                </div>
                <Progress value={todayCompletionRate} className="mt-2" />
              </div>
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {todayCompletionRate}% concluído
            </p>
          </CardContent>
        </Card>

        {/* Esta Semana */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{stats.week.completed}</p>
                  <p className="text-sm text-muted-foreground">/ {stats.week.total}</p>
                </div>
                <Progress value={weekCompletionRate} className="mt-2" />
              </div>
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {weekCompletionRate}% concluído
            </p>
          </CardContent>
        </Card>

        {/* Sequência */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sequência</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{stats.streak}</p>
                  <p className="text-sm text-muted-foreground">dias</p>
                </div>
                <div className="flex items-center mt-2">
                  {stats.streak > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Em chamas!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Comece hoje!
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Média Semanal */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média (7 dias)</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{stats.avgCompletion}%</p>
                </div>
                <div className="flex items-center mt-2">
                  {stats.avgCompletion >= 80 ? (
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Excelente
                    </Badge>
                  ) : stats.avgCompletion >= 60 ? (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Bom
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Melhorar
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Desempenho por Tipo de Atividade</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.byType).map(([type, data]) => {
              const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              const typeLabels = {
                'FSRS_REVIEW': { label: 'Revisões FSRS', icon: Brain, color: 'purple' },
                'RECOMMENDATION': { label: 'Recomendações', icon: Target, color: 'blue' },
                'SIMULADO': { label: 'Simulados', icon: BookOpen, color: 'orange' },
                'MANUAL': { label: 'Tarefas Manuais', icon: CheckCircle, color: 'green' }
              };
              
              const typeInfo = typeLabels[type] || { label: type, icon: Clock, color: 'gray' };
              const Icon = typeInfo.icon;
              
              return (
                <div key={type} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className={`h-4 w-4 text-${typeInfo.color}-600`} />
                    <span className="text-sm font-medium">{typeInfo.label}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Concluídas:</span>
                      <span className="font-medium">{data.completed}/{data.total}</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {completionRate}% de conclusão
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}