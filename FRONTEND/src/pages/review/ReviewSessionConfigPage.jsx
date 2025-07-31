import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnifiedReview } from '../../contexts/UnifiedReviewContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { 
  Settings, 
  CreditCard, 
  HelpCircle, 
  BookOpen, 
  Clock, 
  Play, 
  ArrowLeft,
  Timer,
  Infinity,
  Shuffle,
  TrendingUp
} from 'lucide-react';

export default function ReviewSessionConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dueReviews, loading } = useUnifiedReview();
  
  // Estados para configuração da sessão
  const [selectedTypes, setSelectedTypes] = useState({
    FLASHCARD: true,
    QUESTION: true,
    ERROR_NOTEBOOK: true
  });
  
  const [quantities, setQuantities] = useState({
    FLASHCARD: 0,
    QUESTION: 0,
    ERROR_NOTEBOOK: 0
  });
  
  const [isTimedSession, setIsTimedSession] = useState(false);
  const [sessionTime, setSessionTime] = useState({
    hours: 0,
    minutes: 30,
    seconds: 0
  });
  
  // Estado para ordenação dos itens
  const [orderingMode, setOrderingMode] = useState('shuffle'); // 'shuffle' ou 'urgency'
  
  // Agrupar revisões por tipo
  const reviewsByType = {
    FLASHCARD: Array.isArray(dueReviews) ? dueReviews.filter(item => item.contentType === 'FLASHCARD') : [],
    QUESTION: Array.isArray(dueReviews) ? dueReviews.filter(item => item.contentType === 'QUESTION') : [],
    ERROR_NOTEBOOK: Array.isArray(dueReviews) ? dueReviews.filter(item => item.contentType === 'ERROR_NOTEBOOK') : []
  };
  
  // Verificar se há revisões disponíveis
  const totalReviews = Object.values(reviewsByType).reduce((sum, reviews) => sum + reviews.length, 0);
  
  // Redirecionar se não há revisões disponíveis
  useEffect(() => {
    if (!loading && totalReviews === 0) {
      navigate('/dashboard/revisoes');
    }
  }, [loading, totalReviews, navigate]);
  
  // Inicializar quantidades e tipos selecionados
  useEffect(() => {
    if (!loading && totalReviews > 0) {
      // Verificar se há tipo pré-selecionado
      const preSelectedType = sessionStorage.getItem('preSelectedType');
      
      if (preSelectedType && reviewsByType[preSelectedType]) {
        // Se há tipo pré-selecionado, selecionar apenas ele
        setSelectedTypes({
          FLASHCARD: preSelectedType === 'FLASHCARD',
          QUESTION: preSelectedType === 'QUESTION',
          ERROR_NOTEBOOK: preSelectedType === 'ERROR_NOTEBOOK'
        });
        
        setQuantities({
          FLASHCARD: preSelectedType === 'FLASHCARD' ? reviewsByType.FLASHCARD.length : 0,
          QUESTION: preSelectedType === 'QUESTION' ? reviewsByType.QUESTION.length : 0,
          ERROR_NOTEBOOK: preSelectedType === 'ERROR_NOTEBOOK' ? reviewsByType.ERROR_NOTEBOOK.length : 0
        });
        
        // Limpar o sessionStorage
        sessionStorage.removeItem('preSelectedType');
      } else {
        // Comportamento padrão: selecionar todos os tipos disponíveis
        setQuantities({
          FLASHCARD: reviewsByType.FLASHCARD.length,
          QUESTION: reviewsByType.QUESTION.length,
          ERROR_NOTEBOOK: reviewsByType.ERROR_NOTEBOOK.length
        });
      }
    }
  }, [loading, totalReviews]);
  
  // Verificar se pelo menos um tipo está selecionado
  const hasSelectedTypes = Object.values(selectedTypes).some(Boolean);
  
  // Calcular total de itens selecionados
  const totalSelectedItems = Object.keys(selectedTypes)
    .filter(type => selectedTypes[type])
    .reduce((sum, type) => sum + quantities[type], 0);
  
  const handleTypeChange = (type, checked) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: checked
    }));
    
    // Se desmarcou o tipo, zerar a quantidade
    if (!checked) {
      setQuantities(prev => ({
        ...prev,
        [type]: 0
      }));
    } else {
      // Se marcou o tipo, definir quantidade máxima disponível
      setQuantities(prev => ({
        ...prev,
        [type]: reviewsByType[type].length
      }));
    }
  };
  
  const handleQuantityChange = (type, value) => {
    const numValue = parseInt(value) || 0;
    const maxValue = reviewsByType[type].length;
    const clampedValue = Math.min(Math.max(0, numValue), maxValue);
    
    setQuantities(prev => ({
      ...prev,
      [type]: clampedValue
    }));
  };
  
  const handleTimeChange = (unit, value) => {
    const numValue = parseInt(value) || 0;
    let clampedValue;
    
    switch (unit) {
      case 'hours':
        clampedValue = Math.min(Math.max(0, numValue), 23);
        break;
      case 'minutes':
      case 'seconds':
        clampedValue = Math.min(Math.max(0, numValue), 59);
        break;
      default:
        clampedValue = numValue;
    }
    
    setSessionTime(prev => ({
      ...prev,
      [unit]: clampedValue
    }));
  };
  
  const getTotalTimeInSeconds = () => {
    return sessionTime.hours * 3600 + sessionTime.minutes * 60 + sessionTime.seconds;
  };
  
  const formatTime = (time) => {
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
    } else if (time.minutes > 0) {
      return `${time.minutes}m ${time.seconds}s`;
    } else {
      return `${time.seconds}s`;
    }
  };
  
  const handleStartSession = () => {
    // Preparar tipos selecionados no formato esperado pelo ReviewSessionPage
    const selectedTypesArray = Object.keys(selectedTypes).filter(type => selectedTypes[type]);
    
    // Calcular total de itens a serem revisados
    const totalItems = selectedTypesArray.reduce((total, type) => {
      return total + (quantities[type] || 0);
    }, 0);

    // Preparar configuração da sessão no formato esperado pelo ReviewSessionPage
    const config = {
      type: selectedTypesArray.length === 1 ? selectedTypesArray[0].toLowerCase() : 'mixed',
      selectedTypes: selectedTypesArray,
      targetReviews: totalItems,
      shuffleItems: orderingMode === 'shuffle',
      orderingMode: orderingMode,
      isTimedSession,
      timeLimit: isTimedSession ? {
        hours: parseInt(sessionTime.hours) || 0,
        minutes: parseInt(sessionTime.minutes) || 0,
        seconds: parseInt(sessionTime.seconds) || 0
      } : null,
      quantities // Manter as quantidades para referência
    };

    // Salvar configuração no sessionStorage
    sessionStorage.setItem('reviewSessionConfig', JSON.stringify(config));

    // Navegar para a página de sessão de revisão
    navigate('/dashboard/review-session');
  };
  
  const typeLabels = {
    FLASHCARD: 'Flashcards',
    QUESTION: 'Questões',
    ERROR_NOTEBOOK: 'Cadernos de Erros'
  };
  
  const typeIcons = {
    FLASHCARD: CreditCard,
    QUESTION: HelpCircle,
    ERROR_NOTEBOOK: BookOpen
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (totalReviews === 0) {
    return null; // Componente será redirecionado pelo useEffect
  }
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/revisoes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Configurar Sessão de Revisão
            </h1>
            <p className="text-muted-foreground">
              Personalize sua sessão de estudos
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seleção de tipos */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Tipos de Conteúdo</h2>
              <div className="space-y-4">
                {Object.keys(reviewsByType).map(type => {
                  const Icon = typeIcons[type];
                  const available = reviewsByType[type].length;
                  
                  return (
                    <div key={type} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={type}
                            checked={selectedTypes[type]}
                            onCheckedChange={(checked) => handleTypeChange(type, checked)}
                            disabled={available === 0}
                          />
                          <Label htmlFor={type} className="flex items-center gap-2 cursor-pointer">
                            <Icon className="w-4 h-4" />
                            {typeLabels[type]}
                          </Label>
                        </div>
                        <Badge variant={available > 0 ? "default" : "secondary"}>
                          {available} disponível{available !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      {selectedTypes[type] && available > 0 && (
                        <div className="ml-6 flex items-center gap-3">
                          <Label htmlFor={`quantity-${type}`} className="text-sm">
                            Quantidade:
                          </Label>
                          <Input
                            id={`quantity-${type}`}
                            type="number"
                            min="1"
                            max={available}
                            value={quantities[type]}
                            onChange={(e) => handleQuantityChange(type, e.target.value)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            de {available}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
            
            {/* Configuração de tempo */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Tempo da Sessão</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    <Label htmlFor="timed-session">Sessão cronometrada</Label>
                  </div>
                  <Switch
                    id="timed-session"
                    checked={isTimedSession}
                    onCheckedChange={setIsTimedSession}
                  />
                </div>
                
                {isTimedSession && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Duração da sessão:</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={sessionTime.hours}
                          onChange={(e) => handleTimeChange('hours', e.target.value)}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={sessionTime.minutes}
                          onChange={(e) => handleTimeChange('minutes', e.target.value)}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={sessionTime.seconds}
                          onChange={(e) => handleTimeChange('seconds', e.target.value)}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">s</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!isTimedSession && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Infinity className="w-4 h-4" />
                    <span className="text-sm">Sessão sem limite de tempo</span>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Configuração de ordenação */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Ordenação dos Itens</h2>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      orderingMode === 'urgency' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setOrderingMode('urgency')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        orderingMode === 'urgency' 
                          ? 'border-primary bg-primary' 
                          : 'border-border'
                      }`} />
                      <TrendingUp className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Ordem de Urgência</div>
                        <div className="text-sm text-muted-foreground">
                          Itens mais antigos primeiro (por data de vencimento)
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      orderingMode === 'shuffle' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setOrderingMode('shuffle')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        orderingMode === 'shuffle' 
                          ? 'border-primary bg-primary' 
                          : 'border-border'
                      }`} />
                      <Shuffle className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Embaralhar Itens</div>
                        <div className="text-sm text-muted-foreground">
                          Ordem aleatória dentro de cada tipo de conteúdo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Resumo da configuração */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Resumo da Sessão</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Conteúdo selecionado:</h3>
                  <div className="space-y-2">
                    {Object.keys(selectedTypes)
                      .filter(type => selectedTypes[type] && quantities[type] > 0)
                      .map(type => {
                        const Icon = typeIcons[type];
                        return (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {typeLabels[type]}
                            </div>
                            <Badge variant="outline">{quantities[type]}</Badge>
                          </div>
                        );
                      })
                    }
                  </div>
                  
                  {totalSelectedItems === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum conteúdo selecionado</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Total de itens:</h3>
                  <div className="text-2xl font-bold text-primary">{totalSelectedItems}</div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Duração:</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {isTimedSession ? formatTime(sessionTime) : 'Sem limite'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Ordenação:</h3>
                  <div className="flex items-center gap-2">
                    {orderingMode === 'urgency' ? (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Por urgência</span>
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4" />
                        <span className="text-sm">Embaralhado</span>
                      </>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <Button
                  onClick={handleStartSession}
                  disabled={!hasSelectedTypes || totalSelectedItems === 0}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Sessão
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}