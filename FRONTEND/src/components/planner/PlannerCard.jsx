import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Calendar, 
  Plus, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Brain,
  BookOpen,
  Sparkles
} from 'lucide-react';
import plannerApi from '../../services/plannerApi';
import { toast } from 'sonner';

export default function PlannerCard({ userId, onNavigateToPlanner }) {
  const [stats, setStats] = useState({
    tasksToday: 0,
    completedToday: 0,
    pendingToday: 0,
    weeklyProgress: 0,
    loading: false, // ✅ OTIMIZAÇÃO: Não carregar automaticamente
    loaded: false   // ✅ OTIMIZAÇÃO: Controlar se já foi carregado
  });

  // ✅ OTIMIZAÇÃO: Função para carregar dados sob demanda
  const loadStats = async () => {
    if (!userId || stats.loaded) {
      return;
    }

    setStats(prev => ({ ...prev, loading: true }));

    try {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = await plannerApi.getTasks(userId, today, today);
      
      const tasksToday = tasks.length;
      const completedToday = tasks.filter(task => task.status === 'COMPLETED').length;
      const pendingToday = tasksToday - completedToday;
      const weeklyProgress = tasksToday > 0 ? Math.round((completedToday / tasksToday) * 100) : 0;
      
      setStats({ tasksToday, completedToday, pendingToday, weeklyProgress, loading: false, loaded: true });
    } catch (error) {
      console.error('Erro ao carregar estatísticas do planner:', error);
      setStats({ tasksToday: 0, completedToday: 0, pendingToday: 0, weeklyProgress: 0, loading: false, loaded: true });
    }
  };

  // ✅ OTIMIZAÇÃO: Remover useEffect automático
  // useEffect(() => {
  //   loadStats();
  // }, [userId]);

  if (stats.loading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-xl"></div>
        <Card className="relative border-0 shadow-2xl bg-card/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="relative p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-accent p-6">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm animate-pulse">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-bold text-xl">Planner de Estudos</CardTitle>
                    <p className="text-white/80 text-sm font-medium">Carregando...</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  disabled
                  className="text-white hover:bg-white/20 opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center p-4 rounded-2xl bg-muted/20 animate-pulse">
                  <div className="h-8 w-8 bg-muted-foreground/20 rounded-full mx-auto mb-2"></div>
                  <div className="h-6 w-8 bg-muted-foreground/20 rounded mx-auto mb-1"></div>
                  <div className="h-3 w-12 bg-muted-foreground/10 rounded mx-auto"></div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="h-4 bg-muted-foreground/10 rounded animate-pulse"></div>
              <div className="h-2 bg-muted-foreground/10 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-xl transition-all duration-300 group-hover:blur-2xl"></div>
      
      <Card className="relative border-0 shadow-2xl bg-card/95 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
        {/* Header com gradiente premium */}
        <CardHeader className="relative p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
            
            {/* Efeito de brilho animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%]" />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-xl blur-md"></div>
                  <div className="relative p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                    <Calendar className="h-6 w-6 text-white drop-shadow-sm" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-white font-bold text-xl drop-shadow-sm">
                    Planner de Estudos
                  </CardTitle>
                  <p className="text-white/90 text-sm font-medium drop-shadow-sm">
                    Organize seus estudos hoje
                  </p>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onNavigateToPlanner}
                className="text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm hover:scale-105 transition-all duration-200"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Estatísticas do dia com design premium */}
          <div className="grid grid-cols-3 gap-4">
            <div className="group/stat text-center p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-300 border border-primary/10 hover:border-primary/20">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover/stat:blur-lg transition-all duration-300"></div>
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary mb-1 group-hover/stat:scale-110 transition-transform duration-200">
                {stats.tasksToday}
              </div>
              <div className="text-xs text-primary/70 uppercase tracking-wider font-semibold">Total</div>
            </div>

            <div className="group/stat text-center p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 hover:from-emerald-500/10 hover:to-emerald-500/15 transition-all duration-300 border border-emerald-500/10 hover:border-emerald-500/20">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md group-hover/stat:blur-lg transition-all duration-300"></div>
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 border border-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1 group-hover/stat:scale-110 transition-transform duration-200">
                {stats.completedToday}
              </div>
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider font-semibold">Concluídas</div>
            </div>

            <div className="group/stat text-center p-5 rounded-2xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 hover:from-amber-500/10 hover:to-amber-500/15 transition-all duration-300 border border-amber-500/10 hover:border-amber-500/20">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-md group-hover/stat:blur-lg transition-all duration-300"></div>
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/20 border border-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1 group-hover/stat:scale-110 transition-transform duration-200">
                {stats.pendingToday}
              </div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider font-semibold">Pendentes</div>
            </div>
          </div>

          {/* Progress bar premium */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Progresso do Dia</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-primary">{stats.weeklyProgress}%</span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
            
            <div className="relative">
              <div className="h-3 bg-gradient-to-r from-muted via-muted to-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${stats.weeklyProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Ação rápida premium */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Continue seu progresso</span>
            </div>
            
            <Button 
              size="sm"
              onClick={onNavigateToPlanner}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>

          {/* Insight motivacional */}
          {stats.weeklyProgress > 0 && (
            <div className="text-center p-4 rounded-xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">
                {stats.weeklyProgress >= 80 ? '🎉 Excelente progresso!' : 
                 stats.weeklyProgress >= 50 ? '💪 Você está indo bem!' : 
                 '🚀 Vamos continuar!'}
              </p>
              <p className="text-xs text-primary font-medium">
                {stats.completedToday > 0 ? `${stats.completedToday} tarefa${stats.completedToday > 1 ? 's' : ''} concluída${stats.completedToday > 1 ? 's' : ''} hoje` : 'Comece sua primeira tarefa!'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

