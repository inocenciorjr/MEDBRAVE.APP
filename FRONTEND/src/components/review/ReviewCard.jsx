import React, { useState, useEffect } from 'react';
import FlipCard from '../ui/FlipCard';
import Tag from '../ui/Tag';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { HelpCircle } from 'lucide-react';
import FSRSTutorial from './FSRSTutorial';

/**
 * Componente para exibir um item de revisão individual
 * Suporta diferentes tipos: flashcards, questões e anotações
 */
const ReviewCard = ({ 
  item, 
  onSubmitAnswer, 
  onRevealAnswer, 
  showAnswer, 
  autoAdvance = false 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [startTime] = useState(Date.now());
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);


  // Reset quando item muda
  useEffect(() => {
    setSelectedAnswer(null);
    setUserAnswer('');
    setHasAnswered(false);

  }, [item?.id]);

  // Submeter resposta
  const handleSubmitAnswer = () => {
    if (hasAnswered) return;
    
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    let answer;
    
    switch (item.type) {
      case 'flashcard':
        answer = { timeSpent };
        break;
      case 'question':
        answer = { 
          selectedOption: selectedAnswer, 
          timeSpent,
          isCorrect: selectedAnswer === item.correctAnswer
        };
        break;
      case 'note':
        answer = { 
          userAnswer: userAnswer.trim(), 
          timeSpent 
        };
        break;
      default:
        answer = { timeSpent };
    }
    
    setHasAnswered(true);
    onSubmitAnswer(answer, timeSpent);
    
    if (!autoAdvance) {
      onRevealAnswer();
    }
  };

  // Submeter resposta FSRS
  const handleFSRSAnswer = (grade) => {
    if (!hasAnswered) {
      setHasAnswered(true);
      onRevealAnswer();
    }
    
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const answer = { 
      fsrsGrade: grade,
      timeSpent
    };
    
    onSubmitAnswer(answer, timeSpent);
  };

  // Renderizar flashcard
  const renderFlashcard = () => {
    const frontContent = (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Tag variant="outline" size="sm" className="w-fit">
            Flashcard
          </Tag>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="text-lg font-medium text-foreground" 
            dangerouslySetInnerHTML={{ 
              __html: item.front || item.frontContent || item.question || item.title || 'Conteúdo não disponível'
            }} 
          />
          {item.frontImage && (
            <img 
              src={item.frontImage} 
              alt="Imagem da pergunta" 
              className="max-w-full h-auto rounded-lg"
            />
          )}
        </CardContent>
      </Card>
    );

    const backContent = (
      <Card className="h-full bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <Tag variant="solid" color="primary" size="sm" className="w-fit">
            Resposta
          </Tag>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="text-foreground" 
            dangerouslySetInnerHTML={{ 
              __html: item.back || item.backContent || item.answer || 'Resposta não disponível'
            }} 
          />
          
          {item.backImage && (
            <img 
              src={item.backImage} 
              alt="Imagem da resposta" 
              className="max-w-full h-auto rounded-lg"
            />
          )}
          
          {item.explanation && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <Tag variant="outline" size="sm" className="mb-2">
                  Explicação
                </Tag>
                <div className="text-sm text-muted-foreground">
                  {item.explanation}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6">
        <FlipCard
          front={frontContent}
          back={backContent}
          isFlipped={showAnswer}
          className="min-h-[300px]"
        />

        {/* Botão Revelar Resposta */}
        {!hasAnswered && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSubmitAnswer}
                className="w-full"
                size="lg"
              >
                Revelar Resposta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Botões FSRS para Flashcards quando resposta revelada */}
        {showAnswer && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Como foi esta revisão?
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  title="Como usar as avaliações"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleFSRSAnswer(0)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-destructive/50 hover:bg-destructive/10"
                >
                  <span className="font-medium text-destructive">Esqueci</span>
                  <span className="text-xs text-muted-foreground">&lt; 1 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(1)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-orange-500/50 hover:bg-orange-500/10"
                >
                  <span className="font-medium text-orange-600 dark:text-orange-400">Difícil</span>
                  <span className="text-xs text-muted-foreground">&lt; 6 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(2)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-primary/50 hover:bg-primary/10"
                >
                  <span className="font-medium text-primary">Bom</span>
                  <span className="text-xs text-muted-foreground">&lt; 10 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(3)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-green-500/50 hover:bg-green-500/10"
                >
                  <span className="font-medium text-green-600 dark:text-green-400">Fácil</span>
                  <span className="text-xs text-muted-foreground">4 dias</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Renderizar questão
  const renderQuestion = () => {
    return (
      <div className="space-y-6">
        {/* Pergunta */}
        <Card>
          <CardHeader className="pb-3">
            <Tag variant="outline" size="sm" className="w-fit">
              Questão
            </Tag>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">
              {item.question}
            </h3>
            
            {item.image && (
              <img 
                src={item.image} 
                alt="Imagem da questão" 
                className="max-w-full h-auto rounded-lg"
            />
          )}

            {/* Opções */}
            {item.options && (
              <div className="space-y-3">
                {item.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
                  const isSelected = selectedAnswer === index;
                  const isCorrect = showAnswer && index === item.correctAnswer;
                  const isWrong = showAnswer && isSelected && index !== item.correctAnswer;
                  
                  return (
                    <Button
                      key={index}
                      onClick={() => !hasAnswered && setSelectedAnswer(index)}
                      disabled={hasAnswered}
                      variant="outline"
                      className={`w-full h-auto p-4 justify-start text-left transition-all ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : isWrong
                          ? 'border-destructive bg-destructive/10 hover:bg-destructive/20'
                          : isSelected
                          ? 'border-primary bg-primary/10 hover:bg-primary/20'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Badge 
                          variant={isCorrect ? 'default' : isWrong ? 'destructive' : isSelected ? 'default' : 'outline'}
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCorrect ? 'bg-green-500' : isWrong ? 'bg-destructive' : isSelected ? 'bg-primary' : ''
                          }`}
                        >
                          {optionLetter}
                        </Badge>
                        <span className="text-foreground text-left">
                          {option}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explicação (se resposta revelada) */}
        {showAnswer && item.explanation && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-3">
              <Tag variant="solid" color="primary" size="sm" className="w-fit">
                Explicação
              </Tag>
              <div className="text-foreground">
                {item.explanation}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controles */}
        {!hasAnswered && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="w-full"
                size="lg"
              >
                Confirmar Resposta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Botões FSRS para questões */}
        {hasAnswered && showAnswer && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Como foi sua performance?
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  title="Como usar as avaliações"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleFSRSAnswer(1)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-destructive/50 hover:bg-destructive/10"
                >
                  <span className="font-medium text-destructive">Novamente</span>
                  <span className="text-xs text-muted-foreground">&lt; 1 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(2)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-orange-500/50 hover:bg-orange-500/10"
                >
                  <span className="font-medium text-orange-600 dark:text-orange-400">Difícil</span>
                  <span className="text-xs text-muted-foreground">&lt; 6 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(3)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-green-500/50 hover:bg-green-500/10"
                >
                  <span className="font-medium text-green-600 dark:text-green-400">Bom</span>
                  <span className="text-xs text-muted-foreground">&lt; 10 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(4)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-primary/50 hover:bg-primary/10"
                >
                  <span className="font-medium text-primary">Fácil</span>
                  <span className="text-xs text-muted-foreground">4 dias</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Renderizar anotação
  const renderNote = () => {
    return (
      <div className="space-y-6">
        {/* Prompt */}
        <Card>
          <CardHeader className="pb-3">
            <Tag variant="outline" size="sm" className="w-fit">
              Anotação
            </Tag>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">
              {item.prompt || item.title}
            </h3>
            
            {item.content && (
              <div className="text-muted-foreground">
                {item.content}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campo de resposta */}
        {!hasAnswered && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Sua resposta:
                </label>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  className="w-full h-32 p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                />
              </div>
              
              <Button
                onClick={handleSubmitAnswer}
                disabled={userAnswer.trim().length === 0}
                className="w-full"
                size="lg"
              >
                Confirmar Resposta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resposta esperada (se revelada) */}
        {showAnswer && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <Tag variant="solid" color="primary" size="sm" className="w-fit">
                Resposta Esperada
              </Tag>
              <div className="text-foreground">
                {item.expectedAnswer || item.answer}
              </div>
              
              {userAnswer && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <Tag variant="outline" size="sm" className="w-fit">
                      Sua Resposta
                    </Tag>
                    <div className="text-sm text-muted-foreground">
                      {userAnswer}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botões FSRS para anotações */}
        {hasAnswered && showAnswer && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Como foi sua performance?
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  title="Como usar as avaliações"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleFSRSAnswer(1)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-destructive/50 hover:bg-destructive/10"
                >
                  <span className="font-medium text-destructive">Novamente</span>
                  <span className="text-xs text-muted-foreground">&lt; 1 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(2)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-orange-500/50 hover:bg-orange-500/10"
                >
                  <span className="font-medium text-orange-600 dark:text-orange-400">Difícil</span>
                  <span className="text-xs text-muted-foreground">&lt; 6 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(3)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-green-500/50 hover:bg-green-500/10"
                >
                  <span className="font-medium text-green-600 dark:text-green-400">Bom</span>
                  <span className="text-xs text-muted-foreground">&lt; 10 min</span>
                </Button>
                <Button
                  onClick={() => handleFSRSAnswer(4)}
                  variant="outline"
                  className="h-auto p-3 flex-col gap-1 border-primary/50 hover:bg-primary/10"
                >
                  <span className="font-medium text-primary">Fácil</span>
                  <span className="text-xs text-muted-foreground">4 dias</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Renderizar baseado no tipo
  const renderContent = () => {
    if (!item) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              Carregando item...
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (item.type) {
      case 'flashcard':
        return renderFlashcard();
      case 'question':
        return renderQuestion();
      case 'note':
        return renderNote();
      default:
        return (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag variant="outline" className="mb-4">
                Tipo não suportado
              </Tag>
              <div className="text-muted-foreground">
                Tipo de item não suportado: {item.type}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderContent()}
      
      {/* Tutorial FSRS */}
      <FSRSTutorial 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
    </div>
  );
};

export default ReviewCard;