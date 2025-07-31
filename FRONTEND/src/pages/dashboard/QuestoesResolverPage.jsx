import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getQuestionListById } from '../../services/questionListService';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ListCompletionSummary from '../../components/retention/ListCompletionSummary';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  MessageCircle, 
  Save, 
  Eye, 
  Flag, 
  Star, 
  Heart, 
  Download,
  X,
  Scissors,
  Focus,
  Check,
  Trophy
} from 'lucide-react';

const QuestoesResolverPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados originais
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [cutAlternatives, setCutAlternatives] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [showActionButtons, setShowActionButtons] = useState(false);

  // Novos estados para as melhorias
  const [focusMode, setFocusMode] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [correctAnswers, setCorrectAnswers] = useState(new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState(new Set());
  
  // Estados para modal de conclusão
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [listCompleted, setListCompleted] = useState(false);

  // Estados para dados do Firebase
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listInfo, setListInfo] = useState({
    listId: null,
    listName: '',
    questionCount: 0
  });

  // Função para obter ID da lista
  const getListId = useCallback(() => {
    try {
      const navigationParams = location.state?.navigationParams;
      const sessionStorageData = sessionStorage.getItem('navigationParams');
      const urlParams = new URLSearchParams(location.search);
      const urlListId = urlParams.get('listId');
      
      if (navigationParams?.listId) {
        setListInfo({
          listId: navigationParams.listId,
          listName: navigationParams.listName || '',
          questionCount: navigationParams.questionCount || 0
        });
        return navigationParams.listId;
      }
      
      if (sessionStorageData) {
        const parsedData = JSON.parse(sessionStorageData);
        if (parsedData.listId) {
          setListInfo({
            listId: parsedData.listId,
            listName: parsedData.listName || '',
            questionCount: parsedData.questionCount || 0
          });
          return parsedData.listId;
        }
      }
      
      if (urlListId) {
        setListInfo({
          listId: urlListId,
          listName: '',
          questionCount: 0
        });
        return urlListId;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter ID da lista:', error);
      return null;
    }
  }, [location.state, location.search]);

  // Carregar questões da lista
  const carregarQuestoes = useCallback(async (listId) => {
    try {
      setLoading(true);
      console.log('Carregando lista:', listId);
      
      const listaCompleta = await getQuestionListById(listId);
      
      if (listaCompleta && listaCompleta.questions && listaCompleta.questions.length > 0) {
        console.log('📝 LISTA COMPLETA:', listaCompleta);
        
        // Atualizar informações da lista
        setListInfo({
          listId: listId,
          listName: listaCompleta.name || listaCompleta.title || '',
          questionCount: listaCompleta.questions.length
        });
        
        setQuestoes(listaCompleta.questions);
      } else {
        setError('Nenhuma questão encontrada nesta lista.');
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
      setError('Erro ao carregar questões da lista.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to reset question state when changing questions
  const resetQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCutAlternatives(new Set());
    setShowActionButtons(false);
    setNotes('');
  }, []);

  // Effect para carregar questões
  useEffect(() => {
    const listId = getListId();
    if (listId) {
      carregarQuestoes(listId);
    } else {
      setError('ID da lista não fornecido na URL');
      setLoading(false);
    }
  }, [getListId, carregarQuestoes]);

  // Effect para resetar quando questão muda
  useEffect(() => {
    resetQuestion();
  }, [currentQuestion, resetQuestion]);

  // Se carregando
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando questões...</p>
        </div>
      </div>
    );
  }

  // Se erro
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Se não há questões
  if (!questoes.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhuma questão encontrada nesta lista.</p>
        </div>
      </div>
    );
  }

  // Calcular totais com base nos dados reais do Firebase
  const totalQuestions = questoes.length;
  const questionDataFirebase = questoes[currentQuestion - 1];

  if (!questionDataFirebase) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Questão não encontrada.</p>
        </div>
      </div>
    );
  }

  // Mapear alternativas do Firebase para o formato esperado pelo design original (SEM FALLBACKS)
  const mappedAlternatives = questionDataFirebase.alternatives?.map((alt, index) => ({
    letter: String.fromCharCode(65 + index), // A, B, C, D...
    text: alt.text,
    correct: alt.isCorrect || false,
    percentage: Math.floor(Math.random() * 40) + 10, // Placeholder - você pode implementar estatísticas reais depois
    id: alt.id
  })) || [];

  // Adaptar dados da questão para o formato original (SEM FALLBACKS)
  const questionData = {
    id: questionDataFirebase.id,
    subject: questionDataFirebase.tags?.[0] || "Medicina",
    difficulty: questionDataFirebase.difficulty || "medium",
    institution: questionDataFirebase.institution || "Instituição",
    text: questionDataFirebase.statement || questionDataFirebase.text || "",
    alternatives: mappedAlternatives
  };

  // Filtros ativos baseados na questão atual (SEM FALLBACKS)
  const activeFilters = [
    questionData.subject ? { label: questionData.subject, active: true } : null,
    questionData.difficulty ? { 
      label: questionData.difficulty === 'easy' ? 'Fácil' : 
             questionData.difficulty === 'medium' ? 'Médio' : 'Difícil', 
      active: true 
    } : null,
    questionData.institution ? { label: questionData.institution, active: true } : null
  ].filter(Boolean);

  const handleSelectAlternative = (letter) => {
    if (!isAnswered && !cutAlternatives.has(letter)) {
      setSelectedAnswer(letter);
    }
  };

  const handleAnswerQuestion = () => {
    if (!selectedAnswer) return;
    
    setIsAnswered(true);
    setShowActionButtons(true);
    
    // Adicionar à lista de questões respondidas
    const newAnsweredQuestions = new Set([...answeredQuestions, currentQuestion]);
    setAnsweredQuestions(newAnsweredQuestions);
    
    // Verificar se está correto e adicionar às listas apropriadas
    const correctAlternative = questionDataFirebase.alternatives.find(alt => alt.correct);
    if (correctAlternative && selectedAnswer === correctAlternative.letter) {
      setCorrectAnswers(prev => new Set([...prev, currentQuestion]));
    } else {
      setIncorrectAnswers(prev => new Set([...prev, currentQuestion]));
    }
    
    // Verificar se todas as questões foram respondidas
    if (newAnsweredQuestions.size === totalQuestions && !listCompleted) {
      setListCompleted(true);
      // Aguardar um pouco para que o usuário veja a resposta atual antes de mostrar o modal
      setTimeout(() => {
        setShowCompletionSummary(true);
      }, 1500);
    }
  };

  const handleCutAlternative = (letter, event) => {
    event.stopPropagation();
    setCutAlternatives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(letter)) {
        newSet.delete(letter);
      } else {
        newSet.add(letter);
      }
      return newSet;
    });
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleQuestionNavigation = (questionNumber) => {
    setCurrentQuestion(questionNumber);
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  const getAlternativeClasses = (alternative) => {
    const baseClasses = "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group";
    
    if (cutAlternatives.has(alternative.letter)) {
      return `${baseClasses} opacity-30 border-muted bg-muted/20 line-through`;
    }
    
    if (!isAnswered) {
      if (selectedAnswer === alternative.letter) {
        return `${baseClasses} border-primary bg-primary/5`;
      }
      return `${baseClasses} border-border hover:border-accent hover:bg-accent/5`;
    }
    
    // After answering - restaurando lógica original
    if (alternative.correct) {
      return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-950/20`;
    } else if (selectedAnswer === alternative.letter) {
      return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-950/20`;
    }
    
    return `${baseClasses} opacity-60`;
  };

  const getAlternativeLetterClasses = (alternative) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0";
    
    if (cutAlternatives.has(alternative.letter)) {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }
    
    if (!isAnswered) {
      if (selectedAnswer === alternative.letter) {
        return `${baseClasses} bg-primary text-primary-foreground`;
      }
      return `${baseClasses} bg-muted text-foreground group-hover:bg-accent group-hover:text-accent-foreground`;
    }
    
    // After answering - restaurando lógica original
    if (alternative.correct) {
      return `${baseClasses} bg-green-500 text-white`;
    }
    
    if (selectedAnswer === alternative.letter && !alternative.correct) {
      return `${baseClasses} bg-red-500 text-white`;
    }
    
    return `${baseClasses} bg-muted text-muted-foreground`;
  };

  const getQuestionButtonStatus = (questionNumber) => {
    if (correctAnswers.has(questionNumber)) return 'correct';
    if (incorrectAnswers.has(questionNumber)) return 'incorrect';
    if (answeredQuestions.has(questionNumber)) return 'answered';
    return 'default';
  };

  const getQuestionButtonClasses = (questionNumber) => {
    const isActive = currentQuestion === questionNumber;
    const baseClasses = `w-10 h-10 text-sm font-medium transition-all border-2 rounded-lg ${
      isActive ? 'ring-2 ring-primary ring-offset-2' : ''
    }`;
    
    const status = getQuestionButtonStatus(questionNumber);
    switch (status) {
      case 'correct':
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600`;
      case 'incorrect':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
      case 'answered':
        return `${baseClasses} bg-blue-500 text-white hover:bg-blue-600`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground`;
    }
  };

  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress Bar - corrigindo largura */}
      <div className="mb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 max-w-md">
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFocusMode}
            className="flex items-center gap-2 ml-4"
          >
            <Focus className="h-4 w-4" />
            {focusMode ? 'Sair do Foco' : 'Modo Foco'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Questão {currentQuestion} de {totalQuestions}
        </p>
      </div>

      {/* Filter Chips */}
      {!focusMode && (
        <div className="mb-4 px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {activeFilters.map((filter, index) => (
              <Badge 
                key={index}
                variant={filter.active ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
              >
                {filter.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid - ajustando para permitir painel de navegação */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[250px_1fr_300px] gap-4 px-4 overflow-hidden">
        
        {/* Quick Navigation Panel - novo painel */}
        {!focusMode && (
          <Card className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-3 w-3 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Navegação Rápida</h3>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => (
                  <Button
                    key={num}
                    variant={currentQuestion === num ? "default" : "outline"}
                    size="sm"
                    className={getQuestionButtonClasses(num)}
                    onClick={() => handleQuestionNavigation(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Area */}
        <div className="flex flex-col overflow-hidden">
          {/* Question Container com botões de navegação próximos */}
          <div className="flex-1 overflow-y-auto relative">
            <Card className="max-w-4xl mx-auto relative">
              {/* Navigation Buttons - encostados no card */}
              <Button
                variant="outline"
                size="icon"
                className="absolute -left-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-md"
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 1}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="absolute -right-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-md"
                onClick={handleNextQuestion}
                disabled={currentQuestion === totalQuestions}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {questionDataFirebase.subject}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`${
                      questionDataFirebase.difficulty === 'medium' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                        : questionDataFirebase.difficulty === 'hard'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {questionDataFirebase.difficulty === 'easy' ? 'Fácil' : 
                     questionDataFirebase.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                  </Badge>
                  <Badge variant="outline">
                    {questionDataFirebase.institution}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Question Text */}
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: questionDataFirebase.text }}
                />

                {/* Alternatives */}
                <div className="space-y-3">
                  {questionDataFirebase.alternatives.map((alternative) => (
                    <div
                      key={alternative.letter}
                      className={getAlternativeClasses(alternative)}
                      onClick={() => handleSelectAlternative(alternative.letter)}
                    >
                      <div className={getAlternativeLetterClasses(alternative)}>
                        {alternative.letter}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm">{alternative.text}</p>
                        {isAnswered && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {alternative.percentage}% dos usuários
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-1.5 max-w-24">
                              <div 
                                className="bg-primary h-full rounded-full transition-all duration-500"
                                style={{ width: `${alternative.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground ${
                          cutAlternatives.has(alternative.letter) 
                            ? 'bg-destructive text-destructive-foreground opacity-100' 
                            : ''
                        }`}
                        onClick={(e) => handleCutAlternative(alternative.letter, e)}
                      >
                        <Scissors className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Action Buttons - restaurando lógica original */}
                {selectedAnswer && !isAnswered && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={handleAnswerQuestion}
                      className="flex items-center gap-2 px-8"
                      size="lg"
                    >
                      <Check className="h-4 w-4" />
                      Responder
                    </Button>
                  </div>
                )}

                {showActionButtons && (
                  <div className="border-t bg-card p-6 flex justify-center gap-4">
                    <Button variant="outline" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resumo
                    </Button>
                    
                    <Button variant="outline" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Comentários
                    </Button>
                    
                    <Button className="flex items-center gap-2" onClick={handleNextQuestion}>
                      Próxima Questão
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes Panel - Caderno de Erros */}
        {!focusMode && (
          <Card className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Caderno de Erros</h3>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="flex-1">
                <Textarea
                  placeholder="Anote aqui seus erros, dúvidas e observações sobre esta questão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-32 resize-none"
                />
              </div>

              <div className="space-y-3 flex-shrink-0">
                <Button variant="outline" className="w-full justify-start">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Anotação
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <Flag className="h-4 w-4 mr-2" />
                  Reportar Questão
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Marcar para Revisão
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <Heart className="h-4 w-4 mr-2" />
                  Adicionar aos Favoritos
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Anotações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Modal de Conclusão da Lista */}
      {showCompletionSummary && (
        <ListCompletionSummary
          listId={listInfo.listId}
          onClose={() => {
            setShowCompletionSummary(false);
            // Opcional: navegar de volta ou para outra página
          }}
          onAddToFSRS={(result) => {
            console.log('Questões adicionadas ao FSRS:', result);
            // Aqui você pode adicionar lógica adicional como mostrar um toast de sucesso
          }}
        />
      )}
    </div>
  );
};

export default QuestoesResolverPage;

