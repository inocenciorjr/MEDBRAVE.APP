import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export default function WeeklyOverview({ userId, events }) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekData, setWeekData] = useState({
    days: [],
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    loading: true
  });

  useEffect(() => {
    if (!events || events.length === 0) {
      setWeekData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Calcular início e fim da semana
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Gerar dados para cada dia da semana
    const days = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    let totalTasks = 0;
    let completedTasks = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Filtrar tarefas do dia
      const dayTasks = events
        .filter(e => e.start?.slice(0, 10) === dateStr)
        .map(e => e.extendedProps);
      
      const dayCompleted = dayTasks.filter(t => t.status === 'COMPLETED').length;
      const dayPending = dayTasks.filter(t => t.status === 'PENDING').length;
      
      totalTasks += dayTasks.length;
      completedTasks += dayCompleted;
      
      // Calcular tipos de tarefas
      const taskTypes = {
        FSRS_REVIEW: dayTasks.filter(t => t.type === 'FSRS_REVIEW').length,
        RECOMMENDATION: dayTasks.filter(t => t.type === 'RECOMMENDATION').length,
        SIMULADO: dayTasks.filter(t => t.type === 'SIMULADO').length,
        MANUAL: dayTasks.filter(t => t.type === 'MANUAL').length
      };
      
      days.push({
        date,
        dateStr,
        dayName: dayNames[i],
        isToday: dateStr === new Date().toISOString().slice(0, 10),
        isPast: date < new Date().setHours(0, 0, 0, 0),
        total: dayTasks.length,
        completed: dayCompleted,
        pending: dayPending,
        completionRate: dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0,
        taskTypes,
        tasks: dayTasks
      });
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    setWeekData({
      days,
      totalTasks,
      completedTasks,
      completionRate,
      loading: false
    });
  }, [events, currentWeek]);

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  if (weekData.loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const formatWeekRange = () => {
    const start = weekData.days[0]?.date;
    const end = weekData.days[6]?.date;
    
    if (!start || !end) return '';
    
    const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Visão Semanal</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatWeekRange()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Resumo da semana */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{weekData.totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total de Tarefas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{weekData.completedTasks}</div>
            <div className="text-sm text-muted-foreground">Concluídas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{weekData.completionRate}%</div>
            <div className="text-sm text-muted-foreground">Taxa de Conclusão</div>
          </div>
        </div>

        {/* Progresso geral da semana */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso da Semana</span>
            <span className="font-medium">{weekData.completedTasks}/{weekData.totalTasks}</span>
          </div>
          <Progress value={weekData.completionRate} className="h-3" />
        </div>

        {/* Grid dos dias */}
        <div className="grid grid-cols-7 gap-2">
          {weekData.days.map((day, index) => {
            const maxTasks = Math.max(...weekData.days.map(d => d.total));
            const heightPercentage = maxTasks > 0 ? (day.total / maxTasks) * 100 : 0;
            
            return (
              <div key={index} className="text-center">
                {/* Nome do dia */}
                <div className={`text-xs font-medium mb-2 ${
                  day.isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                  {day.dayName}
                </div>
                
                {/* Data */}
                <div className={`text-xs mb-2 ${
                  day.isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                  {day.date.getDate()}
                </div>
                
                {/* Barra de progresso visual */}
                <div className="relative h-20 bg-muted/30 rounded-lg mb-2 flex flex-col justify-end overflow-hidden">
                  {day.total > 0 && (
                    <>
                      {/* Barra de tarefas concluídas */}
                      <div 
                        className="bg-green-500 transition-all duration-300"
                        style={{ 
                          height: `${(day.completed / day.total) * heightPercentage}%`,
                          minHeight: day.completed > 0 ? '4px' : '0'
                        }}
                      />
                      {/* Barra de tarefas pendentes */}
                      <div 
                        className="bg-orange-300 transition-all duration-300"
                        style={{ 
                          height: `${(day.pending / day.total) * heightPercentage}%`,
                          minHeight: day.pending > 0 ? '4px' : '0'
                        }}
                      />
                    </>
                  )}
                  
                  {/* Indicador de hoje */}
                  {day.isToday && (
                    <div className="absolute top-1 left-1 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
                
                {/* Estatísticas do dia */}
                <div className="space-y-1">
                  <div className="text-xs font-medium">
                    {day.completed}/{day.total}
                  </div>
                  
                  {day.total > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {day.completionRate}%
                    </div>
                  )}
                  
                  {/* Indicadores de tipo de tarefa */}
                  <div className="flex justify-center space-x-1">
                    {day.taskTypes.FSRS_REVIEW > 0 && (
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Revisões FSRS" />
                    )}
                    {day.taskTypes.RECOMMENDATION > 0 && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Recomendações" />
                    )}
                    {day.taskTypes.SIMULADO > 0 && (
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" title="Simulados" />
                    )}
                    {day.taskTypes.MANUAL > 0 && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Tarefas Manuais" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Concluídas</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-300 rounded"></div>
            <span>Pendentes</span>
          </div>
        </div>

        {/* Insights da semana */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Melhor Dia</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {weekData.days.reduce((best, day) => 
                day.completionRate > best.completionRate ? day : best
              ).dayName}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Dias Ativos</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {weekData.days.filter(day => day.completed > 0).length}/7
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Média Diária</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(weekData.totalTasks / 7)} tarefas
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}