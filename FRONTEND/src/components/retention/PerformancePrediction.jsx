import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Brain, 
  BarChart3, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Activity,
  Zap,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import RetentionApiService from '../../services/retentionApi';

const PerformancePrediction = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    loadPrediction();
  }, []);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const data = await RetentionApiService.getPerformancePrediction();
      setPrediction(data);
    } catch (error) {
      console.error('Erro ao carregar predição:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'DECLINING': return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'STABLE': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'IMPROVING': return 'text-green-600';
      case 'DECLINING': return 'text-red-600';
      case 'STABLE': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'border-red-200 bg-red-50';
      case 'MEDIUM': return 'border-yellow-200 bg-yellow-50';
      case 'LOW': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Analisando seus dados para predição...</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Dados insuficientes</h3>
            <p className="text-muted-foreground mb-4">
              Precisamos de mais dados de estudo para gerar predições precisas.
            </p>
            <Button onClick={loadPrediction}>Tentar novamente</Button>
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
            <Activity className="w-8 h-8 text-blue-600" />
            Predição de Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise preditiva baseada em seus dados históricos de estudo
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => setShowMethodology(!showMethodology)}
        >
          <Eye className="w-4 h-4 mr-2" />
          {showMethodology ? 'Ocultar' : 'Ver'} Metodologia
        </Button>
      </div>

      {/* Metodologia */}
      {showMethodology && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Como funciona:</strong> Nossas predições são baseadas em análise de padrões dos seus últimos estudos, 
            taxa de retenção histórica, tempo de resposta e consistência. Não são metas, mas tendências identificadas 
            em seus dados reais. A confiança varia conforme a quantidade e qualidade dos dados disponíveis.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="accuracy" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accuracy">Predição</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="timing">Timing Ótimo</TabsTrigger>
          <TabsTrigger value="focus">Áreas de Foco</TabsTrigger>
        </TabsList>

        {/* TAB: PREDIÇÃO DE ACCURACY */}
        <TabsContent value="accuracy" className="space-y-6">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Próxima Lista de Questões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Predição Principal */}
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {prediction.nextListAccuracy.predicted}%
                </div>
                <p className="text-lg text-muted-foreground">Accuracy prevista</p>
                <p className="text-sm text-muted-foreground">
                  Faixa esperada: {prediction.nextListAccuracy.range}
                </p>
              </div>

              {/* Detalhes da Predição */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`p-4 ${getConfidenceColor(prediction.nextListAccuracy.confidence)}`}>
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-semibold">Confiança</p>
                    <p className="text-2xl font-bold">{prediction.nextListAccuracy.confidence}</p>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <p className="font-semibold">Pontos de Dados</p>
                    <p className="text-2xl font-bold">{prediction.nextListAccuracy.dataPoints}</p>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <div className="text-center">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="font-semibold">Baseado em</p>
                    <p className="text-sm">{prediction.nextListAccuracy.basedOn}</p>
                  </div>
                </Card>
              </div>

              {/* Explicação da Metodologia */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Como chegamos a este número:</h4>
                <p className="text-sm text-blue-700">{prediction.nextListAccuracy.methodology}</p>
              </div>

              {/* Fatores que Podem Afetar */}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lembre-se:</strong> Esta é uma tendência baseada em seus padrões históricos. 
                  Fatores como cansaço, dificuldade das questões, tempo desde a última revisão e 
                  seu estado emocional podem influenciar o resultado real.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: TENDÊNCIAS */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tendência de Precisão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(prediction.trends.accuracyTrend)}
                  Precisão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getTrendColor(prediction.trends.accuracyTrend)}`}>
                  {prediction.trends.accuracyTrend}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Sua precisão nas questões está {prediction.trends.accuracyTrend === 'IMPROVING' ? 'melhorando' : 
                  prediction.trends.accuracyTrend === 'DECLINING' ? 'diminuindo' : 'estável'}
                </p>
              </CardContent>
            </Card>

            {/* Tendência de Velocidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(prediction.trends.speedTrend)}
                  Velocidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getTrendColor(prediction.trends.speedTrend)}`}>
                  {prediction.trends.speedTrend}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Sua velocidade de resposta está {prediction.trends.speedTrend === 'IMPROVING' ? 'melhorando' : 
                  prediction.trends.speedTrend === 'DECLINING' ? 'diminuindo' : 'estável'}
                </p>
              </CardContent>
            </Card>

            {/* Tendência de Consistência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(prediction.trends.consistencyTrend)}
                  Consistência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getTrendColor(prediction.trends.consistencyTrend)}`}>
                  {prediction.trends.consistencyTrend}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Sua consistência nos estudos está {prediction.trends.consistencyTrend === 'IMPROVING' ? 'melhorando' : 
                  prediction.trends.consistencyTrend === 'DECLINING' ? 'diminuindo' : 'estável'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Análise Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada das Tendências</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Resumo:</strong> {prediction.trends.trendDescription}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: TIMING ÓTIMO */}
        <TabsContent value="timing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tempo Diário */}
            <Card className="border-2 border-blue-200">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tempo Diário Ideal</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {prediction.optimalStudyTime.dailyMinutes}
                </div>
                <p className="text-sm text-muted-foreground">minutos por dia</p>
              </CardContent>
            </Card>

            {/* Melhor Horário */}
            <Card className="border-2 border-green-200">
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Melhor Horário</h3>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {prediction.optimalStudyTime.bestTimeOfDay}
                </div>
                <p className="text-sm text-muted-foreground">período de maior performance</p>
              </CardContent>
            </Card>

            {/* Sessão Ideal */}
            <Card className="border-2 border-purple-200">
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sessão Ideal</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {prediction.optimalStudyTime.sessionLength}
                </div>
                <p className="text-sm text-muted-foreground">questões por sessão</p>
              </CardContent>
            </Card>
          </div>

          {/* Explicações */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Por que estes horários?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{prediction.optimalStudyTime.reasoning}</p>
                <p className="text-xs text-muted-foreground">{prediction.optimalStudyTime.calculation}</p>
              </CardContent>
            </Card>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Dica:</strong> Estes são seus horários ótimos baseados em dados históricos. 
                Experimente estudar nestes períodos para maximizar sua eficiência!
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* TAB: ÁREAS DE FOCO */}
        <TabsContent value="focus" className="space-y-6">
          {prediction.focusRecommendations.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Áreas que Precisam de Atenção</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prediction.focusRecommendations.map((focus, index) => (
                  <Card key={index} className={`border-2 ${getPriorityColor(focus.priority)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold">{focus.area}</h4>
                        <Badge 
                          variant={focus.priority === 'HIGH' ? 'destructive' : 
                                 focus.priority === 'MEDIUM' ? 'default' : 'secondary'}
                        >
                          {focus.priority}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Motivo:</p>
                          <p className="text-sm">{focus.reason}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Ação sugerida:</p>
                          <p className="text-sm font-medium text-blue-600">{focus.suggestedAction}</p>
                        </div>
                      </div>
                      
                      <Button size="sm" className="mt-4 w-full" variant="outline">
                        Criar Plano de Estudo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Parabéns!</h3>
                <p className="text-muted-foreground">
                  Não identificamos áreas críticas que precisem de foco especial. 
                  Continue com seu padrão atual de estudos!
                </p>
              </CardContent>
            </Card>
          )}
          
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Estas recomendações são baseadas em análise de dados objetivos. 
              Use-as como guia, mas sempre considere seu próprio conhecimento sobre suas necessidades de estudo.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformancePrediction; 