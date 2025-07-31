import React, { useState, useEffect } from 'react';
import { X, Folder, Palette, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const FOLDER_COLORS = [
  { name: 'Azul', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Verde', value: '#10B981', class: 'bg-green-500' },
  { name: 'Roxo', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Rosa', value: '#EC4899', class: 'bg-pink-500' },
  { name: 'Laranja', value: '#F59E0B', class: 'bg-orange-500' },
  { name: 'Vermelho', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Índigo', value: '#6366F1', class: 'bg-indigo-500' },
  { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' },
];

const FOLDER_ICONS = [
  { name: 'Pasta', value: 'folder', icon: '📁' },
  { name: 'Livro', value: 'book', icon: '📚' },
  { name: 'Medicina', value: 'medical', icon: '🏥' },
  { name: 'Coração', value: 'heart', icon: '❤️' },
  { name: 'Cérebro', value: 'brain', icon: '🧠' },
  { name: 'Estrela', value: 'star', icon: '⭐' },
  { name: 'Alvo', value: 'target', icon: '🎯' },
  { name: 'Troféu', value: 'trophy', icon: '🏆' },
];

const FolderModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  folder = null, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    icon: 'folder'
  });
  const [errors, setErrors] = useState({});

  const isEditing = !!folder;

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || '#8B5CF6',
        icon: folder.icon || 'folder'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#8B5CF6',
        icon: 'folder'
      });
    }
    setErrors({});
  }, [folder, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da pasta é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
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
        description: formData.description?.trim() || null
      });
      onClose();
    } catch (error) {
      // Erro silencioso - exibe mensagem amigável se necessário
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedColorObj = FOLDER_COLORS.find(c => c.value === formData.color);
  const selectedIconObj = FOLDER_ICONS.find(i => i.value === formData.icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" style={{color: 'var(--color-purple)'}} />
            {isEditing ? 'Editar Pasta' : 'Nova Pasta'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edite as informações da pasta de listas de questões.'
              : 'Crie uma nova pasta para organizar suas listas de questões.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome da Pasta */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nome da Pasta *</Label>
            <Input
              id="folder-name"
              type="text"
              placeholder="Ex: Cardiologia, Neurologia..."
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-sm" style={{color: 'var(--color-red)'}}>{errors.name}</p>
            )}
            <p className="text-xs" style={{color: 'var(--text-muted)'}}>
              {formData.name.length}/50 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="folder-description">Descrição (opcional)</Label>
            <Textarea
              id="folder-description"
              placeholder="Descreva o conteúdo desta pasta..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`resize-none ${errors.description ? 'border-red-500' : ''}`}
              rows={3}
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm" style={{color: 'var(--color-red)'}}>{errors.description}</p>
            )}
            <p className="text-xs" style={{color: 'var(--text-muted)'}}>
              {formData.description.length}/200 caracteres
            </p>
          </div>

          {/* Cor da Pasta */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Cor da Pasta
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleInputChange('color', color.value)}
                  className="flex items-center gap-2 p-2 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: formData.color === color.value 
                      ? 'var(--color-purple)' 
                      : 'var(--border-color)',
                    backgroundColor: formData.color === color.value 
                      ? 'var(--color-purple-light)' 
                      : 'transparent'
                  }}
                >
                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: color.value}} />
                  <span className="text-xs font-medium" style={{color: 'var(--text-primary)'}}>
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ícone da Pasta */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Ícone da Pasta
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_ICONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => handleInputChange('icon', icon.value)}
                  className="flex items-center gap-2 p-2 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: formData.icon === icon.value 
                      ? 'var(--color-purple)' 
                      : 'var(--border-color)',
                    backgroundColor: formData.icon === icon.value 
                      ? 'var(--color-purple-light)' 
                      : 'transparent'
                  }}
                >
                  <span className="text-lg">{icon.icon}</span>
                  <span className="text-xs font-medium" style={{color: 'var(--text-primary)'}}>
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview da Pasta */}
          <div className="p-4 rounded-lg border-2 border-dashed" style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}>
            <Label className="text-sm font-medium mb-2 block" style={{color: 'var(--text-secondary)'}}>
              Preview:
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: formData.color }}
              >
                {selectedIconObj?.icon || '📁'}
              </div>
              <div>
                <p className="font-semibold" style={{color: 'var(--text-primary)'}}>
                  {formData.name || 'Nome da Pasta'}
                </p>
                {formData.description && (
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {formData.description}
                  </p>
                )}
              </div>
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
              style={{
                backgroundColor: 'var(--color-purple)',
                color: 'white'
              }}
            >
              {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Pasta')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FolderModal; 