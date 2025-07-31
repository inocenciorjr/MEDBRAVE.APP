import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedReview } from '../../contexts/UnifiedReviewContext';
import { formatDateWithLabels, parseFirestoreDate, formatTime, formatDate } from '../../utils/dateUtils';
import { GoalCard } from '../../components/GoalCard';
import { AlertCenter } from '../../components/AlertCenter';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Calendar, CheckCircle, Eye, CreditCard, HelpCircle, BookOpen, Target, Rocket, List, CalendarDays } from 'lucide-react';
import FSRSTutorial from '../../components/review/FSRSTutorial';
import RescheduleReviewsModal from '../../components/review/RescheduleReviewsModal';
import useSelectiveRefresh from '../../hooks/useSelectiveRefresh';

// Página Central de Revisões – 100 % PT-BR acessível
// Rota prevista: /dashboard/revisoes (já usada na navegação existente)

export default function RevisoesPage() {
  const navigate = useNavigate();
  const {
    dueReviews: itens,
    completedReviews: itensRevisaoCompletadas,
    futureReviews: itensRevisaoFuturas,
    loading: carregando,
    error,
    loadAllReviews,
    refresh
  } = useUnifiedReview();
  
  // Estados removidos - agora vêm diretamente do contexto
  const [filtro, setFiltro] = useState('TODOS');
  const [tiposSelecionados, setTiposSelecionados] = useState({
    FLASHCARD: true,
    QUESTION: true,
    ERROR_NOTEBOOK: true
  });
  const [abaPrincipal, setAbaPrincipal] = useState('hoje');
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedFlashcard, setExpandedFlashcard] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Garantir que itens seja sempre um array
  const itensArray = Array.isArray(itens) ? itens : [];
  
  // Debug: verificar o que está sendo recebido
  console.log('RevisoesPage - Debug:', {
    itens,
    itensArray,
    itensArrayLength: itensArray.length,
    carregando,
    error,
    itensRevisaoCompletadas,
    itensRevisaoFuturas
  });

  // Carregar dados iniciais quando o componente for montado
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('📋 [RevisoesPage] Carregando todas as revisões...');
        await loadAllReviews();
      } catch (error) {
        console.error('❌ [RevisoesPage] Erro ao carregar todas as revisões:', error);
      }
    };

    loadInitialData();
  }, [loadAllReviews]);

  // ✅ CORREÇÃO: Dados agora vêm diretamente do contexto UnifiedReview
  // Não é mais necessário carregar dados adicionais
  
  // Refresh seletivo - só atualiza quando navegar para esta página
  useSelectiveRefresh(() => {
    loadAllReviews();
  }, 'revisoes');
  
  const filtrosDisponiveis = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'FLASHCARD', label: 'Flashcards' },
    { id: 'QUESTION', label: 'Questões' },
    { id: 'ERROR_NOTEBOOK', label: 'Anotações' },
  ];

  // Filtrar itens pendentes (incluindo revisões antigas)
  const itensFiltrados = Array.isArray(itens)
    ? (filtro === 'TODOS' ? itens : itens.filter((i) => i.contentType === filtro))
    : [];
  
  // Incluir revisões antigas pendentes na aba "hoje" (agora "pendentes")
  const itensComAntigos = [...itensFiltrados];
  
  // Verificar se há revisões antigas (anteriores a hoje)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const itensAntigos = itensComAntigos.filter(item => {
    if (!item.due) return false;
    try {
      let dueDate;
      if (item.due.toDate && typeof item.due.toDate === 'function') {
        dueDate = item.due.toDate();
      } else if (item.due.seconds) {
        dueDate = new Date(item.due.seconds * 1000);
      } else if (typeof item.due === 'string') {
        dueDate = new Date(item.due);
      } else if (typeof item.due === 'number') {
        dueDate = item.due > 1000000000000 ? new Date(item.due) : new Date(item.due * 1000);
      } else {
        dueDate = new Date(item.due);
      }
      
      if (isNaN(dueDate.getTime())) return false;
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < hoje;
    } catch (e) {
      return false;
    }
  });

  // Agrupar itens por tipo
  const itensAgrupados = {
    FLASHCARD: itensArray.filter(item => item.contentType === 'FLASHCARD'),
    QUESTION: itensArray.filter(item => item.contentType === 'QUESTION'),
    ERROR_NOTEBOOK: itensArray.filter(item => item.contentType === 'ERROR_NOTEBOOK')
  };

  const handleTipoChange = (tipo, checked) => {
    setTiposSelecionados(prev => ({
      ...prev,
      [tipo]: checked
    }));
  };

  const iniciarRevisao = () => {
    // Redirecionar para a página de configuração da sessão
    navigate('/dashboard/review-session/config');
  };
  
  const iniciarRevisaoTipo = (tipo) => {
    // Para revisão de tipo específico, também vai para configuração
    // mas com o tipo pré-selecionado via sessionStorage
    sessionStorage.setItem('preSelectedType', tipo);
    navigate('/dashboard/review-session/config');
  };
  
  const iniciarRevisaoItem = (item) => {
    console.log('Iniciando revisão do item:', item);
    
    // Para todos os tipos de item, usar a sessão de revisão unificada
    navigate(`/dashboard/review-session?itemId=${item.id}&type=${item.contentType}`);
    
    // Disparar evento para atualizar a página no App.jsx
    window.dispatchEvent(new CustomEvent('navigateToPage', {
      detail: { page: 'review-session', params: { itemId: item.id, type: item.contentType } }
    }));
  };

  const handleRescheduleSuccess = () => {
    // Recarregar os dados após reagendamento
    refresh(); // Atualizar dados do contexto
    setShowRescheduleModal(false);
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando suas revisões...</div>;
  }

  return (
    <div className="w-full max-w-none px-6 py-6 space-y-8">
      {/* Cabeçalho */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 text-foreground">
              <Calendar className="w-8 h-8" />
              Revisões Inteligentes
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize seus estudos por tipo de conteúdo com o algoritmo FSRS
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2"
            title="Como usar as avaliações FSRS"
          >
            <HelpCircle className="w-4 h-4" />
            Como usar FSRS
          </Button>
        </div>
      </header>

      <Tabs value={abaPrincipal} onValueChange={setAbaPrincipal} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hoje" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="completadas" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completadas
          </TabsTrigger>
          <TabsTrigger value="futuras" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Futuras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-6">
          {/* Cabeçalho da aba Pendentes com botão de reagendamento */}
          {itensArray.length > 0 && (
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Revisões Pendentes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRescheduleModal(true)}
                className="flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Reagendar Revisões
              </Button>
            </div>
          )}
          {/* Resumo por grupos */}
          {itensArray.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
              {/* Flashcards */}
              <Card className="p-6 h-[240px] w-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Flashcards
                    </h3>
                    <span className="text-2xl font-bold text-primary">
                      {itensAgrupados.FLASHCARD.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itensAgrupados.FLASHCARD.length > 0 
                      ? `${itensAgrupados.FLASHCARD.length} flashcards para revisar`
                      : 'Nenhum flashcard pendente'}
                  </p>
                </div>
                {itensAgrupados.FLASHCARD.length > 0 && (
                  <Button 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => iniciarRevisaoTipo('FLASHCARD')}
                  >
                    Revisar Flashcards
                  </Button>
                )}
              </Card>

              {/* Questões */}
              <Card className="p-6 h-[240px] w-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      Questões
                    </h3>
                    <span className="text-2xl font-bold text-primary">
                      {itensAgrupados.QUESTION.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itensAgrupados.QUESTION.length > 0 
                      ? `${itensAgrupados.QUESTION.length} questões para revisar`
                      : 'Nenhuma questão pendente'}
                  </p>
                </div>
                {itensAgrupados.QUESTION.length > 0 && (
                  <Button 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => iniciarRevisaoTipo('QUESTION')}
                  >
                    Revisar Questões
                  </Button>
                )}
              </Card>

              {/* Cadernos de Erros */}
              <Card className="p-6 h-[240px] w-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Cadernos de Erros
                    </h3>
                    <span className="text-2xl font-bold text-primary">
                      {itensAgrupados.ERROR_NOTEBOOK.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itensAgrupados.ERROR_NOTEBOOK.length > 0 
                      ? `${itensAgrupados.ERROR_NOTEBOOK.length} anotações para revisar`
                      : 'Nenhuma anotação pendente'}
                  </p>
                </div>
                {itensAgrupados.ERROR_NOTEBOOK.length > 0 && (
                  <Button 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => iniciarRevisaoTipo('ERROR_NOTEBOOK')}
                  >
                    Revisar Anotações
                  </Button>
                )}
              </Card>
            </div>
          )}

          {/* Seleção personalizada */}
          {itensArray.length > 0 && (
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Revisão Personalizada
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="flashcards"
                    checked={tiposSelecionados.FLASHCARD}
                    onCheckedChange={(checked) => handleTipoChange('FLASHCARD', checked)}
                  />
                  <label htmlFor="flashcards" className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Flashcards ({itensAgrupados.FLASHCARD.length})
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="questions"
                    checked={tiposSelecionados.QUESTION}
                    onCheckedChange={(checked) => handleTipoChange('QUESTION', checked)}
                  />
                  <label htmlFor="questions" className="text-sm font-medium flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Questões ({itensAgrupados.QUESTION.length})
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="errors"
                    checked={tiposSelecionados.ERROR_NOTEBOOK}
                    onCheckedChange={(checked) => handleTipoChange('ERROR_NOTEBOOK', checked)}
                  />
                  <label htmlFor="errors" className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Cadernos de Erros ({itensAgrupados.ERROR_NOTEBOOK.length})
                  </label>
                </div>
              </div>
              <Button 
                onClick={iniciarRevisao}
                className="w-full"
                disabled={!Object.values(tiposSelecionados).some(Boolean)}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Iniciar Revisão Selecionada
              </Button>
            </Card>
          )}

          {/* Lista detalhada */}
          {itensArray.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              </div>
              <p className="text-lg font-medium">
                Parabéns! Você está em dia
              </p>
              <p className="text-sm text-muted-foreground">
                Nenhum item pendente para hoje. Aproveite para descansar ou revisar
                conteúdos extras.
              </p>
            </Card>
          ) : (
            <Card className="p-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <List className="w-5 h-5" />
                Lista Detalhada
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {filtrosDisponiveis.map((f) => (
                  <Button
                    key={f.id}
                    variant={filtro === f.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              <ul className="space-y-3">
                {itensFiltrados.map((item) => {
                  const isOverdue = new Date(item.due) < new Date();
                  const lastReviewText = item.last_review 
                    ? `Última revisão: ${formatDate(item.last_review)} às ${formatTime(item.last_review)}`
                    : 'Nunca revisado';
                  
                  return (
                    <li key={item.id} className="p-4 rounded-lg flex justify-between items-center transition hover:shadow-md border">
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2 text-foreground">
                          {item.contentType === 'FLASHCARD' ? <CreditCard className="w-4 h-4" /> : 
                           item.contentType === 'QUESTION' ? <HelpCircle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />} 
                          {item.title || 'Conteúdo sem título'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {item.subtitle || '—'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                            {lastReviewText} - {isOverdue ? 'REVISÃO PENDENTE' : 'AGENDADA'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => iniciarRevisaoItem(item)}
                      >
                        Revisar
                      </Button>
                    </li>
                  );
                })}
              </ul>
               
               {itensRevisaoFuturas.length === 0 && (
                 <div className="text-center py-8 text-muted-foreground">
                   <p>Nenhuma revisão futura encontrada.</p>
                 </div>
               )}
             </Card>
          )}
        </TabsContent>

        <TabsContent value="completadas" className="space-y-6">
          {itensRevisaoCompletadas.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              </div>
              <p className="text-lg font-medium">Nenhuma revisão completada</p>
              <p className="text-sm text-muted-foreground">
                Suas revisões concluídas aparecerão aqui
              </p>
            </Card>
          ) : (
            <Card className="p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Revisões Completadas ({itensRevisaoCompletadas.length})
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    Ordenar
                  </Button>
                </div>
              </div>
              
              {/* Agrupamento por data */}
              <div className="space-y-4">
                {Object.entries(
                  itensRevisaoCompletadas.reduce((groups, item) => {
                    // Usar função utilitária para tratar datas do Firestore
                    const rawDate = item.last_review || item.completed_at || item.reviewedAt || item.completedAt;
                    const dateValue = parseFirestoreDate(rawDate);
                    const date = formatDate(dateValue);
                    if (!groups[date]) {
                      groups[date] = {
                        flashcards: [],
                        questions: [],
                        notebooks: [],
                        originalDate: dateValue // Armazenar a data original
                      };
                    }
                    
                    if (item.contentType === 'FLASHCARD') {
                      groups[date].flashcards.push(item);
                    } else if (item.contentType === 'QUESTION') {
                      groups[date].questions.push(item);
                    } else {
                      groups[date].notebooks.push(item);
                    }
                    
                    return groups;
                  }, {})
                )
                .sort(([dateA], [dateB]) => {
                  const [dayA, monthA, yearA] = dateA.split('/');
                  const [dayB, monthB, yearB] = dateB.split('/');
                  return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA); // Ordem decrescente
                })
                .map(([date, items]) => {
                  const totalItems = items.flashcards.length + items.questions.length + items.notebooks.length;
                  return (
                     <div key={date} className="border rounded-lg p-4 cursor-pointer transition hover:shadow-md"
                     onClick={() => setSelectedDate(selectedDate === date ? null : date)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg text-foreground">
                            {formatDateWithLabels(items.originalDate)}
                          </h4>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {items.flashcards.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {items.flashcards.length} flashcard{items.flashcards.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {items.questions.length > 0 && (
                              <span className="flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                {items.questions.length} questõe{items.questions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {items.notebooks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {items.notebooks.length} caderno{items.notebooks.length !== 1 ? 's' : ''} de erros
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline">
                             {totalItems} concluída{totalItems !== 1 ? 's' : ''}
                           </Badge>
                           <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                             selectedDate === date ? 'rotate-180' : ''
                           }`} />
                         </div>
                      </div>
                      
                      {/* Detalhes expandidos */}
                       {selectedDate === date && (
                         <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Flashcards */}
                        {items.flashcards.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <CreditCard className="w-4 h-4" />
                              💳 Flashcards ({items.flashcards.length})
                            </h5>
                            <div className="space-y-2">
                              {items.flashcards.map((item) => (
                                <Card key={item.id}>
                                  <div 
                                    className="flex justify-between items-center p-3 cursor-pointer transition-colors"
                                    onClick={() => setExpandedFlashcard(expandedFlashcard === item.id ? null : item.id)}
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.title || 'Flashcard sem título'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.subtitle || '—'} • Completada em {(() => {
                                          const rawDate = item.last_review || item.completed_at || item.reviewedAt || item.completedAt;
                                          if (!rawDate) return 'Data não disponível';
                                          
                                          try {
                                            let dateValue;
                                            if (rawDate.toDate && typeof rawDate.toDate === 'function') {
                                              dateValue = rawDate.toDate();
                                            } else if (rawDate.seconds && typeof rawDate.seconds === 'number') {
                                              dateValue = new Date(rawDate.seconds * 1000);
                                            } else if (rawDate._seconds && typeof rawDate._seconds === 'number') {
                                              dateValue = new Date(rawDate._seconds * 1000);
                                            } else if (typeof rawDate === 'string') {
                                              dateValue = new Date(rawDate);
                                            } else if (typeof rawDate === 'number') {
                                              dateValue = rawDate > 1000000000000 ? new Date(rawDate) : new Date(rawDate * 1000);
                                            } else if (rawDate instanceof Date) {
                                              dateValue = rawDate;
                                            } else {
                                              return 'Data não disponível';
                                            }
                                            
                                            if (isNaN(dateValue.getTime())) {
                                              return 'Data inválida';
                                            }
                                            
                                            return `${dateValue.toLocaleDateString('pt-BR')} às ${dateValue.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                          } catch (e) {
                                            return 'Erro na data';
                                          }
                                        })()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Concluída
                                      </Badge>
                                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                                        expandedFlashcard === item.id ? 'rotate-180' : ''
                                      }`} />
                                    </div>
                                  </div>
                                  
                                  {/* Detalhes expandidos do flashcard */}
                                  {expandedFlashcard === item.id && (
                                    <div className="px-3 pb-3 border-t">
                                      <div className="mt-3 space-y-3">
                                        {/* Resposta do flashcard */}
                                        <Card className="p-3">
                                          <h6 className="text-xs font-semibold text-muted-foreground mb-2">RESPOSTA</h6>
                                          <div 
                                            className="text-sm text-foreground"
                                            dangerouslySetInnerHTML={{
                                              __html: item.answer || item.back || 'Resposta não disponível'
                                            }}
                                          />
                                        </Card>
                                        
                                        {/* Informações FSRS */}
                                        <div className="grid grid-cols-2 gap-3">
                                          <Card className="p-3">
                                            <h6 className="text-xs font-semibold text-muted-foreground mb-1">PRÓXIMA REVISÃO</h6>
                                            <p className="text-sm font-medium text-primary">
                                              {(() => {
                                                // Verificar múltiplas fontes de data
                                                const dueValue = item.due || item.nextReviewAt || item.next_review || item.dueDate || item.scheduledFor || item.reviewDate;
                                                
                                                if (!dueValue) {
                                                  return 'Não agendada';
                                                }
                                                
                                                try {
                                                  let dueDate;
                                                  
                                                  // Tratar diferentes formatos de data do Firestore
                                                  if (dueValue.toDate && typeof dueValue.toDate === 'function') {
                                                    // Timestamp do Firestore
                                                    dueDate = dueValue.toDate();
                                                  } else if (dueValue.seconds && typeof dueValue.seconds === 'number') {
                                                    // Timestamp com propriedade seconds
                                                    dueDate = new Date(dueValue.seconds * 1000);
                                                  } else if (dueValue._seconds && typeof dueValue._seconds === 'number') {
                                                    // Timestamp com propriedade _seconds
                                                    dueDate = new Date(dueValue._seconds * 1000);
                                                  } else if (typeof dueValue === 'string') {
                                                    // String de data
                                                    dueDate = new Date(dueValue);
                                                  } else if (typeof dueValue === 'number') {
                                                    // Timestamp numérico (verificar se está em ms ou s)
                                                    dueDate = dueValue > 1000000000000 ? new Date(dueValue) : new Date(dueValue * 1000);
                                                  } else if (dueValue instanceof Date) {
                                                    // Objeto Date
                                                    dueDate = dueValue;
                                                  } else {
                                                    console.warn('Formato de data não reconhecido:', dueValue, 'para item:', item);
                                                    return 'Formato inválido';
                                                  }
                                                  
                                                  if (isNaN(dueDate.getTime())) {
                                                    console.warn('Data inválida após conversão:', dueDate, 'valor original:', dueValue, 'item:', item);
                                                    return 'Data inválida';
                                                  }
                                                  return dueDate.toLocaleDateString('pt-BR');
                                                } catch (e) {
                                                  console.warn('Erro ao processar data:', e, item);
                                                  return 'Erro na data';
                                                }
                                              })()
                                            }
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {(() => {
                                                const dueValue = item.due || item.nextReviewAt || item.next_review || item.dueDate || item.scheduledFor || item.reviewDate;
                                                if (!dueValue) return '';
                                                
                                                try {
                                                  let dueDate;
                                                  
                                                  if (dueValue.toDate && typeof dueValue.toDate === 'function') {
                                                    dueDate = dueValue.toDate();
                                                  } else if (dueValue.seconds && typeof dueValue.seconds === 'number') {
                                                    dueDate = new Date(dueValue.seconds * 1000);
                                                  } else if (dueValue._seconds && typeof dueValue._seconds === 'number') {
                                                    dueDate = new Date(dueValue._seconds * 1000);
                                                  } else if (typeof dueValue === 'string') {
                                                    dueDate = new Date(dueValue);
                                                  } else if (typeof dueValue === 'number') {
                                                    dueDate = dueValue > 1000000000000 ? new Date(dueValue) : new Date(dueValue * 1000);
                                                  } else if (dueValue instanceof Date) {
                                                    dueDate = dueValue;
                                                  } else {
                                                    return '';
                                                  }
                                                  
                                                  if (isNaN(dueDate.getTime())) return '';
                                                  const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                                                  if (diffDays === 0) return 'Hoje';
                                                  if (diffDays === 1) return 'Amanhã';
                                                  if (diffDays === -1) return 'Ontem';
                                                  if (diffDays > 0) return `Em ${diffDays} dias`;
                                                  return `${Math.abs(diffDays)} dias atrás`;
                                                } catch (e) {
                                                  return '';
                                                }
                                              })()
                                            }
                                            </p>
                                          </Card>
                                          
                                          <Card className="p-3">
                                            <h6 className="text-xs font-semibold text-muted-foreground mb-1">PROGRESSO</h6>
                                            <p className="text-sm font-medium text-primary">
                                              {(() => {
                                                const reps = typeof item.reps === 'number' ? item.reps : 0;
                                                if (reps === 0) return 'Novo card';
                                                if (reps === 1) return '1ª revisão';
                                                return `${reps}ª revisão`;
                                              })()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Quantas vezes você estudou</p>
                                          </Card>
                                          
                                          <Card className="p-3">
                                            <h6 className="text-xs font-semibold text-muted-foreground mb-1">FACILIDADE</h6>
                                            <p className="text-sm font-medium text-primary">
                                              {(() => {
                                                if (typeof item.difficulty !== 'number' || isNaN(item.difficulty)) {
                                                  return 'Calculando...';
                                                }
                                                const difficulty = item.difficulty;
                                                if (difficulty <= 3) return 'Fácil';
                                                if (difficulty <= 6) return 'Médio';
                                                return 'Difícil';
                                              })()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">O quão difícil é para você</p>
                                          </Card>
                                          
                                          <Card className="p-3">
                                            <h6 className="text-xs font-semibold text-muted-foreground mb-1">INTERVALO</h6>
                                            <p className="text-sm font-medium text-primary">
                                              {(() => {
                                                if (typeof item.stability !== 'number' || isNaN(item.stability)) {
                                                  return 'Calculando...';
                                                }
                                                const days = Math.round(item.stability);
                                                if (days < 1) return 'Menos de 1 dia';
                                                if (days === 1) return '1 dia';
                                                if (days < 30) return `${days} dias`;
                                                if (days < 365) return `${Math.round(days/30)} meses`;
                                                return `${Math.round(days/365)} anos`;
                                              })()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Tempo ideal entre revisões</p>
                                          </Card>
                                        </div>
                                        
                                        {/* Status e Desempenho */}
                                        <Card className="p-3">
                                          <h6 className="text-xs font-semibold text-muted-foreground mb-2">SEU DESEMPENHO</h6>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-muted-foreground">Status atual:</span>
                                              <span className="text-xs font-medium">
                                                {(() => {
                                                  // Lógica melhorada baseada em dados reais do algoritmo
                                                  const reps = typeof item.reps === 'number' ? item.reps : 0;
                                                  const lapses = typeof item.lapses === 'number' ? item.lapses : 0;
                                                  const stability = typeof item.stability === 'number' ? item.stability : 0;
                                                  
                                                  // Se nunca foi estudado
                                                  if (reps === 0) {
                                                    return 'Nunca estudado';
                                                  }
                                                  
                                                  // Se tem muitos lapses em relação às repetições
                                                  if (lapses > 0 && lapses >= reps * 0.4) {
                                                    return 'Reforçando';
                                                  }
                                                  
                                                  // Se tem estabilidade baixa (menos de 7 dias)
                                                  if (stability < 7) {
                                                    return 'Aprendendo';
                                                  }
                                                  
                                                  // Se tem boa estabilidade e poucas falhas
                                                  if (stability >= 7 && lapses <= reps * 0.2) {
                                                    return 'Dominado';
                                                  }
                                                  
                                                  // Fallback para o estado original se disponível
                                                  if (typeof item.state === 'string') {
                                                    return item.state === 'NEW' ? 'Nunca estudado' : 
                                                           item.state === 'LEARNING' ? 'Aprendendo' : 
                                                           item.state === 'REVIEW' ? 'Dominado' : 
                                                           item.state === 'RELEARNING' ? 'Reforçando' : item.state;
                                                  }
                                                  if (typeof item.state === 'number') {
                                                    return item.state === 0 ? 'Nunca estudado' : 
                                                           item.state === 1 ? 'Aprendendo' : 
                                                           item.state === 2 ? 'Dominado' : 
                                                           item.state === 3 ? 'Reforçando' : 'Status desconhecido';
                                                  }
                                                  
                                                  return 'Aprendendo';
                                                })()
                                              }
                                              </span>
                                            </div>
                                            {(typeof item.lapses === 'number' && item.lapses > 0) && (
                                              <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Vezes que esqueceu:</span>
                                                <Badge variant="destructive" className="text-xs">{item.lapses}x</Badge>
                                              </div>
                                            )}
                                            <div className="mt-2 p-2 rounded text-xs text-foreground">
                                              <strong>Dica:</strong> {(() => {
                                                const reps = typeof item.reps === 'number' ? item.reps : 0;
                                                const lapses = typeof item.lapses === 'number' ? item.lapses : 0;
                                                
                                                if (reps === 0) return 'Este é um card novo. Estude com atenção!';
                                                if (lapses > reps * 0.5) return 'Você tem esquecido bastante. Tente criar associações ou mnemônicos.';
                                                if (lapses === 0 && reps > 3) return 'Excelente! Você está dominando este conteúdo.';
                                                return 'Continue praticando para fortalecer sua memória.';
                                              })()}
                                            </div>
                                          </div>
                                        </Card>
                                      </div>
                                    </div>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Questões */}
                        {items.questions.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <HelpCircle className="w-4 h-4" />
                              Questões ({items.questions.length})
                            </h5>
                            <div className="space-y-2">
                              {items.questions.map((item) => (
                                <Card key={item.id} className="flex justify-between items-center p-3">
                                  <div>
                                    <p className="text-sm font-medium">{item.title || 'Questão sem título'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.subtitle || '—'} • Completada em {item.last_review ? `${formatDate(item.last_review)} às ${formatTime(item.last_review)}` : 'Data não disponível'}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Concluída
                                  </Badge>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Cadernos de Erros */}
                        {items.notebooks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <BookOpen className="w-4 h-4" />
                              Cadernos de Erros ({items.notebooks.length})
                            </h5>
                            <div className="space-y-2">
                              {items.notebooks.map((item) => (
                                <Card key={item.id} className="flex justify-between items-center p-3">
                                  <div>
                                    <p className="text-sm font-medium">{item.title || 'Caderno sem título'}</p>
                                    <p className="text-xs text-muted-foreground">
                                       {item.subtitle || '—'} • Completada em {(() => {
                                          const rawDate = item.last_review || item.completed_at || item.reviewedAt || item.completedAt;
                                          if (!rawDate) return 'Data não disponível';
                                          
                                          try {
                                            let dateValue;
                                            if (rawDate.toDate && typeof rawDate.toDate === 'function') {
                                              dateValue = rawDate.toDate();
                                            } else if (rawDate.seconds && typeof rawDate.seconds === 'number') {
                                              dateValue = new Date(rawDate.seconds * 1000);
                                            } else if (rawDate._seconds && typeof rawDate._seconds === 'number') {
                                              dateValue = new Date(rawDate._seconds * 1000);
                                            } else if (typeof rawDate === 'string') {
                                              dateValue = new Date(rawDate);
                                            } else if (typeof rawDate === 'number') {
                                              dateValue = rawDate > 1000000000000 ? new Date(rawDate) : new Date(rawDate * 1000);
                                            } else if (rawDate instanceof Date) {
                                              dateValue = rawDate;
                                            } else {
                                              return 'Data não disponível';
                                            }
                                            
                                            if (isNaN(dateValue.getTime())) {
                                              return 'Data inválida';
                                            }
                                            
                                            return `${dateValue.toLocaleDateString('pt-BR')} às ${dateValue.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                          } catch (e) {
                                            return 'Erro na data';
                                          }
                                        })()}
                                     </p>
                                   </div>
                                   <Badge variant="outline" className="text-xs">
                                     <CheckCircle className="w-3 h-3 mr-1" />
                                     Concluída
                                   </Badge>
                                </Card>
                              ))}
                            </div>
                          </div>
                         )}
                         </div>
                       )}
                     </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="futuras" className="space-y-6">
          {itensRevisaoFuturas.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mb-4">
                <Eye className="w-16 h-16 mx-auto text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhuma revisão futura agendada</p>
              <p className="text-sm text-muted-foreground">
                Suas próximas revisões aparecerão aqui
              </p>
            </Card>
          ) : (
            <Card className="p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Revisões Futuras ({itensRevisaoFuturas.length})
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    Ordenar
                  </Button>
                </div>
              </div>
              
              {/* Agrupamento por data */}
              <div className="space-y-4">
                {Object.entries(
                  itensRevisaoFuturas.reduce((groups, item) => {
                    let date;
                    try {
                      // Verificar múltiplas fontes de data da próxima revisão
                      const dueValue = item.due || item.nextReviewAt || item.next_review || item.dueDate || item.scheduledFor || item.reviewDate;
                      
                      if (!dueValue) {
                        date = 'Não agendada';
                      } else {
                        let dueDate;
                        
                        // Tratar diferentes formatos de data do Firestore
                        if (dueValue.toDate && typeof dueValue.toDate === 'function') {
                          // Firestore Timestamp
                          dueDate = dueValue.toDate();
                        } else if (dueValue.seconds && typeof dueValue.seconds === 'number') {
                          // Firestore Timestamp como objeto
                          dueDate = new Date(dueValue.seconds * 1000);
                        } else if (dueValue._seconds && typeof dueValue._seconds === 'number') {
                          // Firestore Timestamp serializado
                          dueDate = new Date(dueValue._seconds * 1000);
                        } else if (typeof dueValue === 'string') {
                          // String de data
                          dueDate = new Date(dueValue);
                        } else if (typeof dueValue === 'number') {
                          // Timestamp em milissegundos ou segundos
                          dueDate = dueValue > 1000000000000 ? new Date(dueValue) : new Date(dueValue * 1000);
                        } else if (dueValue instanceof Date) {
                          // Objeto Date
                          dueDate = dueValue;
                        } else {
                          console.warn('Formato de data não reconhecido:', dueValue, 'para item:', item);
                          date = 'Formato inválido';
                          return groups;
                        }
                        
                        if (isNaN(dueDate.getTime())) {
                          console.warn('Data inválida após conversão:', dueDate, 'valor original:', dueValue, 'item:', item);
                          date = 'Data inválida';
                        } else {
                          date = dueDate.toLocaleDateString('pt-BR');
                        }
                      }
                    } catch (error) {
                      console.warn('Erro ao processar data futura:', error, 'item:', item);
                      date = 'Erro na data';
                    }
                    
                    if (!groups[date]) {
                      groups[date] = {
                        flashcards: [],
                        questions: [],
                        notebooks: []
                      };
                    }
                    
                    if (item.contentType === 'FLASHCARD') {
                      groups[date].flashcards.push(item);
                    } else if (item.contentType === 'QUESTION') {
                      groups[date].questions.push(item);
                    } else {
                      groups[date].notebooks.push(item);
                    }
                    
                    return groups;
                  }, {})
                )
                .sort(([dateA], [dateB]) => {
                  // Colocar datas inválidas no final
                  if (dateA === 'Data inválida' && dateB !== 'Data inválida') return 1;
                  if (dateB === 'Data inválida' && dateA !== 'Data inválida') return -1;
                  if (dateA === 'Data inválida' && dateB === 'Data inválida') return 0;
                  
                  try {
                    const [dayA, monthA, yearA] = dateA.split('/');
                    const [dayB, monthB, yearB] = dateB.split('/');
                    const dateObjA = new Date(yearA, monthA - 1, dayA);
                    const dateObjB = new Date(yearB, monthB - 1, dayB);
                    
                    if (isNaN(dateObjA.getTime()) || isNaN(dateObjB.getTime())) {
                      return dateA.localeCompare(dateB);
                    }
                    
                    return dateObjA - dateObjB;
                  } catch (error) {
                    return dateA.localeCompare(dateB);
                  }
                })
                .map(([date, items]) => {
                  const totalItems = items.flashcards.length + items.questions.length + items.notebooks.length;
                  const isToday = date === formatDate(new Date());
                  let isPast = false;
                  
                  if (date !== 'Data inválida') {
                    try {
                      const [day, month, year] = date.split('/');
                      const dateObj = new Date(year, month - 1, day);
                      if (!isNaN(dateObj.getTime())) {
                        isPast = dateObj < new Date().setHours(0,0,0,0);
                      }
                    } catch (error) {
                      isPast = false;
                    }
                  }
                  
                  return (
                     <div key={date} className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${
                       isPast ? 'border-red-200 bg-red-50' : 
                       isToday ? 'border-blue-200 bg-blue-50' : 
                       'border-gray-200 hover:border-gray-300'
                     }`}
                     onClick={() => setSelectedDate(selectedDate === date ? null : date)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg text-foreground">
                            {isToday ? 'Hoje' : date}
                            {isPast && <span className="ml-2 text-red-600 text-sm font-normal">ATRASADO</span>}
                          </h4>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {items.flashcards.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {items.flashcards.length} flashcard{items.flashcards.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {items.questions.length > 0 && (
                              <span className="flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                {items.questions.length} questõe{items.questions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {items.notebooks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {items.notebooks.length} caderno{items.notebooks.length !== 1 ? 's' : ''} de erros
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-muted-foreground">
                             {totalItems} ite{totalItems !== 1 ? 'ns' : 'm'}
                           </span>
                           <ChevronDownIcon className={`h-4 w-4 transition-transform ${
                             selectedDate === date ? 'rotate-180' : ''
                           }`} />
                         </div>
                      </div>
                      
                      {/* Detalhes expandidos */}
                       {selectedDate === date && (
                         <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Flashcards */}
                        {items.flashcards.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <CreditCard className="w-4 h-4" />
                              Flashcards ({items.flashcards.length})
                            </h5>
                            <div className="space-y-2">
                              {items.flashcards.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-2 rounded border">
                                  <div>
                                    <p className="text-sm font-medium">{item.title || 'Flashcard sem título'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(() => {
                                        const lastReviewValue = item.last_review || item.lastReviewedAt || item.reviewed_at;
                                        if (!lastReviewValue) return 'Nunca revisado';
                                        
                                        const reviewDate = parseFirestoreDate(lastReviewValue);
                                        return `Última revisão: ${formatDate(reviewDate)} às ${formatTime(reviewDate)}`;
                                      })()}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline">Revisar</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Questões */}
                        {items.questions.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <HelpCircle className="w-4 h-4" />
                              Questões ({items.questions.length})
                            </h5>
                            <div className="space-y-2">
                              {items.questions.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-2 rounded border">
                                  <div>
                                    <p className="text-sm font-medium">{item.title || 'Questão sem título'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(() => {
                                        const lastReviewValue = item.last_review || item.lastReviewedAt || item.reviewed_at;
                                        if (!lastReviewValue) return 'Nunca revisado';
                                        
                                        try {
                                          let reviewDate;
                                          
                                          if (lastReviewValue.toDate && typeof lastReviewValue.toDate === 'function') {
                                            reviewDate = lastReviewValue.toDate();
                                          } else if (lastReviewValue.seconds && typeof lastReviewValue.seconds === 'number') {
                                            reviewDate = new Date(lastReviewValue.seconds * 1000);
                                          } else if (typeof lastReviewValue === 'string' || typeof lastReviewValue === 'number') {
                                            reviewDate = new Date(lastReviewValue);
                                          } else if (lastReviewValue instanceof Date) {
                                            reviewDate = lastReviewValue;
                                          } else {
                                            return 'Formato inválido';
                                          }
                                          
                                          if (isNaN(reviewDate.getTime())) return 'Data inválida';
                                          return `Última revisão: ${reviewDate.toLocaleDateString('pt-BR')} às ${reviewDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                        } catch (error) {
                                          console.warn('Erro ao processar data de revisão:', error, item);
                                          return 'Erro na data';
                                        }
                                      })()}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline">Revisar</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Cadernos de Erros */}
                        {items.notebooks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-foreground">
                              <BookOpen className="w-4 h-4" />
                              Cadernos de Erros ({items.notebooks.length})
                            </h5>
                            <div className="space-y-2">
                              {items.notebooks.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-2 rounded border">
                                  <div>
                                    <p className="text-sm font-medium">{item.title || 'Caderno sem título'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(() => {
                                        const lastReviewValue = item.last_review || item.lastReviewedAt || item.reviewed_at;
                                        if (!lastReviewValue) return 'Nunca revisado';
                                        
                                        try {
                                          let reviewDate;
                                          
                                          if (lastReviewValue.toDate && typeof lastReviewValue.toDate === 'function') {
                                            reviewDate = lastReviewValue.toDate();
                                          } else if (lastReviewValue.seconds && typeof lastReviewValue.seconds === 'number') {
                                            reviewDate = new Date(lastReviewValue.seconds * 1000);
                                          } else if (typeof lastReviewValue === 'string' || typeof lastReviewValue === 'number') {
                                            reviewDate = new Date(lastReviewValue);
                                          } else if (lastReviewValue instanceof Date) {
                                            reviewDate = lastReviewValue;
                                          } else {
                                            return 'Formato inválido';
                                          }
                                          
                                          if (isNaN(reviewDate.getTime())) return 'Data inválida';
                                          return `Última revisão: ${reviewDate.toLocaleDateString('pt-BR')} às ${reviewDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                        } catch (error) {
                                          console.warn('Erro ao processar data de revisão:', error, item);
                                          return 'Erro na data';
                                        }
                                      })()}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline">Revisar</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                         )}
                         </div>
                       )}
                     </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Centro de Alertas */}
      <AlertCenter />
      
      {/* Tutorial FSRS */}
      <FSRSTutorial 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
      
      {/* Modal de Reagendamento */}
      <RescheduleReviewsModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onSuccess={handleRescheduleSuccess}
        availableTypes={[
          { id: 'FLASHCARD', name: 'Flashcards', count: itensAgrupados.FLASHCARD.length },
          { id: 'QUESTION', name: 'Questões', count: itensAgrupados.QUESTION.length },
          { id: 'ERROR_NOTEBOOK', name: 'Cadernos de Erros', count: itensAgrupados.ERROR_NOTEBOOK.length }
        ]}
      />
    </div>
  );
}