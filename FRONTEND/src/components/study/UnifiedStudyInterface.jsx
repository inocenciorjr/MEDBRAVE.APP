import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * Componente unificado para interface de estudo
 * Padroniza a experiência entre flashcards, questões e revisões
 */
const UnifiedStudyInterface = ({
  // Dados do conteúdo
  content,
  contentType, // 'flashcard', 'question', 'error-review'
  
  // Estado da sessão
  currentIndex = 0,
  totalItems = 0,
  sessionStartTime,
  
  // Configurações
  showProgress = true,
  showTimer = true,
  showStats = true,
  autoAdvance = false,
  
  // Callbacks
  onAnswer,
  onNext,
  onPrevious,
  onReveal,
  onPause,
  onFinish,
  
  // Estados
  isRevealed = false,
  isPaused = false,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [showContent, setShowContent] = useState(false);

  // Timer da sessão
  useEffect(() => {
    if (!isPaused && sessionStartTime) {
      const interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, sessionStartTime]);

  // Reset ao mudar conteúdo
  useEffect(() => {
    setSelectedAnswer(null);
    setUserInput('');
    setShowContent(false);
  }, [content?.id]);

  // Formatação de tempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progresso da sessão
  const progressPercentage = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0;

  // Ícone baseado no tipo de conteúdo
  const getContentIcon = () => {
    switch (contentType) {
      case 'flashcard':
        return <BookOpen className="w-5 h-5" />;
      case 'question':
        return <Brain className="w-5 h-5" />;
      case 'error-review':
        return <Target className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // Cor baseada no tipo de conteúdo
  const getContentColor = () => {
    switch (contentType) {
      case 'flashcard':
        return 'blue';
      case 'question':
        return 'green';
      case 'error-review':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Manipular resposta
  const handleAnswer = (answer, quality = null) => {
    if (contentType === 'question') {
      setSelectedAnswer(answer);
    }
    onAnswer?.(answer, quality);
  };

  // Revelar conteúdo
  const handleReveal = () => {
    setShowContent(true);
    onReveal?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-gray-400 text-6xl">📚</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Nenhum conteúdo disponível
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Não há itens para revisar no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header com informações da sessão */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getContentIcon()}
            <Badge variant="outline" className={`text-${getContentColor()}-600`}>
              {contentType === 'flashcard' && 'Flashcard'}
              {contentType === 'question' && 'Questão'}
              {contentType === 'error-review' && 'Revisão de Erro'}
            </Badge>
          </div>
          
          {showTimer && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(sessionTime)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            className="flex items-center space-x-1"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
          </Button>
        </div>
      </div>

      {/* Barra de progresso */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Progresso da sessão</span>
            <span>{currentIndex + 1} de {totalItems}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Conteúdo principal */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Item {currentIndex + 1}</span>
            {content.tags && content.tags.length > 0 && (
              <div className="flex space-x-1">
                {content.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {content.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{content.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Conteúdo do Flashcard */}
          {contentType === 'flashcard' && (
            <div className="space-y-4">
              {/* Frente do card */}
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  FRENTE
                </h3>
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.front }}
                />
              </div>

              {/* Verso do card (se revelado) */}
              {(isRevealed || showContent) && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    VERSO
                  </h3>
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.back }}
                  />
                </div>
              )}

              {/* Botão para revelar */}
              {!isRevealed && !showContent && (
                <div className="text-center">
                  <Button onClick={handleReveal} className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Revelar Resposta</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Questão */}
          {contentType === 'question' && (
            <div className="space-y-4">
              {/* Enunciado */}
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.statement }}
                />
              </div>

              {/* Alternativas */}
              {content.options && (
                <div className="space-y-2">
                  {content.options.map((option, index) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      className={`w-full p-4 text-left rounded-lg border transition-colors ${
                        selectedAnswer === option.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="font-medium text-gray-500">
                          {String.fromCharCode(65 + index)})
                        </span>
                        <div 
                          className="flex-1 prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: option.text }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Explicação (se revelado) */}
              {(isRevealed || showContent) && content.explanation && (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    EXPLICAÇÃO
                  </h3>
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.explanation }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Conteúdo de Revisão de Erro */}
          {contentType === 'error-review' && (
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  ANOTAÇÃO DE ERRO
                </h3>
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.content }}
                />
              </div>

              {content.solution && (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    SOLUÇÃO
                  </h3>
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.solution }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de avaliação (para flashcards) */}
      {contentType === 'flashcard' && (isRevealed || showContent) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Como foi sua resposta?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => handleAnswer('again', 1)}
                className="flex flex-col items-center space-y-2 h-auto py-4 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-6 h-6" />
                <span className="text-sm font-medium">Novamente</span>
                <span className="text-xs text-gray-500">Não lembrei</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAnswer('hard', 2)}
                className="flex flex-col items-center space-y-2 h-auto py-4 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <RotateCcw className="w-6 h-6" />
                <span className="text-sm font-medium">Difícil</span>
                <span className="text-xs text-gray-500">Com dificuldade</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAnswer('good', 3)}
                className="flex flex-col items-center space-y-2 h-auto py-4 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-medium">Bom</span>
                <span className="text-xs text-gray-500">Lembrei bem</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAnswer('easy', 4)}
                className="flex flex-col items-center space-y-2 h-auto py-4 text-green-600 border-green-200 hover:bg-green-50"
              >
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm font-medium">Fácil</span>
                <span className="text-xs text-gray-500">Muito fácil</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de navegação */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentIndex === 0}
        >
          Anterior
        </Button>

        <div className="flex space-x-2">
          {currentIndex < totalItems - 1 ? (
            <Button onClick={onNext}>
              Próximo
            </Button>
          ) : (
            <Button onClick={onFinish} className="bg-green-600 hover:bg-green-700">
              Finalizar Sessão
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas da sessão (se habilitado) */}
      {showStats && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{currentIndex + 1}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Atual</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalItems}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{formatTime(sessionTime)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tempo</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{Math.round(progressPercentage)}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Progresso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UnifiedStudyInterface;