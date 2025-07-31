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
  Lightbulb,
  Award,
  Activity
} from 'lucide-react';

export default function StudyInsights({ userId, events, detailed = false }) {
  const [insights, setInsights] = useState({
    productivity: { score: 0, trend: 'neutral', message: '' },
    consistency: { score: 0, trend: 'neutral', message: '' },
    recommendations: [],
    achievements: [],
    weeklyPattern: {},
    loading: true
  });

  useEffect(() => {
    if (!events || events.length === 0) {
      setInsights(prev => ({ ...prev, loading: false }));
      return;
    }

    // Analisar produtividade (últimos 7 dias vs 7 dias anteriores)
    const now = new Date();
    const last7Days = [];
    const previous7Days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().slice(0, 10));
      
      const prevDate = new Date(now);
      prevDate.setDate(prevDate.getDate() - (i + 7));
      previous7Days.push(prevDate.toISOString().slice(0, 10));
    }

    const recentTasks = events.filter(e => last7Days.includes(e.start?.slice(0, 10))).map(e => e.extendedProps);
    const previousTasks = events.filter(e => previous7Days.includes(e.start?.slice(0, 10))).map(e => e.extendedProps);
    
    const recentCompleted = recentTasks.filter(t => t.status === 'COMPLETED').length;
    const previousCompleted = previousTasks.filter(t => t.status === 'COMPLETED').length;
    
    const productivityScore = recentTasks.length > 0 ? Math.round((recentCompleted / recentTasks.length) * 100) : 0;
    const productivityTrend = recentCompleted > previousCompleted ? 'up' : 
                             recentCompleted < previousCompleted ? 'down' : 'neutral';
    
    // Analisar consistência (quantos dias da semana teve atividade)
    const activeDays = last7Days.filter(date => {
      return events.some(e => e.start?.slice(0, 10) === date && e.extendedProps.status === 'COMPLETED');
    }).length;
    
    const consistencyScore = Math.round((activeDays / 7) * 100);
    const consistencyTrend = activeDays >= 5 ? 'up' : activeDays >= 3 ? 'neutral' : 'down';

    // Padrão semanal
    const weeklyPattern = {};
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    dayNames.forEach((day, index) => {
      const dayTasks = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.getDay() === index;
      }).map(e => e.extendedProps);
      
      const completed = dayTasks.filter(t => t.status === 'COMPLETED').length;
      weeklyPattern[day] = {
        total: dayTasks.length,
        completed,
        rate: dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0
      };
    });

    // Gerar recomendações
    const recommendations = [];
    
    if (consistencyScore < 50) {
      recommendations.push({
        type: 'consistency',
        icon: Calendar,
        title: 'Melhore a Consistência',
        message: 'Tente estudar pelo menos 5 dias por semana para melhores resultados.',
        priority: 'high'
      });
    }
    
    if (productivityScore < 60) {
      recommendations.push({
        type: 'productivity',
        icon: Target,
        title: 'Aumente a Produtividade',
        message: 'Considere revisar suas metas diárias e focar em tarefas menores.',
        priority: 'medium'
      });
    }
    
    // Encontrar melhor dia da semana
    const bestDay = Object.entries(weeklyPattern)
      .sort(([,a], [,b]) => b.rate - a.rate)[0];
    
    if (bestDay && bestDay[1].rate > 80) {
      recommendations.push({
        type: 'pattern',
        icon: TrendingUp,
        title: 'Aproveite seu Melhor Dia',
        message: `${bestDay[0]} é seu dia mais produtivo (${bestDay[1].rate}%). Considere agendar tarefas importantes neste dia.`,
        priority: 'low'
      });
    }

    // Gerar conquistas
    const achievements = [];
    
    if (activeDays >= 7) {
      achievements.push({
        icon: Award,
        title: 'Semana Perfeita!',
        description: 'Você estudou todos os dias desta semana.',
        color: 'gold'
      });
    } else if (activeDays >= 5) {
      achievements.push({
        icon: CheckCircle,
        title: 'Consistência Excelente',
        description: `Você estudou ${activeDays} dias nesta semana.`,
        color: 'green'
      });
    }
    
    if (productivityScore >= 90) {
      achievements.push({
        icon: Target,
        title: 'Alta Performance',
        description: `${productivityScore}% de conclusão das tarefas.`,
        color: 'blue'
      });
    }

    setInsights({
      productivity: {
        score: productivityScore,
        trend: productivityTrend,
        message: productivityTrend === 'up' ? 'Melhorando!' : 
                productivityTrend === 'down' ? 'Em declínio' : 'Estável'
      },
      consistency: {
        score: consistencyScore,
        trend: consistencyTrend,
        message: consistencyTrend === 'up' ? 'Muito consistente!' : 
                consistencyTrend === 'down' ? 'Precisa melhorar' : 'Razoável'
      },
      recommendations,
      achievements,
      weeklyPattern,
      loading: false
    });
  }, [events]);

  if (insights.loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (detailed) {
    return (
      <div className="space-y-6">
        {/* Métricas de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Produtividade</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{insights.productivity.score}%</span>
                  <Badge variant={insights.productivity.trend === 'up' ? 'default' : 
                                insights.productivity.trend === 'down' ? 'destructive' : 'secondary'}>
                    {insights.productivity.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {insights.productivity.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {insights.productivity.message}
                  </Badge>
                </div>
                <Progress value={insights.productivity.score} />
                <p className="text-sm text-muted-foreground">
                  Taxa de conclusão das tarefas nos últimos 7 dias
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Consistência</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{insights.consistency.score}%</span>
                  <Badge variant={insights.consistency.trend === 'up' ? 'default' : 
                                insights.consistency.trend === 'down' ? 'destructive' : 'secondary'}>
                    {insights.consistency.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {insights.consistency.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {insights.consistency.message}
                  </Badge>
                </div>
                <Progress value={insights.consistency.score} />
                <p className="text-sm text-muted-foreground">
                  Frequência de estudos na semana
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Padrão Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Padrão Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(insights.weeklyPattern).map(([day, data]) => (
                <div key={day} className="text-center p-3 border rounded-lg">
                  <div className="text-xs font-medium mb-2">{day.slice(0, 3)}</div>
                  <div className="text-lg font-bold mb-1">{data.rate}%</div>
                  <div className="text-xs text-muted-foreground">
                    {data.completed}/{data.total}
                  </div>
                  <Progress value={data.rate} className="mt-2 h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conquistas */}
        {insights.achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Conquistas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.achievements.map((achievement, index) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <Icon className={`h-6 w-6 text-${achievement.color}-600`} />
                      <div>
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recomendações */}
        {insights.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Recomendações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.recommendations.map((rec, index) => {
                  const Icon = rec.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 
                                        rec.priority === 'medium' ? 'default' : 'secondary'} 
                                 className="text-xs">
                            {rec.priority === 'high' ? 'Alta' : 
                             rec.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Versão compacta para sidebar
  return (
    <div className="space-y-4">
      {/* Performance Rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Produtividade:</span>
              <span className="font-medium">{insights.productivity.score}%</span>
            </div>
            <Progress value={insights.productivity.score} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Consistência:</span>
              <span className="font-medium">{insights.consistency.score}%</span>
            </div>
            <Progress value={insights.consistency.score} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Conquistas Recentes */}
      {insights.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Conquistas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.achievements.slice(0, 2).map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Icon className={`h-4 w-4 text-${achievement.color}-600`} />
                    <span className="font-medium">{achievement.title}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendação Principal */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Dica</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{insights.recommendations[0].title}</h4>
              <p className="text-xs text-muted-foreground">{insights.recommendations[0].message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}