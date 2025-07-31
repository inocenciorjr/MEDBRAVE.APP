import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  SaveIcon, 
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  TagIcon,
  CalendarIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ClockIcon,
  InfoIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { fetchWithAuth } from '../../../services/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const CardEditPage = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();
  
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    front: '',
    back: '',
    tags: [],
    notes: ''
  });
  const [newTag, setNewTag] = useState('');

  // Refs para os editores
  const frontEditorRef = useRef(null);
  const backEditorRef = useRef(null);

  useEffect(() => {
    loadCardData();
  }, [cardId]);

  const loadCardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/cards/${cardId}`);
      if (!response.ok) {
        throw new Error('Card não encontrado');
      }
      
      const data = await response.json();
      const cardData = data.data.card;
      
      setCard(cardData);
      setFormData({
        front: cardData.frontContent || '',
        back: cardData.backContent || '',
        tags: cardData.tags || [],
        notes: cardData.notes || ''
      });
      
    } catch (err) {
      console.error('Erro ao carregar card:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          front: formData.front,
          back: formData.back,
          tags: formData.tags,
          notes: formData.notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao salvar card');
      }
      
      // Atualizar dados locais
      setCard(prev => ({
        ...prev,
        ...formData,
        updatedAt: new Date().toISOString()
      }));
      
      alert('Card salvo com sucesso!');
      
    } catch (err) {
      console.error('Erro ao salvar card:', err);
      alert('Erro ao salvar card. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este card?\n\nEsta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetchWithAuth(`${API_URL}/admin/flashcards/cards/${cardId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Card excluído com sucesso!');
        navigate(-1); // Voltar para a página anterior
      } else {
        throw new Error('Erro ao excluir card');
      }
    } catch (err) {
      console.error('Erro ao excluir card:', err);
      alert('Erro ao excluir card. Tente novamente.');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Data inválida';
    return d.toLocaleString('pt-BR');
  };

  const getCardStatusInfo = () => {
    if (!card) return null;
    
    const state = card.state || 'NEW';
    const now = new Date();
    const dueDate = card.due ? new Date(card.due) : now;
    const isDue = dueDate <= now;

    let statusText = 'Desconhecido';
    let statusColor = 'gray';
    
    if (state === 'NEW') {
      statusText = 'Novo';
      statusColor = 'blue';
    } else if (state === 'LEARNING' || state === 'RELEARNING') {
      statusText = 'Aprendendo';
      statusColor = 'yellow';
    } else if (state === 'REVIEW') {
      if (isDue) {
        statusText = 'Para Revisar';
        statusColor = 'red';
      } else {
        statusText = 'Revisado';
        statusColor = 'green';
      }
    }

    return { statusText, statusColor, isDue };
  };

  const statusInfo = getCardStatusInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando card...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            Voltar
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
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Voltar</span>
              </Button>
              
              <div className="border-l border-gray-300 h-6"></div>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Editar Card</h1>
                <p className="text-sm text-gray-500">
                  {card?.deckName} • {statusInfo?.statusText}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? (
                  <>
                    <EyeOffIcon className="w-4 h-4 mr-2" />
                    Editar
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Visualizar
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Principal */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="tags">Tags & Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                {/* Frente do Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>Frente do Card</span>
                      {statusInfo && (
                        <Badge 
                          variant="secondary" 
                          className={`bg-${statusInfo.statusColor}-100 text-${statusInfo.statusColor}-800`}
                        >
                          {statusInfo.statusText}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewMode ? (
                      <div 
                        className="min-h-[200px] p-4 border rounded-lg bg-gray-50"
                        dangerouslySetInnerHTML={{ __html: formData.front || 'Sem conteúdo' }}
                      />
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="front">Conteúdo da frente</Label>
                        <Textarea
                          id="front"
                          ref={frontEditorRef}
                          value={formData.front}
                          onChange={(e) => setFormData(prev => ({ ...prev, front: e.target.value }))}
                          placeholder="Digite o conteúdo da frente do card..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Suporte a HTML básico: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;br&gt;, &lt;p&gt;, etc.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verso do Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Verso do Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewMode ? (
                      <div 
                        className="min-h-[200px] p-4 border rounded-lg bg-gray-50"
                        dangerouslySetInnerHTML={{ __html: formData.back || 'Sem conteúdo' }}
                      />
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="back">Conteúdo do verso</Label>
                        <Textarea
                          id="back"
                          ref={backEditorRef}
                          value={formData.back}
                          onChange={(e) => setFormData(prev => ({ ...prev, back: e.target.value }))}
                          placeholder="Digite o conteúdo do verso do card..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Suporte a HTML básico: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;br&gt;, &lt;p&gt;, etc.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                {/* Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <TagIcon className="w-5 h-5" />
                      <span>Tags</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Tags existentes */}
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                            onClick={() => handleRemoveTag(tag)}
                            title="Clique para remover"
                          >
                            {tag} ×
                          </Badge>
                        ))}
                        {formData.tags.length === 0 && (
                          <p className="text-sm text-gray-500">Nenhuma tag adicionada</p>
                        )}
                      </div>
                      
                      {/* Adicionar nova tag */}
                      <div className="flex space-x-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Nova tag..."
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          className="flex-1"
                        />
                        <Button onClick={handleAddTag} variant="outline" size="sm">
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <InfoIcon className="w-5 h-5" />
                      <span>Notas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Adicione notas sobre este card..."
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar com Informações FSRS */}
          <div className="space-y-4">
            {/* Informações do Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {statusInfo && (
                      <Badge 
                        variant="secondary" 
                        className={`bg-${statusInfo.statusColor}-100 text-${statusInfo.statusColor}-800`}
                      >
                        {statusInfo.statusText}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">Baralho</p>
                  <p className="text-sm text-gray-600">{card?.deckName || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">Criado em</p>
                  <p className="text-sm text-gray-600">{formatDate(card?.createdAt)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">Última atualização</p>
                  <p className="text-sm text-gray-600">{formatDate(card?.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas FSRS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <BarChart3Icon className="w-5 h-5" />
                  <span>Estatísticas FSRS</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <TrendingUpIcon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-gray-600">Dificuldade</p>
                    <p className="text-lg font-bold text-blue-600">
                      {card?.difficulty?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-gray-600">Estabilidade</p>
                    <p className="text-lg font-bold text-green-600">
                      {card?.stability?.toFixed(1) || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">dias</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Próxima revisão</span>
                    </p>
                    <p className="text-sm text-gray-600 ml-6">
                      {formatDate(card?.due)}
                      {statusInfo?.isDue && (
                        <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800">
                          Atrasado
                        </Badge>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">Última revisão</p>
                    <p className="text-sm text-gray-600">{formatDate(card?.last_review)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total de revisões</p>
                    <p className="text-sm text-gray-600">{card?.reps || 0}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">Lapsos</p>
                    <p className="text-sm text-gray-600">{card?.lapses || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Revisões */}
            {card?.reviewHistory && card.reviewHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {card.reviewHistory.slice(0, 5).map((review, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(review.date)}</span>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${review.rating === 1 ? 'text-red-600' : ''}
                            ${review.rating === 2 ? 'text-orange-600' : ''}
                            ${review.rating === 3 ? 'text-yellow-600' : ''}
                            ${review.rating === 4 ? 'text-green-600' : ''}
                          `}
                        >
                          {review.rating === 1 ? 'Difícil' : 
                           review.rating === 2 ? 'Médio' : 
                           review.rating === 3 ? 'Bom' : 'Fácil'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 