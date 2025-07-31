import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Plus, X, Edit, Trash2, Search, Filter, Check, AlertCircle, Hash } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { flashcardService } from '../services/flashcardService';


const TagManager = ({ 
  isOpen, 
  onClose, 
  deckId, 
  onTagsUpdated 
}) => {
  // Estados principais
  const [tags, setTags] = useState([]);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('usage'); // 'usage', 'name', 'created'
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [error, setError] = useState(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    description: ''
  });

  // Cores disponíveis para tags
  const tagColors = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Laranja', value: '#F97316' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Índigo', value: '#6366F1' },
    { name: 'Cinza', value: '#6B7280' }
  ];

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (isOpen && deckId) {
      loadDeckData();
    }
  }, [isOpen, deckId]);


  const loadDeckData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Buscar todos os cards do deck
      const response = await flashcardService.getCardsByDeck(deckId, { 
        limit: 1000, // Buscar todos os cards
        page: 1 
      });
      
      if (response.success && response.data.items) {
        const deckCards = response.data.items;
        setCards(deckCards);
        
        // Processar tags
        const tagMap = new Map();
        
        deckCards.forEach(card => {
          if (card.tags && Array.isArray(card.tags)) {
            card.tags.forEach(tagName => {
              if (tagMap.has(tagName)) {
                const tag = tagMap.get(tagName);
                tag.usage++;
                tag.cards.push(card.id);
                tag.lastUsed = Math.max(tag.lastUsed, new Date(card.updatedAt || card.createdAt).getTime());
              } else {
                tagMap.set(tagName, {
                  name: tagName,
                  usage: 1,
                  cards: [card.id],
                  color: getTagColor(tagName),
                  created: new Date(card.createdAt).getTime(),
                  lastUsed: new Date(card.updatedAt || card.createdAt).getTime(),
                  description: ''
                });
              }
            });
          }
        });
        
        setTags(Array.from(tagMap.values()));
      }
    } catch (error) {
      console.error('Erro ao carregar dados do deck:', error);
      setError('Erro ao carregar tags do deck');
    } finally {
      setIsLoading(false);
    }
  };


  const getTagColor = (tagName) => {
    const hash = tagName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return tagColors[Math.abs(hash) % tagColors.length].value;
  };


  const getFilteredAndSortedTags = useCallback(() => {
    let filtered = tags.filter(tag =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'usage':
          comparison = b.usage - a.usage;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = b.created - a.created;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [tags, searchTerm, sortBy, sortOrder]);


  const handleCreateTag = async () => {
    if (!formData.name.trim()) return;

    const newTag = {
      name: formData.name.trim().toLowerCase(),
      color: formData.color,
      description: formData.description.trim(),
      usage: 0,
      cards: [],
      created: Date.now(),
      lastUsed: Date.now()
    };

    // Verificar se tag já existe
    if (tags.some(tag => tag.name === newTag.name)) {
      setError('Tag já existe');
      return;
    }

    setTags(prev => [...prev, newTag]);
    setFormData({ name: '', color: '#3B82F6', description: '' });
    setShowCreateForm(false);
    setError(null);
  };


  const handleEditTag = async (tagToEdit) => {
    if (!formData.name.trim()) return;

    const updatedTags = tags.map(tag => 
      tag.name === tagToEdit.name 
        ? { ...tag, name: formData.name.trim().toLowerCase(), color: formData.color, description: formData.description.trim() }
        : tag
    );

    setTags(updatedTags);
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6', description: '' });
    setError(null);
  };

  /**
   * 🗑️ Excluir tag
   */
  const handleDeleteTag = async (tagToDelete) => {
    try {
      // Remover tag de todos os cards que a possuem
      const cardsWithTag = cards.filter(card => 
        card.tags && card.tags.includes(tagToDelete.name)
      );

      for (const card of cardsWithTag) {
        const updatedTags = card.tags.filter(tag => tag !== tagToDelete.name);
        await flashcardService.updateFlashcardTags(card.id, updatedTags);
      }

      // Remover tag da lista
      setTags(prev => prev.filter(tag => tag.name !== tagToDelete.name));
      
      // Atualizar cards localmente
      setCards(prev => prev.map(card => ({
        ...card,
        tags: card.tags ? card.tags.filter(tag => tag !== tagToDelete.name) : []
      })));

      onTagsUpdated && onTagsUpdated();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      setError('Erro ao excluir tag');
    }
  };

  /**
   * 🎯 Aplicar tags selecionadas aos cards
   */
  const handleApplyTagsToCards = async (cardIds) => {
    try {
      for (const cardId of cardIds) {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          const currentTags = card.tags || [];
          const newTags = [...new Set([...currentTags, ...selectedTags])];
          await flashcardService.updateFlashcardTags(cardId, newTags);
        }
      }
      
      loadDeckData(); // Recarregar dados
      setSelectedTags([]);
      onTagsUpdated && onTagsUpdated();
    } catch (error) {
      console.error('Erro ao aplicar tags:', error);
      setError('Erro ao aplicar tags');
    }
  };

  /**
   * 📊 Obter estatísticas das tags
   */
  const getTagStats = () => {
    const totalTags = tags.length;
    const totalUsage = tags.reduce((sum, tag) => sum + tag.usage, 0);
    const avgUsage = totalTags > 0 ? Math.round(totalUsage / totalTags) : 0;
    const mostUsedTag = tags.reduce((max, tag) => tag.usage > max.usage ? tag : max, { usage: 0 });
    
    return {
      totalTags,
      totalUsage,
      avgUsage,
      mostUsedTag: mostUsedTag.usage > 0 ? mostUsedTag : null
    };
  };

  if (!isOpen) return null;

  const filteredTags = getFilteredAndSortedTags();
  const stats = getTagStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Gerenciador de Tags
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalTags} tags • {stats.totalUsage} usos • Média: {stats.avgUsage}/tag
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Tag
            </Button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tags..."
                className="pl-10"
              />
            </div>

            {/* Ordenação */}
            <div className="flex gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usage">Mais Usadas</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="created">Criação</SelectItem>
                </SelectContent>
              </Select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          {stats.mostUsedTag && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-200">
                  Tag mais usada: 
                  <span className="font-semibold ml-1" style={{ color: stats.mostUsedTag.color }}>
                    {stats.mostUsedTag.name}
                  </span> 
                  ({stats.mostUsedTag.usage} cards)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Lista de Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.name}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Tag Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tag.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTag(tag);
                            setFormData({
                              name: tag.name,
                              color: tag.color,
                              description: tag.description || ''
                            });
                          }}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTag(tag)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Tag Stats */}
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{tag.usage} cards</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          Última: {new Date(tag.lastUsed).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Tag Description */}
                    {tag.description && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        {tag.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: tag.color,
                            width: `${Math.min((tag.usage / Math.max(...tags.map(t => t.usage))) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredTags.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchTerm ? 'Nenhuma tag encontrada' : 'Nenhuma tag criada'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie sua primeira tag para organizar os cards'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Criar Primeira Tag
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {(showCreateForm || editingTag) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {editingTag ? 'Editar Tag' : 'Nova Tag'}
              </h3>
              
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Tag
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite o nome da tag..."
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tagColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color.value 
                            ? 'border-gray-900 dark:border-white scale-110' 
                            : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da tag..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTag(null);
                    setFormData({ name: '', color: '#3B82F6', description: '' });
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={editingTag ? () => handleEditTag(editingTag) : handleCreateTag}
                  disabled={!formData.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingTag ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager; 