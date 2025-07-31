import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  Clock, 
  Target, 
  Lightbulb,
  Trophy,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import RetentionApiService from '../../services/retentionApi';

const RetentionDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('MONTHLY');

  useEffect(() => {
    loadDashboardData();
  }, [timeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, predictionData] = await Promise.all([
        RetentionApiService.getRetentionDashboard(),
        RetentionApiService.getPerformancePrediction()
      ]);
      
      setDashboard(dashboardData);
      setPrediction(predictionData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'REGRESSION': return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'IMPROVEMENT': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'DECLINING': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'STABLE': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Carregando dashboard de retenção...</span>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Erro ao carregar dashboard</h3>
            <p className="text-muted-foreground mb-4">Não foi possível carregar os dados de retenção.</p>
            <Button onClick={loadDashboardData}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            Dashboard de Retenção
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise completa do seu progresso de aprendizado e retenção de conhecimento
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Diário</SelectItem>
              <SelectItem value="WEEKLY">Semanal</SelectItem>
              <SelectItem value="MONTHLY">Mensal</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rastreado</p>
                <p className="text-2xl font-bold">{dashboard.overview.totalQuestionsTracked}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dominadas</p>
                <p className="text-2xl font-bold text-green-600">{dashboard.overview.masteredQuestions}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-500" />
            </div>
            <Progress 
              value={(dashboard.overview.masteredQuestions / dashboard.overview.totalQuestionsTracked) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Declínio</p>
                <p className="text-2xl font-bold text-red-600">{dashboard.overview.decliningQuestions}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
            {dashboard.overview.decliningQuestions > 0 && (
              <p className="text-xs text-red-600 mt-1">Requer atenção imediata</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprendendo</p>
                <p className="text-2xl font-bold text-blue-600">{dashboard.overview.learningQuestions}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
            <Progress 
              value={(dashboard.overview.learningQuestions / dashboard.overview.totalQuestionsTracked) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="prediction">Predição</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        {/* TAB: ALERTAS */}
        <TabsContent value="alerts" className="space-y-4">
          {dashboard.alerts.length > 0 ? (
            <div className="space-y-3">
              {dashboard.alerts.map((alert, index) => (
                <Alert key={index} className={
                  alert.priority === 'HIGH' ? 'border-red-200 bg-red-50' :
                  alert.priority === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{alert.message}</h4>
                        <Badge 
                          variant={alert.priority === 'HIGH' ? 'destructive' : 
                                 alert.priority === 'MEDIUM' ? 'default' : 'secondary'}
                        >
                          {alert.priority}
                        </Badge>
                      </div>
                      <AlertDescription className="mt-1">
                        {alert.recommendation}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tudo sob controle!</h3>
                <p className="text-muted-foreground">Não há alertas de retenção no momento.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: CONQUISTAS */}
        <TabsContent value="achievements" className="space-y-4">
          {dashboard.achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.achievements.map((achievement, index) => (
                <Card key={index} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Trophy className="w-6 h-6 text-yellow-500 mt-1" />
                      <div>
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Conquistado em {new Date(achievement.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ainda sem conquistas</h3>
                <p className="text-muted-foreground">Continue estudando para desbloquear suas primeiras conquistas!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: PREDIÇÃO */}
        <TabsContent value="prediction" className="space-y-6">
          {prediction && (
            <>
              {/* Predição de Accuracy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Predição de Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Próxima Lista</p>
                      <p className="text-3xl font-bold">{prediction.nextListAccuracy.predicted}%</p>
                      <p className="text-xs text-muted-foreground">{prediction.nextListAccuracy.range}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Confiança</p>
                      <p className={`text-2xl font-bold ${getConfidenceColor(prediction.nextListAccuracy.confidence)}`}>
                        {prediction.nextListAccuracy.confidence}
                      </p>
                      <p className="text-xs text-muted-foreground">{prediction.nextListAccuracy.dataPoints} pontos de dados</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Baseado em</p>
                      <p className="text-sm font-medium">{prediction.nextListAccuracy.basedOn}</p>
                      <p className="text-xs text-muted-foreground">{prediction.nextListAccuracy.methodology}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tendências */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Tendências</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      {getTrendIcon(prediction.trends.accuracyTrend)}
                      <div>
                        <p className="font-medium">Precisão</p>
                        <p className="text-sm text-muted-foreground">{prediction.trends.accuracyTrend}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      {getTrendIcon(prediction.trends.speedTrend)}
                      <div>
                        <p className="font-medium">Velocidade</p>
                        <p className="text-sm text-muted-foreground">{prediction.trends.speedTrend}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      {getTrendIcon(prediction.trends.consistencyTrend)}
                      <div>
                        <p className="font-medium">Consistência</p>
                        <p className="text-sm text-muted-foreground">{prediction.trends.consistencyTrend}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Alert className="mt-4">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Análise:</strong> {prediction.trends.trendDescription}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Tempo Ótimo de Estudo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Otimização de Tempo de Estudo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-blue-50">
                      <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Tempo Diário Ideal</p>
                      <p className="text-2xl font-bold text-blue-700">{prediction.optimalStudyTime.dailyMinutes}min</p>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-green-50">
                      <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Melhor Horário</p>
                      <p className="text-xl font-bold text-green-700">{prediction.optimalStudyTime.bestTimeOfDay}</p>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-purple-50">
                      <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sessão Ideal</p>
                      <p className="text-2xl font-bold text-purple-700">{prediction.optimalStudyTime.sessionLength}</p>
                      <p className="text-xs text-purple-600">questões</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground mb-1">Explicação:</p>
                    <p className="text-sm">{prediction.optimalStudyTime.reasoning}</p>
                    <p className="text-xs text-muted-foreground mt-2">{prediction.optimalStudyTime.calculation}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: RECOMENDAÇÕES */}
        <TabsContent value="recommendations" className="space-y-4">
          {dashboard.recommendations.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">{rec.message}</p>
                        {rec.actionable && (
                          <Button variant="outline" size="sm" className="mt-2">
                            Aplicar Recomendação
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma recomendação</h3>
                <p className="text-muted-foreground">Seu padrão de estudo está otimizado!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Áreas de Foco */}
      {prediction && prediction.focusRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Áreas de Foco Recomendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prediction.focusRecommendations.map((focus, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{focus.area}</h4>
                    <Badge 
                      variant={focus.priority === 'HIGH' ? 'destructive' : 
                             focus.priority === 'MEDIUM' ? 'default' : 'secondary'}
                    >
                      {focus.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{focus.reason}</p>
                  <p className="text-sm font-medium text-blue-600">{focus.suggestedAction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RetentionDashboard; 