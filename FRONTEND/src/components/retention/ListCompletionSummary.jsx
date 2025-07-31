import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Brain, 
  Zap,
  BarChart3,
  Plus,
  ArrowRight,
  Info,
  Lightbulb,
  Timer,
  Trophy,
  AlertCircle,
  Activity,
  Gauge
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import RetentionApiService from '../../services/retentionApi';

const ListCompletionSummary = ({ listId, onClose, onAddToFSRS }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [addingToFSRS, setAddingToFSRS] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [listId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await RetentionApiService.getListCompletionStatistics(listId);
      setStatistics(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFSRS = async (strategy = 'INTELLIGENT_SELECTION') => {
    if (!statistics) return;
    
    try {
      setAddingToFSRS(true);
      const questionsToAdd = strategy === 'SELECTED' 
        ? Array.from(selectedQuestions)
        : statistics.recommendations.shouldAddToFSRS.map(r => r.questionId);
      
      const result = await RetentionApiService.addQuestionsToFSRS(questionsToAdd, strategy);
      
      if (onAddToFSRS) {
        onAddToFSRS(result);
      }
    } catch (error) {
      console.error('Erro ao adicionar ao FSRS:', error);
    } finally {
      setAddingToFSRS(false);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getEfficiencyIcon = (pattern) => {
    switch (pattern) {
      case 'OVERTHINKING_INCORRECT': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'RUSHING_CORRECT': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'BALANCED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getEfficiencyColor = (pattern) => {
    switch (pattern) {
      case 'OVERTHINKING_INCORRECT': return 'border-orange-200 bg-orange-50';
      case 'RUSHING_CORRECT': return 'border-yellow-200 bg-yellow-50';
      case 'BALANCED': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getLearningPatternIcon = (phase) => {
    switch (phase) {
      case 'MASTERED': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'LEARNING': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'REGRESSION': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'INCONSISTENT': return <Activity className="w-4 h-4 text-gray-500" />;
      default: return <Brain className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLearningPatternColor = (phase) => {
    switch (phase) {
      case 'MASTERED': return 'text-yellow-700 bg-yellow-100';
      case 'LEARNING': return 'text-blue-700 bg-blue-100';
      case 'REGRESSION': return 'text-red-700 bg-red-100';
      case 'INCONSISTENT': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Analisando sua performance...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar estatísticas</h3>
            <p className="text-muted-foreground mb-4">Não foi possível analisar sua performance.</p>
            <Button onClick={onClose}>Fechar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Resumo da Sessão
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Análise completa da sua performance e recomendações personalizadas
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="efficiency">Eficiência Temporal</TabsTrigger>
              <TabsTrigger value="retention">Padrões de Retenção</TabsTrigger>
              <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
            </TabsList>

            {/* TAB: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics.basic.accuracyPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Precisão</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatTime(statistics.basic.totalTimeMs)}</div>
                    <div className="text-sm text-muted-foreground">Tempo Total</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics.basic.totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">Questões</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Timer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatTime(statistics.basic.averageTimePerQuestion)}</div>
                    <div className="text-sm text-muted-foreground">Tempo Médio</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB: EFICIÊNCIA TEMPORAL */}
            <TabsContent value="efficiency" className="space-y-6">
              <Card className={`border-2 ${getEfficiencyColor(statistics.timeEfficiency.pattern)}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getEfficiencyIcon(statistics.timeEfficiency.pattern)}
                    Análise de Eficiência Temporal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mensagem principal */}
                  <Alert>
                    <Gauge className="h-4 w-4" />
                    <AlertDescription className="text-base font-medium">
                      {statistics.timeEfficiency.userMessage}
                    </AlertDescription>
                  </Alert>

                  {/* Comparação visual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">Questões Corretas</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {Math.round(statistics.timeEfficiency.correctQuestions.averageTimeSeconds / 60)}min {Math.round(statistics.timeEfficiency.correctQuestions.averageTimeSeconds % 60)}s
                        </div>
                        <div className="text-sm text-green-600">
                          {statistics.timeEfficiency.correctQuestions.count} questões
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-800">Questões Incorretas</span>
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                          {Math.round(statistics.timeEfficiency.incorrectQuestions.averageTimeSeconds / 60)}min {Math.round(statistics.timeEfficiency.incorrectQuestions.averageTimeSeconds % 60)}s
                        </div>
                        <div className="text-sm text-red-600">
                          {statistics.timeEfficiency.incorrectQuestions.count} questões
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Interpretação e recomendação */}
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Interpretação
                      </h4>
                      <p className="text-blue-700">{statistics.timeEfficiency.interpretation.message}</p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Recomendação
                      </h4>
                      <p className="text-amber-700">{statistics.timeEfficiency.interpretation.advice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: PADRÕES DE RETENÇÃO */}
            <TabsContent value="retention" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Brain className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics.retention.questionsSeenBefore}</div>
                    <div className="text-sm text-muted-foreground">Questões Conhecidas</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{(statistics.retention.retentionRate * 100).toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Taxa de Retenção</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics.retention.regressionCount}</div>
                    <div className="text-sm text-muted-foreground">Regressões</div>
                  </CardContent>
                </Card>
              </div>

              {/* Análise de consistência por questão */}
              {statistics.retention.consistencyAnalysis && statistics.retention.consistencyAnalysis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Análise de Consistência por Questão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.retention.consistencyAnalysis.map((analysis, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getLearningPatternIcon(analysis.trend)}
                            <div>
                              <div className="font-medium">Questão #{analysis.questionId.slice(-6)}</div>
                              <div className="text-sm text-muted-foreground">{analysis.message}</div>
                            </div>
                          </div>
                          <Badge className={getLearningPatternColor(analysis.trend)}>
                            {analysis.trend === 'IMPROVED' && 'Melhorou'}
                            {analysis.trend === 'MAINTAINED' && 'Manteve'}
                            {analysis.trend === 'REGRESSED' && 'Regrediu'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB: RECOMENDAÇÕES */}
            <TabsContent value="recommendations" className="space-y-6">
              {/* Recomendações para FSRS */}
              {statistics.recommendations.shouldAddToFSRS && statistics.recommendations.shouldAddToFSRS.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-500" />
                      Questões Recomendadas para Revisão FSRS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {statistics.recommendations.shouldAddToFSRS.map((rec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              rec.priority === 'HIGH' ? 'bg-red-500' :
                              rec.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <div>
                              <div className="font-medium">Questão #{rec.questionId.slice(-6)}</div>
                              <div className="text-sm text-muted-foreground">{rec.explanation}</div>
                            </div>
                          </div>
                          <Badge variant={rec.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                            {rec.reason === 'CONSISTENTLY_INCORRECT' && 'Sempre Erra'}
                            {rec.reason === 'REGRESSION' && 'Regrediu'}
                            {rec.reason === 'HIGH_VALUE_TOPIC' && 'Tema Importante'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        onClick={() => handleAddToFSRS('INTELLIGENT_SELECTION')}
                        disabled={addingToFSRS}
                        className="flex-1"
                      >
                        {addingToFSRS ? 'Adicionando...' : 'Adicionar Recomendadas ao FSRS'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleAddToFSRS('ALL')}
                        disabled={addingToFSRS}
                      >
                        Adicionar Todas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Gestão de Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{statistics.recommendations.timeManagement}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Próxima Sessão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Próximo estudo recomendado: {new Date(statistics.recommendations.nextStudyTime).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ListCompletionSummary;
