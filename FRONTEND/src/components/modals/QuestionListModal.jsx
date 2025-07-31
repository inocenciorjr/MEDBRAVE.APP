import React, { useState, useEffect } from 'react';
import { FileText, Folder, Tag, Globe, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const QuestionListModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  questionList = null, 
  folders = [],
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    folderId: null,
    isPublic: false,
    tags: []
  });
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  const isEditing = !!questionList;

  useEffect(() => {
    if (questionList) {
      setFormData({
        name: questionList.name || questionList.title || '',
        description: questionList.description || '',
        folderId: questionList.folderId || null,
        isPublic: questionList.isPublic || false,
        tags: questionList.tags || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        folderId: null,
        isPublic: false,
        tags: []
      });
    }
    setErrors({});
    setTagInput('');
  }, [questionList, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da lista é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição deve ter no máximo 500 caracteres';
    }

    if (formData.tags.length > 10) {
      newErrors.tags = 'Máximo de 10 tags permitidas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        title: formData.name.trim() // Para compatibilidade
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
      if (errors.tags) {
        setErrors(prev => ({ ...prev, tags: '' }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const selectedFolder = folders.find(f => f.id === formData.folderId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            {isEditing ? 'Editar Lista' : 'Nova Lista de Questões'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edite as informações da lista de questões.'
              : 'Crie uma nova lista para organizar suas questões de estudo.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome da Lista */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Nome da Lista *</Label>
            <Input
              id="list-name"
              type="text"
              placeholder="Ex: Questões de Cardiologia - Arritmias"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
              maxLength={100}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
            <p className="text-xs text-gray-500">
              {formData.name.length}/100 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="list-description">Descrição (opcional)</Label>
            <Textarea
              id="list-description"
              placeholder="Descreva o conteúdo desta lista..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`resize-none ${errors.description ? 'border-red-500' : ''}`}
              rows={3}
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {formData.description.length}/500 caracteres
            </p>
          </div>

          {/* Pasta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Pasta (opcional)
            </Label>
            <Select
              value={formData.folderId || 'none'}
              onValueChange={(value) => handleInputChange('folderId', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pasta">
                  {formData.folderId ? (
                    <div className="flex items-center gap-2">
                      {selectedFolder && (
                        <>
                          <div 
                            className="w-4 h-4 rounded flex items-center justify-center text-xs"
                            style={{ backgroundColor: selectedFolder.color }}
                          >
                            {selectedFolder.icon === 'folder' ? '📁' : 
                             selectedFolder.icon === 'book' ? '📚' :
                             selectedFolder.icon === 'medical' ? '🏥' :
                             selectedFolder.icon === 'heart' ? '❤️' :
                             selectedFolder.icon === 'brain' ? '🧠' :
                             selectedFolder.icon === 'star' ? '⭐' :
                             selectedFolder.icon === 'target' ? '🎯' :
                             selectedFolder.icon === 'trophy' ? '🏆' : '📁'}
                          </div>
                          <span>{selectedFolder.name}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    'Sem pasta'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-300 flex items-center justify-center text-xs">
                      📄
                    </div>
                    <span>Sem pasta</span>
                  </div>
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: folder.color }}
                      >
                        {folder.icon === 'folder' ? '📁' : 
                         folder.icon === 'book' ? '📚' :
                         folder.icon === 'medical' ? '🏥' :
                         folder.icon === 'heart' ? '❤️' :
                         folder.icon === 'brain' ? '🧠' :
                         folder.icon === 'star' ? '⭐' :
                         folder.icon === 'target' ? '🎯' :
                         folder.icon === 'trophy' ? '🏆' : '📁'}
                      </div>
                      <span>{folder.name}</span>
                      <span className="text-xs text-gray-500">({folder.listCount})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Digite uma tag e pressione Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                className="flex-1"
                maxLength={20}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || formData.tags.length >= 10}
              >
                Adicionar
              </Button>
            </div>
            {errors.tags && (
              <p className="text-sm text-red-500">{errors.tags}</p>
            )}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              {formData.tags.length}/10 tags • Clique na tag para remover
            </p>
          </div>

          {/* Visibilidade */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Visibilidade</Label>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {formData.isPublic ? (
                  <Globe className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <p className="font-medium">
                    {formData.isPublic ? 'Lista Pública' : 'Lista Privada'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.isPublic 
                      ? 'Outros usuários podem ver e usar esta lista'
                      : 'Apenas você pode ver e usar esta lista'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Lista')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionListModal; 