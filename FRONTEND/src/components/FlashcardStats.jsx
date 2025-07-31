import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Award, Activity, Calendar, Users, RefreshCw, BookOpen, Zap, CheckCircle } from 'lucide-react';
import { CustomStatsIcon } from './CustomIcons';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import FSRSChip from './FSRSChip';

// ✅ COMPONENTE DE LOADING PARA STATS
const StatsLoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="dashboard-card">
      <div className="card-header flex items-center gap-2 mb-6">
        <Skeleton className="h-6 w-6 rounded-lg" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
    
    <div className="dashboard-card">
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// ✅ COMPONENTE DE CARD DE ESTATÍSTICA
const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', trend = null }) => (
  <div className="dashboard-card">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
          backgroundColor: 'var(--bg-interactive)'
        }}>
          <Icon className="w-5 h-5" style={{
            color: color === 'red' ? 'var(--error)' : 'var(--accent)'
          }} />
        </div>
        <div>
          <h4 className="font-semibold text-lg" style={{color: 'var(--text-primary)'}}>
            {value}
          </h4>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
            {title}
          </p>
        </div>
      </div>
      {trend !== null && (
        <div className="text-xs px-2 py-1 rounded-full" style={{
          backgroundColor: 'var(--bg-interactive)',
          color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--error)' : 'var(--text-muted)'
        }}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
    {subtitle && (
      <p className="text-xs" style={{color: 'var(--text-muted)'}}>
        {subtitle}
      </p>
    )}
  </div>
);

const FlashcardStats = ({ stats, loading, onRefresh }) => {
  // ✅ ESTADO DE LOADING
  if (loading) {
    return <StatsLoadingSkeleton />;
  }

  // ✅ CALCULAR PROGRESSO
  const progressPercentage = stats.totalCards > 0 
    ? Math.round(((stats.totalCards - stats.dueCards) / stats.totalCards) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ✅ CARD PRINCIPAL DE ESTATÍSTICAS */}
      <div className="dashboard-card">
        <div className="card-header flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--bg-interactive)'}}>
              <CustomStatsIcon className="w-3 h-3" style={{color: 'var(--accent)'}} />
            </div>
            <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              Estatísticas
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="w-8 h-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Estatísticas principais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                  Total de Decks
                </span>
              </div>
              <Badge variant="outline" className="font-semibold">
                {stats.totalDecks}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                  Total de Cards
                </span>
              </div>
              <Badge variant="outline" className="font-semibold">
                {stats.totalCards}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                  Para Revisar
                </span>
              </div>
              <Badge 
                variant={stats.dueCards > 0 ? "destructive" : "secondary"}
                className="font-semibold"
              >
                {stats.dueCards}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                  Estudadas Hoje
                </span>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {stats.studiedToday}
              </Badge>
            </div>
          </div>

          {/* Progresso geral */}
          {stats.totalCards > 0 && (
            <>
              <div className="pt-4" style={{borderTop: '1px solid var(--border)'}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                    Progresso Geral
                  </span>
                  <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {progressPercentage}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs mt-2" style={{color: 'var(--text-muted)'}}>
                  {stats.totalCards - stats.dueCards} de {stats.totalCards} cards revisados
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ CARDS DE ESTATÍSTICAS INDIVIDUAIS */}
      <StatCard
        icon={BookOpen}
        title="Decks Ativos"
        value={stats.totalDecks}
        subtitle="Decks criados por você"
        color="blue"
      />

      <StatCard
        icon={Clock}
        title="Revisões Pendentes"
        value={stats.dueCards}
        subtitle={stats.dueCards > 0 ? "Cards aguardando revisão" : "Tudo em dia!"}
        color={stats.dueCards > 0 ? "red" : "green"}
      />

      <StatCard
        icon={Target}
        title="Meta Diária"
        value={`${stats.studiedToday}/20`}
        subtitle="Cards estudados hoje"
        color="purple"
        trend={stats.studiedToday > 10 ? 15 : stats.studiedToday > 5 ? 5 : -5}
      />

      {/* ✅ CHIPS FSRS */}
      <div className="dashboard-card">
        <div className="card-header flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
          <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>
            Status FSRS
          </h4>
        </div>
        
        <div className="space-y-3">
          <FSRSChip
            filter={{
              label: `Novos: ${Math.max(0, stats.totalCards - stats.dueCards)}`,
              icon: Zap,
              color: "blue"
            }}
          />
          
          <FSRSChip
            filter={{
              label: `Para Revisar: ${stats.dueCards}`,
              icon: Clock,
              color: stats.dueCards > 0 ? "red" : "green"
            }}
          />
          
          <FSRSChip
            filter={{
              label: `Estudados: ${stats.studiedToday}`,
              icon: Target,
              color: "purple"
            }}
          />
        </div>
      </div>

      {/* ✅ AÇÕES RÁPIDAS */}
      <div className="dashboard-card">
        <div className="card-header flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
          <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>
            Ações Rápidas
          </h4>
        </div>
        
        <div className="space-y-2">
          {stats.dueCards > 0 && (
            <Button
              className="w-full justify-start"
              variant="outline"
              size="sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              Revisar {stats.dueCards} cards
            </Button>
          )}
          
          <Button
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Ver cronograma
          </Button>
          
          <Button
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Relatório detalhado
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardStats; 