import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Plus, Save, BookOpen, AlertCircle, Tag, Hash
} from 'lucide-react';
import { flashcardService } from '../../services/flashcardService';

const CreateDeckModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [],
    isPublic: false,
    difficulty: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tags: [],
      isPublic: false,
      difficulty: 'medium'
    });
    setErrors({});
    setNewTag('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do deck é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const deckData = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        tags: formData.tags,
        isPublic: formData.isPublic,
        difficulty: formData.difficulty
      };

      const result = await flashcardService.createDeck(deckData);

      if (onSuccess) onSuccess(result);
      onClose();
      
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setErrors({ general: error.message || 'Erro ao criar deck' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newTag.trim()) {
        addTag();
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
              backgroundColor: 'var(--color-purple-light)'
            }}>
              <Plus className="w-5 h-5" style={{color: 'var(--color-purple)'}} />
            </div>
            <div>
              <DialogTitle>Criar Novo Deck</DialogTitle>
              <DialogDescription>
                Crie um novo deck de flashcards para organizar seus estudos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nome do deck */}
          <div className="space-y-2">
            <Label htmlFor="deck-name">Nome do Deck *</Label>
            <Input
              id="deck-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: Anatomia Humana"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm" style={{color: 'var(--color-red)'}}>{errors.name}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="deck-description">Descrição</Label>
            <Textarea
              id="deck-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o conteúdo deste deck..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm" style={{color: 'var(--color-red)'}}>{errors.description}</p>
            )}
          </div>

          {/* Dificuldade */}
          <div className="space-y-2">
            <Label>Dificuldade</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => handleInputChange('difficulty', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--color-green)'}}></div>
                    Fácil
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--color-yellow)'}}></div>
                    Médio
                  </div>
                </SelectItem>
                <SelectItem value="hard">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--color-red)'}}></div>
                    Difícil
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Adicionar tag..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!newTag.trim() || formData.tags.length >= 5}
              >
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-xs" style={{color: 'var(--text-muted)'}}>
              Máximo 5 tags. Clique na tag para remover.
            </p>
          </div>

          {/* Visibilidade */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="deck-public"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="deck-public" className="cursor-pointer">
              Tornar deck público
            </Label>
          </div>

          {/* Erro geral */}
          {errors.general && (
            <div className="rounded-lg p-4" style={{
              backgroundColor: 'var(--color-red-light)',
              borderColor: 'var(--color-red-border)',
              border: '1px solid'
            }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{color: 'var(--color-red)'}} />
                <p style={{color: 'var(--color-red-dark)'}}>{errors.general}</p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Criar Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeckModal; 