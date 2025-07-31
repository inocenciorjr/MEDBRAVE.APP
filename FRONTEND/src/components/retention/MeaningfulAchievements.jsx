import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  Brain, 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  Award,
  Flame,
  Shield,
  Crown,
  Lightbulb,
  Heart,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { formatDate } from '../../utils/dateUtils';

const MeaningfulAchievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [settings, setSettings] = useState({
    enabled: true,
    showAchievements: true,
    showChallenges: true,
    notificationLevel: 'IMPORTANT'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      // Simulando dados - em produção viria da API
      const mockAchievements = [
        {
          id: '1',
          title: 'Domínio em Cardiologia',
          description: '90% de acerto nas últimas 20 questões de Cardiologia',
          value: 'Você realmente aprendeu este tema!',
          unlockedBenefit: 'Questões de Cardiologia aparecem menos nas revisões',
          emotionalImpact: 'Confiança de que domina um tema complexo',
          category: 'MASTERY',
          achievedAt: '2025-01-10',
          progress: 100,
          rarity: 'RARE'
        },
        {
          id: '2',
          title: 'Eficiência Temporal',
          description: 'Tempo médio por questão diminuiu 30% mantendo mesma precisão',
          value: 'Você está ficando mais rápido sem perder qualidade!',
          unlockedBenefit: 'Consegue estudar mais em menos tempo',
          emotionalImpact: 'Sensação de evolução e melhoria contínua',
          category: 'EFFICIENCY',
          achievedAt: '2025-01-08',
          progress: 100,
          rarity: 'UNCOMMON'
        },
        {
          id: '3',
          title: 'Recuperação Impressionante',
          description: 'Transformou 5 questões que sempre errava em questões dominadas',
          value: 'Superou suas dificuldades!',
          unlockedBenefit: 'Conhecimento mais sólido e confiável',
          emotionalImpact: 'Prova que persistência e esforço funcionam',
          category: 'RECOVERY',
          achievedAt: '2025-01-05',
          progress: 100,
          rarity: 'EPIC'
        },
        {
          id: '4',
          title: 'Consistência Exemplar',
          description: 'Manteve 85%+ de acerto por 2 semanas consecutivas',
          value: 'Sua dedicação está dando frutos!',
          unlockedBenefit: 'Padrão de estudo otimizado',
          emotionalImpact: 'Orgulho da disciplina conquistada',
          category: 'CONSISTENCY',
          achievedAt: null,
          progress: 78,
          rarity: 'RARE'
        }
      ];

      const mockChallenges = [
        {
          id: '1',
          title: 'Resgate de Conhecimento',
          description: 'Melhore sua retenção nas 10 questões que você mais regrediu',
          why: 'Evitar que conhecimento já adquirido se perca',
          timeframe: '30 dias',
          reward: 'Confiança de que seu conhecimento é sólido',
          progress: 40,
          targetQuestions: 10,
          completedQuestions: 4,
          difficulty: 'MEDIUM',
          category: 'RETENTION'
        },
        {
          id: '2',
          title: 'Especialista em Neurologia',
          description: 'Alcance 95% de acerto em questões de Neurologia',
          why: 'Dominar completamente uma especialidade',
          timeframe: '60 dias',
          reward: 'Badge de Especialista + Redução de 50% nas revisões de Neurologia',
          progress: 67,
          targetAccuracy: 95,
          currentAccuracy: 82,
          difficulty: 'HARD',
          category: 'MASTERY'
        }
      ];

      setAchievements(mockAchievements);
      setChallenges(mockChallenges);
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'MASTERY': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'EFFICIENCY': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'RECOVERY': return <Shield className="w-5 h-5 text-green-500" />;
      case 'CONSISTENCY': return <Target className="w-5 h-5 text-purple-500" />;
      case 'RETENTION': return <Brain className="w-5 h-5 text-indigo-500" />;
      default: return <Star className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON': return 'text-gray-600 border-gray-300';
      case 'UNCOMMON': return 'text-green-600 border-green-300';
      case 'RARE': return 'text-blue-600 border-blue-300';
      case 'EPIC': return 'text-purple-600 border-purple-300';
      case 'LEGENDARY': return 'text-yellow-600 border-yellow-300';
      default: return 'text-gray-600 border-gray-300';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HARD': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Carregando conquistas...</span>
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.progress === 100);
  const inProgressAchievements = achievements.filter(a => a.progress < 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Conquistas Significativas
          </h1>
          <p className="text-muted-foreground mt-1">
            Reconhecimento baseado em aprendizado real e crescimento pessoal
          </p>
        </div>
        
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Configurações Rápidas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={settings.enabled} 
                  onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
                />
                <span className="text-sm">Sistema de conquistas ativo</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  checked={settings.showAchievements} 
                  onCheckedChange={(checked) => setSettings({...settings, showAchievements: checked})}
                />
                <span className="text-sm">Mostrar conquistas</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {unlockedAchievements.length} de {achievements.length} conquistadas
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="challenges">Desafios</TabsTrigger>
          <TabsTrigger value="impact">Impacto</TabsTrigger>
        </TabsList>

        {/* TAB: CONQUISTAS */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Conquistas Desbloqueadas */}
          {unlockedAchievements.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Conquistas Desbloqueadas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unlockedAchievements.map((achievement) => (
                  <Card key={achievement.id} className={`border-2 ${getRarityColor(achievement.rarity)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(achievement.category)}
                          <h4 className="font-bold text-lg">{achievement.title}</h4>
                        </div>
                        <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-sm font-medium text-green-800">💡 Por que isso importa:</p>
                          <p className="text-sm text-green-700">{achievement.value}</p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm font-medium text-blue-800">🎁 Benefício desbloqueado:</p>
                          <p className="text-sm text-blue-700">{achievement.unlockedBenefit}</p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <p className="text-sm font-medium text-purple-800">❤️ Significado pessoal:</p>
                          <p className="text-sm text-purple-700">{achievement.emotionalImpact}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-xs text-muted-foreground">
                        Conquistado em {formatDate(achievement.achievedAt)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Conquistas em Progresso */}
          {inProgressAchievements.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Em Progresso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressAchievements.map((achievement) => (
                  <Card key={achievement.id} className="border-dashed">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(achievement.category)}
                          <h4 className="font-bold text-lg">{achievement.title}</h4>
                        </div>
                        <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progresso</span>
                          <span className="text-sm text-muted-foreground">{achievement.progress}%</span>
                        </div>
                        <Progress value={achievement.progress} className="h-2" />
                      </div>
                      
                      <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                        <p className="text-sm font-medium text-gray-800">🎯 Quando conquistar:</p>
                        <p className="text-sm text-gray-700">{achievement.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB: DESAFIOS */}
        <TabsContent value="challenges" className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Desafios Ativos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-lg">{challenge.title}</h4>
                      <Badge className={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                    
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm font-medium text-blue-800">🎯 Objetivo:</p>
                        <p className="text-sm text-blue-700">{challenge.why}</p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-sm font-medium text-green-800">🏆 Recompensa:</p>
                        <p className="text-sm text-green-700">{challenge.reward}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progresso</span>
                          <span className="text-sm text-muted-foreground">
                            {challenge.completedQuestions || Math.round(challenge.currentAccuracy) || challenge.progress}
                            {challenge.targetQuestions ? `/${challenge.targetQuestions}` : 
                             challenge.targetAccuracy ? `/${challenge.targetAccuracy}%` : '%'}
                          </span>
                        </div>
                        <Progress value={challenge.progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Prazo: {challenge.timeframe}</span>
                        <Button size="sm" variant="outline">
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB: IMPACTO */}
        <TabsContent value="impact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Benefícios Desbloqueados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Benefícios Ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unlockedAchievements.map((achievement) => (
                  <div key={achievement.id} className="p-3 rounded-lg border bg-green-50">
                    <p className="text-sm font-medium">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.unlockedBenefit}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Crescimento Pessoal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Crescimento Pessoal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unlockedAchievements.map((achievement) => (
                  <div key={achievement.id} className="p-3 rounded-lg border bg-purple-50">
                    <p className="text-sm font-medium">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.emotionalImpact}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{unlockedAchievements.length}</p>
                  <p className="text-sm text-muted-foreground">Conquistas desbloqueadas</p>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{challenges.length}</p>
                  <p className="text-sm text-muted-foreground">Desafios ativos</p>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taxa de conclusão</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Motivação */}
          <Alert>
            <Trophy className="h-4 w-4" />
            <AlertDescription>
              <strong>Lembre-se:</strong> Cada conquista representa crescimento real no seu aprendizado. 
              Não é sobre quantidade, mas sobre a qualidade do seu desenvolvimento como profissional da saúde.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeaningfulAchievements;