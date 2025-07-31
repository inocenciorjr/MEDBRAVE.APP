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
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import RetentionApiService from '../services/retentionApi';

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

  const getFatigueColor = (level) => {
    switch (level) {
      case 'NONE': return 'text-green-600';
      case 'MILD': return 'text-yellow-600';
      case 'MODERATE': return 'text-orange-600';
      case 'SEVERE': return 'text-red-600';
      default: return 'text-gray-600';
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
              <TabsTrigger value="efficiency">Eficiência</TabsTrigger>
              <TabsTrigger value="retention">Retenção</TabsTrigger>
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

              {/* Padrões de Fadiga */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Análise de Fadiga
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">Nível de fadiga detectado:</span>
                      <div className={`text-lg font-semibold ${getFatigueColor(statistics.patterns.fatigueEffect)}`}>
                        {statistics.patterns.fatigueEffect === 'NONE' && 'Nenhuma fadiga'}
                        {statistics.patterns.fatigueEffect === 'MILD' && 'Fadiga leve'}
                        {statistics.patterns.fatigueEffect === 'MODERATE' && 'Fadiga moderada'}
                        {statistics.patterns.fatigueEffect === 'SEVERE' && 'Fadiga severa'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Sessão ideal:</span>
                      <div className="text-lg font-semibold">{statistics.patterns.optimalSessionLength} questões</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: EFICIÊNCIA TEMPORAL */}
            <TabsContent value="efficiency" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getEfficiencyIcon(statistics.timeEfficiency.pattern)}
                    Análise de Eficiência Temporal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{statistics.timeEfficiency.userMessage}</strong>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">Questões Corretas</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {Math.round(statistics.timeEfficiency.correctQuestions.averageTimeSeconds)}s
                        </div>
                        <div className="text-sm text-green-600">
                          {statistics.timeEfficiency.correctQuestions.count} questões
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-800">Questões Incorretas</span>
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                          {Math.round(statistics.timeEfficiency.incorrectQuestions.averageTimeSeconds)}s
                        </div>
                        <div className="text-sm text-red-600">
                          {statistics.timeEfficiency.incorrectQuestions.count} questões
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Interpretação</h4>
                      <p className="text-blue-700 mb-2">{statistics.timeEfficiency.interpretation.message}</p>
                      <p className="text-blue-600 text-sm">{statistics.timeEfficiency.interpretation.advice}</p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: RETENÇÃO */}
            <TabsContent value="retention" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.retention.questionsSeenBefore}</div>
                    <div className="text-sm text-muted-foreground">Questões já vistas</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.retention.questionsNewToUser}</div>
                    <div className="text-sm text-muted-foreground">Questões novas</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(statistics.retention.retentionRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de retenção</div>
                  </CardContent>
                </Card>
              </div>

              {/* Análise de Consistência */}
              {statistics.retention.consistencyAnalysis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Análise de Consistência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.retention.consistencyAnalysis.slice(0, 5).map((analysis, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {analysis.trend === 'IMPROVED' && <TrendingUp className="w-5 h-5 text-green-500" />}
                            {analysis.trend === 'REGRESSED' && <TrendingDown className="w-5 h-5 text-red-500" />}
                            {analysis.trend === 'MAINTAINED' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                            <span className="text-sm">{analysis.message}</span>
                          </div>
                          <Badge 
                            variant={analysis.impactLevel === 'HIGH' ? 'destructive' : 
                                   analysis.impactLevel === 'MEDIUM' ? 'default' : 'secondary'}
                          >
                            {analysis.impactLevel}
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
              {statistics.recommendations.shouldAddToFSRS.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Questões Recomendadas para Revisão Espaçada (FSRS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {statistics.recommendations.shouldAddToFSRS.map((rec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.has(rec.questionId)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedQuestions);
                                if (e.target.checked) {
                                  newSelected.add(rec.questionId);
                                } else {
                                  newSelected.delete(rec.questionId);
                                }
                                setSelectedQuestions(newSelected);
                              }}
                              className="w-4 h-4"
                            />
                            <div>
                              <div className="text-sm font-medium">Questão {rec.questionId}</div>
                              <div className="text-xs text-muted-foreground">{rec.explanation}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={rec.priority === 'HIGH' ? 'destructive' : 
                                     rec.priority === 'MEDIUM' ? 'default' : 'secondary'}
                            >
                              {rec.priority}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {Math.round(rec.confidence * 100)}% confiança
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAddToFSRS('INTELLIGENT_SELECTION')}
                        disabled={addingToFSRS}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {addingToFSRS ? 'Adicionando...' : 'Adicionar Recomendadas'}
                      </Button>
                      
                      {selectedQuestions.size > 0 && (
                        <Button 
                          variant="outline"
                          onClick={() => handleAddToFSRS('SELECTED')}
                          disabled={addingToFSRS}
                        >
                          Adicionar Selecionadas ({selectedQuestions.size})
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Outras Recomendações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Gestão de Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{statistics.recommendations.timeManagement}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Estratégia de Estudo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{statistics.recommendations.studyStrategy}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Áreas de Foco */}
              {statistics.recommendations.focusAreas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Áreas de Foco Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {statistics.recommendations.focusAreas.map((area, index) => (
                        <Badge key={index} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Dashboard Completo
              </Button>
              <Button>
                <ArrowRight className="w-4 h-4 mr-2" />
                Próxima Lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ListCompletionSummary; 