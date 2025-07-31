import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, HelpCircle, Clock, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * Tutorial interativo sobre o sistema de avaliação FSRS
 * Explica como usar as tags de revisão e seu impacto nos intervalos
 */
const FSRSTutorial = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Como Funciona o Sistema de Revisão",
      icon: <Brain className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-foreground">
            Nosso sistema usa inteligência artificial para <strong>otimizar quando você deve revisar cada conteúdo</strong>, 
            baseado em como você avalia sua performance.
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm text-primary font-medium">
              💡 <strong>Dica:</strong> Seja honesto em suas avaliações! Isso ajuda o sistema a criar 
              um cronograma de estudos mais eficiente para você.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "As 4 Opções de Avaliação",
      icon: <HelpCircle className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-foreground mb-4">
            Após revisar um conteúdo, você deve escolher uma das 4 opções:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
              <Badge className="bg-destructive text-destructive-foreground">ESQUECI</Badge>
              <div>
                <p className="font-medium text-destructive">Não consegui lembrar</p>
                <p className="text-xs text-muted-foreground">Use quando esquecer completamente o conteúdo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border border-orange-300 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <Badge className="bg-orange-500 text-white">DIFÍCIL</Badge>
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">Lembrei com dificuldade</p>
                <p className="text-xs text-muted-foreground">Use quando demorar muito ou ter dúvidas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border border-green-300 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Badge className="bg-green-500 text-white">BOM</Badge>
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">Lembrei normalmente</p>
                <p className="text-xs text-muted-foreground">Use quando lembrar sem grandes dificuldades</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-lg bg-primary/5">
              <Badge className="bg-primary text-primary-foreground">FÁCIL</Badge>
              <div>
                <p className="font-medium text-primary">Lembrei facilmente</p>
                <p className="text-xs text-muted-foreground">Use quando lembrar instantaneamente</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Impacto nos Intervalos de Revisão",
      icon: <Clock className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-foreground mb-4">
            Sua avaliação determina <strong>quando você verá este conteúdo novamente</strong>:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-destructive text-destructive-foreground text-xs">ESQUECI</Badge>
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive">Revisão em poucos minutos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O conteúdo volta rapidamente para reforço
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-500 text-white text-xs">DIFÍCIL</Badge>
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Revisão em 1-3 dias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Intervalo reduzido para reforçar o aprendizado
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white text-xs">BOM</Badge>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Revisão em 4-10 dias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Intervalo padrão baseado na dificuldade do conteúdo
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary text-primary-foreground text-xs">FÁCIL</Badge>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">Revisão em 2+ semanas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Intervalo estendido para conteúdo bem dominado
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Dicas para Melhores Resultados",
      icon: <TrendingUp className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">✅ Faça assim:</h4>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                <li>• Seja honesto com sua avaliação</li>
                <li>• Use "DIFÍCIL" se demorou mais que 10 segundos para lembrar</li>
                <li>• Use "FÁCIL" apenas se lembrou instantaneamente</li>
                <li>• Revise regularmente, mesmo que seja "fácil"</li>
              </ul>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">❌ Evite:</h4>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                <li>• Marcar "FÁCIL" só para ver menos o conteúdo</li>
                <li>• Marcar "DIFÍCIL" quando na verdade foi "BOM"</li>
                <li>• Pular revisões programadas</li>
                <li>• Avaliar baseado no humor do momento</li>
              </ul>
            </div>
            
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-primary font-medium">
                🎯 <strong>Lembre-se:</strong> O objetivo é otimizar seu tempo de estudo, 
                mostrando o conteúdo na frequência ideal para sua memorização!
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTutorial = () => {
    setCurrentStep(0);
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {currentStepData.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeTutorial}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Indicador de progresso */}
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          {/* Conteúdo do passo atual */}
          <div className="min-h-[300px]">
            {currentStepData.content}
          </div>
          
          {/* Navegação */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Anterior
            </Button>
            
            <div className="flex gap-2">
              {currentStep === steps.length - 1 ? (
                <Button onClick={closeTutorial} className="px-6">
                  Entendi!
                </Button>
              ) : (
                <Button onClick={nextStep} className="px-6">
                  Próximo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FSRSTutorial;