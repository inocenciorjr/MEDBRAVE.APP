import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Calendar,
  BarChart3,
  Target,
  AlertTriangle,
  Lightbulb,
  Activity,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import RetentionApiService from '../../services/retentionApi';

const QuestionRetentionHistory = ({ questionId, onClose }) => {
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllAttempts, setShowAllAttempts] = useState(false);

  useEffect(() => {
    if (questionId) {
      loadRetentionHistory();
    }
  }, [questionId]);

  const loadRetentionHistory = async () => {
    try {
      setLoading(true);
      const data = await RetentionApiService.getQuestionRetentionHistory(questionId);
      setRetention(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'MASTERED': return 'text-green-600 bg-green-50 border-green-200';
      case 'LEARNING': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'REGRESSION': return 'text-red-600 bg-red-50 border-red-200';
      case 'INCONSISTENT': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'MASTERED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'LEARNING': return <Brain className="w-5 h-5 text-blue-500" />;
      case 'REGRESSION': return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'INCONSISTENT': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getContextBadge = (context) => {
    switch (context) {
      case 'LIST_STUDY': return <Badge variant="outline">Lista</Badge>;
      case 'FSRS_REVIEW': return <Badge variant="secondary">FSRS</Badge>;
      case 'PRACTICE': return <Badge variant="default">Prática</Badge>;
      default: return <Badge variant="outline">{context}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Carregando histórico da questão...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!retention) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
            <p className="text-muted-foreground mb-4">Esta questão ainda não possui histórico de retenção.</p>
            <Button onClick={onClose}>Fechar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleAttempts = showAllAttempts ? retention.attempts : retention.attempts.slice(-10);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                Histórico de Retenção
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Questão ID: {questionId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadRetentionHistory}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="ghost" onClick={onClose}>✕</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Status Atual */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={`border-2 ${getPhaseColor(retention.learningPattern.phase)}`}>
              <CardContent className="p-4 text-center">
                {getPhaseIcon(retention.learningPattern.phase)}
                <div className="mt-2">
                  <div className="font-semibold">Status Atual</div>
                  <div className="text-sm">{retention.learningPattern.phase}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{(retention.metrics.retentionRate * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Taxa de Retenção</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{retention.metrics.totalAttempts}</div>
                <div className="text-sm text-muted-foreground">Total de Tentativas</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{formatTime(retention.metrics.averageResponseTime)}</div>
                <div className="text-sm text-muted-foreground">Tempo Médio</div>
              </CardContent>
            </Card>
          </div>

          {/* Análise de Padrão */}
          <Card className={`border-2 ${getPhaseColor(retention.learningPattern.phase)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Análise de Padrão de Aprendizado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className={getPhaseColor(retention.learningPattern.phase)}>
                {getPhaseIcon(retention.learningPattern.phase)}
                <AlertDescription>
                  <strong>{retention.learningPattern.patternMessage}</strong>
                </AlertDescription>
              </Alert>

              {retention.learningPattern.regressionAlert && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>⚠️ Alerta de Regressão:</strong> Você dominava esta questão mas regrediu recentemente.
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Recomendação:</h4>
                <p className="text-sm text-blue-700">{retention.learningPattern.recommendation}</p>
              </div>

              {retention.learningPattern.turningPoint && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">🎯 Ponto de Virada:</h4>
                  <p className="text-sm text-green-700">
                    Você começou a dominar esta questão em {formatDate(retention.learningPattern.turningPoint)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Acertos:</span>
                  <span className="font-medium">{retention.metrics.correctAttempts} de {retention.metrics.totalAttempts}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sequência atual:</span>
                  <span className="font-medium">{retention.metrics.currentStreak}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maior sequência:</span>
                  <span className="font-medium">{retention.metrics.longestCorrectStreak}</span>
                </div>
                
                {retention.metrics.lastCorrectDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Último acerto:</span>
                    <span className="font-medium">{formatDate(retention.metrics.lastCorrectDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Padrões Temporais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {retention.patterns.bestTimeOfDay && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Melhor horário:</span>
                    <span className="font-medium">{retention.patterns.bestTimeOfDay}</span>
                  </div>
                )}
                
                {retention.patterns.worstTimeOfDay && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pior horário:</span>
                    <span className="font-medium">{retention.patterns.worstTimeOfDay}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Intervalo médio:</span>
                  <span className="font-medium">{retention.patterns.averageDaysBetweenAttempts.toFixed(1)} dias</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de esquecimento:</span>
                  <span className="font-medium">{(retention.patterns.forgettingCurve * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline de Tentativas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timeline de Tentativas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAllAttempts(!showAllAttempts)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showAllAttempts ? 'Mostrar Menos' : `Ver Todas (${retention.attempts.length})`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visibleAttempts.reverse().map((attempt, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {attempt.correct ? 
                        <CheckCircle className="w-6 h-6 text-green-500" /> : 
                        <XCircle className="w-6 h-6 text-red-500" />
                      }
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{formatDate(attempt.date)}</span>
                        {getContextBadge(attempt.context)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tempo: {formatTime(attempt.responseTimeMs)}
                        {attempt.confidence && (
                          <span className="ml-2">• Confiança: {attempt.confidence}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`text-sm font-medium ${attempt.correct ? 'text-green-600' : 'text-red-600'}`}>
                      {attempt.correct ? 'CORRETO' : 'INCORRETO'}
                    </div>
                  </div>
                ))}
              </div>
              
              {!showAllAttempts && retention.attempts.length > 10 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando últimas 10 tentativas de {retention.attempts.length} total
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Progresso */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso de Retenção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Retenção Atual</span>
                  <span className="text-sm text-muted-foreground">
                    {(retention.metrics.retentionRate * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={retention.metrics.retentionRate * 100} className="h-3" />
                
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dica:</strong> Uma taxa de retenção acima de 70% indica boa consolidação do conhecimento. 
                    Abaixo de 50% sugere necessidade de revisão mais frequente.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionRetentionHistory; 