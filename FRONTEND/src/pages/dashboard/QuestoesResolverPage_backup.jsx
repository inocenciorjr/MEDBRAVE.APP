import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getQuestionListById } from '../../services/questionListService';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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
  Scissors
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

  // Dados da questão atual do Firebase
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

  // Mapear alternativas do Firebase para o formato esperado pelo design original
  const mappedAlternatives = questionDataFirebase.alternatives?.map((alt, index) => ({
    letter: String.fromCharCode(65 + index), // A, B, C, D...
    text: alt.text,
    correct: alt.isCorrect || false,
    percentage: Math.floor(Math.random() * 40) + 10, // Placeholder - você pode implementar estatísticas reais depois
    id: alt.id
  })) || [];

  // Adaptar dados da questão para o formato original
  const questionData = {
    id: questionDataFirebase.id,
    subject: questionDataFirebase.tags?.[0] || "Medicina",
    difficulty: questionDataFirebase.difficulty || "medium",
    institution: questionDataFirebase.institution || "Instituição",
    text: questionDataFirebase.statement || questionDataFirebase.text || "",
    alternatives: mappedAlternatives
  };

  // Filtros ativos baseados na questão atual
  const activeFilters = [
    questionData.subject ? { label: questionData.subject, active: true } : null,
    questionData.difficulty ? { 
      label: questionData.difficulty === 'easy' ? 'Fácil' : 
             questionData.difficulty === 'medium' ? 'Médio' : 'Difícil', 
      active: true 
    } : null,
    questionData.institution ? { label: questionData.institution, active: true } : null
  ].filter(Boolean);

  // Funções originais
  const handleSelectAlternative = (letter) => {
    if (isAnswered || cutAlternatives.has(letter)) return;
    
    setSelectedAnswer(letter);
    setIsAnswered(true);
    setShowActionButtons(true);
  };

  const handleCutAlternative = (letter, event) => {
    event.stopPropagation();
    const newCutAlternatives = new Set(cutAlternatives);
    
    if (newCutAlternatives.has(letter)) {
      newCutAlternatives.delete(letter);
    } else {
      newCutAlternatives.add(letter);
    }
    
    setCutAlternatives(newCutAlternatives);
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

  const getAlternativeClasses = (alternative) => {
    const baseClasses = "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group";
    
    if (cutAlternatives.has(alternative.letter)) {
      return `${baseClasses} opacity-30 border-muted bg-muted/20 line-through`;
    }
    
    if (selectedAnswer === alternative.letter) {
      return `${baseClasses} border-primary bg-primary/5`;
    }
    
    if (isAnswered) {
      if (alternative.correct) {
        return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-950/20`;
      } else if (selectedAnswer === alternative.letter) {
        return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-950/20`;
      }
    }
    
    return `${baseClasses} border-border hover:border-accent hover:bg-accent/5`;
  };

  const getAlternativeLetterClasses = (alternative) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0";
    
    if (cutAlternatives.has(alternative.letter)) {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }
    
    if (selectedAnswer === alternative.letter) {
      return `${baseClasses} bg-primary text-primary-foreground`;
    }
    
    if (isAnswered && alternative.correct) {
      return `${baseClasses} bg-green-500 text-white`;
    }
    
    if (isAnswered && selectedAnswer === alternative.letter && !alternative.correct) {
      return `${baseClasses} bg-red-500 text-white`;
    }
    
    return `${baseClasses} bg-muted text-foreground group-hover:bg-accent group-hover:text-accent-foreground`;
  };

  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="mb-6 px-4">
        <Progress value={progressPercentage} className="h-2 mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Questão {currentQuestion} de {totalQuestions}
        </p>
      </div>

      {/* Filter Chips */}
      <div className="mb-6 px-4">
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          
          {/* Question Card */}
          <div className="lg:col-span-2">
            <Card className="h-fit">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">Questão {currentQuestion}</span>
                  </div>
                  <Badge variant="outline">{listInfo.listName}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none mb-6"
                  dangerouslySetInnerHTML={{ __html: questionData.text }}
                />
                
                {/* Alternatives */}
                <div className="space-y-3">
                  {questionData.alternatives.map((alternative) => (
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
                            <div className="flex-1 bg-muted rounded-full h-1.5">
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
                        onClick={(e) => handleCutAlternative(alternative.letter, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {cutAlternatives.has(alternative.letter) ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Scissors className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            
            {/* Navigation */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextQuestion}
                    disabled={currentQuestion === totalQuestions}
                    className="flex items-center gap-2"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {showActionButtons && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Button className="w-full" variant="default">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Resumo
                    </Button>
                    <Button className="w-full" variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Comentários (15)
                    </Button>
                    <Button className="w-full" variant="outline">
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Próxima Questão
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Caderno de Erros */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-base">Caderno de Erros</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Faça suas anotações sobre esta questão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Flag className="h-4 w-4 mr-1" />
                    Marcar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Star className="h-4 w-4 mr-1" />
                    Favoritar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-1" />
                    Curtir
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Discutir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestoesResolverPage;


