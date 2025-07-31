import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  PlayIcon,
  PlusIcon,
  FilterIcon,
  SearchIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  TrendingUpIcon,
  BookOpenIcon,
  EyeIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { fetchWithAuth } from '../../../services/fetchWithAuth';
import { parseFirestoreDate, formatDate as utilFormatDate, formatDateTime as utilFormatDateTime } from '../../../utils/dateUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const DeckViewPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, new, learning, review, due
  const [sortBy, setSortBy] = useState('created'); // created, due, difficulty, stability

  useEffect(() => {
    loadDeckData();
  }, [deckId]);

  useEffect(() => {
    applyFilters();
  }, [cards, searchTerm, filterStatus, sortBy]);

  const loadDeckData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados do deck
      const deckResponse = await fetchWithAuth(`${API_URL}/admin/flashcards/decks/${deckId}`);
      if (!deckResponse.ok) {
        throw new Error('Deck não encontrado');
      }
      const deckData = await deckResponse.json();
      
      setDeck(deckData.data.deck);
      setCards(deckData.data.cards || []);
      
    } catch (err) {
      console.error('Erro ao carregar deck:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cards];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(card => 
        card.frontContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.backContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por status FSRS
    if (filterStatus !== 'all') {
      filtered = filtered.filter(card => {
        const fsrsState = card.state || 'NEW';
        const now = new Date();
        const dueDate = card.due ? new Date(card.due) : now;
        
        switch (filterStatus) {
          case 'new':
            return fsrsState === 'NEW';
          case 'learning':
            return fsrsState === 'LEARNING' || fsrsState === 'RELEARNING';
          case 'review':
            return fsrsState === 'REVIEW';
          case 'due':
            return dueDate <= now;
          default:
            return true;
        }
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due':
          const dateA = a.due ? new Date(a.due) : new Date();
          const dateB = b.due ? new Date(b.due) : new Date();
          return dateA - dateB;
        case 'difficulty':
          return (b.difficulty || 5) - (a.difficulty || 5);
        case 'stability':
          return (b.stability || 0) - (a.stability || 0);
        case 'created':
        default:
          const createdA = a.createdAt ? new Date(a.createdAt) : new Date();
          const createdB = b.createdAt ? new Date(b.createdAt) : new Date();
          return createdB - createdA;
      }
    });

    setFilteredCards(filtered);
  };

  const handleCardAction = (card, action) => {
    switch (action) {
      case 'edit':
        navigate(`/admin/flashcards/card/${card.id}/edit`);
        break;
      case 'delete':
        if (window.confirm(`Tem certeza que deseja excluir este card?\n\nEsta ação não pode ser desfeita.`)) {
          deleteCard(card.id);
        }
        break;
      case 'view':
        navigate(`/admin/flashcards/card/${card.id}`);
        break;
    }
  };

  const deleteCard = async (cardId) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/cards/${cardId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCards(prev => prev.filter(card => card.id !== cardId));
      } else {
        throw new Error('Erro ao excluir card');
      }
    } catch (err) {
      console.error('Erro ao excluir card:', err);
      alert('Erro ao excluir card. Tente novamente.');
    }
  };



  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return utilFormatDate(date);
  };

  const formatDateTime = (date) => {
    if (!date) return 'Nunca';
    return utilFormatDateTime(date);
  };

  const getCardStatusBadge = (card) => {
    const state = card.state || 'NEW';
    const now = new Date();
    const dueDate = card.due ? new Date(card.due) : now;
    const isDue = dueDate <= now;

    if (state === 'NEW') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Novo</Badge>;
    }
    if (state === 'LEARNING' || state === 'RELEARNING') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aprendendo</Badge>;
    }
    if (state === 'REVIEW') {
      if (isDue) {
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Para Revisar</Badge>;
      } else {
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Revisado</Badge>;
      }
    }
    return <Badge variant="outline">Desconhecido</Badge>;
  };

  const getStatsCards = () => {
    const total = cards.length;
    const newCards = cards.filter(c => c.state === 'NEW').length;
    const learning = cards.filter(c => c.state === 'LEARNING' || c.state === 'RELEARNING').length;
    const review = cards.filter(c => c.state === 'REVIEW').length;
    const due = cards.filter(c => {
      const dueDate = c.due ? new Date(c.due) : new Date();
      return dueDate <= new Date();
    }).length;

    return { total, newCards, learning, review, due };
  };

  const stats = getStatsCards();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando baralho...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/admin/flashcards')}>
            Voltar para Flashcards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/flashcards')}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Voltar</span>
              </Button>
              
              <div className="border-l border-gray-300 h-6"></div>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{deck?.name || 'Baralho'}</h1>
                <p className="text-sm text-gray-500">
                  {deck?.collection} • {stats.total} cards
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => console.log('Iniciar revisão')} // TODO: implementar
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Revisar ({stats.due})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/flashcards/deck/${deckId}/edit`)}
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Editar Baralho
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <BookOpenIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Novos</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.newCards}</p>
                </div>
                <StarIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aprendendo</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.learning}</p>
                </div>
                <TrendingUpIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Revisão</p>
                  <p className="text-2xl font-bold text-green-600">{stats.review}</p>
                </div>
                <ClockIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Para Revisar</p>
                  <p className="text-2xl font-bold text-red-600">{stats.due}</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cards</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="learning">Aprendendo</SelectItem>
                  <SelectItem value="review">Em revisão</SelectItem>
                  <SelectItem value="due">Para revisar</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Data de criação</SelectItem>
                  <SelectItem value="due">Data de revisão</SelectItem>
                  <SelectItem value="difficulty">Dificuldade</SelectItem>
                  <SelectItem value="stability">Estabilidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Cards */}
        <div className="space-y-3">
          {filteredCards.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterStatus !== 'all' ? 'Nenhum card encontrado' : 'Este baralho está vazio'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Adicione alguns cards para começar a estudar'
                  }
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <Button variant="outline">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Adicionar Card
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredCards.map((card) => (
              <Card key={card.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4" onClick={() => handleCardAction(card, 'view')}>
                      <div className="flex items-center space-x-2 mb-2">
                        {getCardStatusBadge(card)}
                        {card.tags && Array.isArray(card.tags) && card.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {card.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {card.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{card.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">FRENTE</p>
                          <div 
                            className="text-sm text-gray-900 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: card.frontContent || 'Sem conteúdo' }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">VERSO</p>
                          <div 
                            className="text-sm text-gray-600 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: card.backContent || 'Sem conteúdo' }}
                          />
                        </div>
                      </div>

                      {/* Informações FSRS */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Dificuldade:</span> {card.difficulty?.toFixed(1) || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Estabilidade:</span> {card.stability?.toFixed(1) || 'N/A'} dias
                        </div>
                        <div>
                          <span className="font-medium">Próxima revisão:</span> {formatDate(card.due)}
                        </div>
                        <div>
                          <span className="font-medium">Última revisão:</span> {formatDate(card.last_review)}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCardAction(card, 'view')}
                        title="Visualizar card"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCardAction(card, 'edit')}
                        title="Editar card"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCardAction(card, 'delete')}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir card"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer com informações do baralho */}
        {deck && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Informações do Baralho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Coleção</p>
                  <p className="text-gray-600">{deck.collection}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Criado em</p>
                  <p className="text-gray-600">{formatDateTime(deck.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Última atualização</p>
                  <p className="text-gray-600">{formatDateTime(deck.updatedAt)}</p>
                </div>
                {deck.description && (
                  <div className="md:col-span-3">
                    <p className="font-medium text-gray-900">Descrição</p>
                    <p className="text-gray-600">{deck.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};