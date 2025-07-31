import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, X, Plus, Trash2, Bold, Italic, Underline, Link, Image as ImageIcon, Code, List, Hash, Eye, EyeOff, AlertCircle, CheckCircle, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { flashcardService } from '../services/flashcardService';


const CardEditor = ({ 
  isOpen, 
  onClose, 
  onSave, 
  deckId, 
  cardId = null, 
  mode = 'create' // 'create' | 'edit' | 'duplicate'
}) => {
  // Estados principais
  const [formData, setFormData] = useState({
    front: '',
    back: '',
    tags: [],
    difficulty: 0.5,
    notes: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('content');

  // Refs
  const frontEditorRef = useRef(null);
  const backEditorRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Ferramentas de formatação HTML
  const htmlTools = [
    { icon: Bold, tag: 'b', label: 'Negrito' },
    { icon: Italic, tag: 'i', label: 'Itálico' },
    { icon: Underline, tag: 'u', label: 'Sublinhado' },
    { icon: Code, tag: 'code', label: 'Código' }
  ];

  // Templates pré-definidos
  const templates = [
    {
      id: 'basic',
      name: 'Básico',
      front: 'Pergunta',
      back: 'Resposta'
    },
    {
      id: 'definition',
      name: 'Definição',
      front: 'O que é [conceito]?',
      back: '**[Conceito]** é...\n\n*Características principais:*\n- Item 1\n- Item 2\n- Item 3'
    },
    {
      id: 'comparison',
      name: 'Comparação',
      front: 'Compare [A] vs [B]',
      back: '| Aspecto | A | B |\n|---------|---|---|\n| Diferença 1 | ... | ... |\n| Diferença 2 | ... | ... |'
    },
    {
      id: 'process',
      name: 'Processo',
      front: 'Quais são os passos para [processo]?',
      back: '**Passos:**\n\n1. Primeiro passo\n2. Segundo passo\n3. Terceiro passo\n\n*Observação importante:* ...'
    }
  ];

  const handleAutoSave = useCallback(async () => {
    if (mode !== 'edit' || !cardId) return;

    try {
      await flashcardService.updateFlashcardComplete(cardId, {
        front: formData.front,
        back: formData.back,
        tags: formData.tags,
        difficulty: formData.difficulty,
        notes: formData.notes
        });
        setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erro no auto-save:', error);
    }
  }, [mode, cardId, formData]);

  /**
   * 📝 Validar formulário
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.front.trim()) {
      newErrors.front = 'Frente do card é obrigatória';
    } else if (formData.front.length > 1000) {
      newErrors.front = 'Frente deve ter no máximo 1000 caracteres';
    }

    if (!formData.back.trim()) {
      newErrors.back = 'Verso do card é obrigatório';
    } else if (formData.back.length > 2000) {
      newErrors.back = 'Verso deve ter no máximo 2000 caracteres';
    }

    if (formData.tags.length > 10) {
      newErrors.tags = 'Máximo 10 tags por card';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 💾 Salvar card
   */
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setErrors({});

      // Validar formulário
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      let result;
      if (mode === 'create') {
        // Criar novo card
        result = await flashcardService.createFlashcard({
          frontContent: formData.front,
          backContent: formData.back,
          tags: formData.tags,
          difficulty: formData.difficulty,
          personalNotes: formData.notes,
          deckId: deckId  // Importante!
        });
        setHasUnsavedChanges(false);
        onSave?.(result);
        onClose();
      } else if (mode === 'edit') {
        // Atualizar card existente
        result = await flashcardService.updateFlashcardComplete(cardId, {
          frontContent: formData.front,
          backContent: formData.back,
          tags: formData.tags,
          difficulty: formData.difficulty,
          personalNotes: formData.notes,
          deckId
        });
        setHasUnsavedChanges(false);
        onSave?.(result);
      }
    } catch (error) {
      console.error('Erro ao salvar card:', error);
      setErrors({ general: error.message || 'Erro ao salvar card' });
    } finally {
      setIsSaving(false);
    }
  }, [mode, formData, cardId, deckId, onSave, onClose, validateForm]);

  /**
   * 🔄 Reset form
   */
  const resetForm = () => {
    setFormData({
      front: '',
      back: '',
      tags: [],
      difficulty: 0.5,
      notes: ''
    });
    setErrors({});
    setHasUnsavedChanges(false);
    setTagInput('');
  };

  // Auto-save para modo de edição
  useEffect(() => {
    if (mode === 'edit' && autoSaveEnabled && hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 3000); // 3 segundos
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, mode, autoSaveEnabled, hasUnsavedChanges, handleAutoSave]);

  /**
   * 📥 Carregar card para edição
   */
  const loadCard = useCallback(async () => {
    try {
      setIsLoading(true);
      // Para edição ou duplicação, buscar o card dentro do deck
      if ((mode === 'edit' || mode === 'duplicate') && deckId && cardId) {
        const res = await flashcardService.getDeckCards(deckId);
        if (res.success) {
          const card = res.data.items.find(c => c.id === cardId);
          if (!card) throw new Error('Card não encontrado no deck');
          setFormData({
            front: card.frontContent || card.front || '',
            back: card.backContent || card.back || '',
            tags: card.tags || [],
            difficulty: card.difficulty || 0.5,
            notes: card.notes || ''
          });
          setHasUnsavedChanges(false);
        } else {
          throw new Error(res.error || 'Erro ao carregar cards do deck');
        }
      } else {
        // Criar novo card
        resetForm();
      }
    } catch (error) {
      console.error('Erro ao carregar card:', error);
      setErrors({ general: error.message || 'Erro ao carregar card' });
    } finally {
      setIsLoading(false);
    }
  }, [deckId, cardId, mode]);

  // Carregar card se estiver editando
  useEffect(() => {
    if (isOpen && mode === 'edit' && cardId) {
      loadCard();
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, mode, cardId, loadCard]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      // Ctrl+S para salvar
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Ctrl+P para preview
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowPreview(!showPreview);
      }
      
      // Esc para fechar
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPreview, handleSave, onClose]);

  /**
   * 📝 Atualizar campo
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  /**
   * 🎨 Inserir formatação HTML
   */
  const insertHtmlTag = (tag, targetField = 'front') => {
    const textarea = targetField === 'front' ? frontEditorRef.current : backEditorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    const newText = selectedText 
      ? `${beforeText}<${tag}>${selectedText}</${tag}>${afterText}`
      : `${beforeText}<${tag}></${tag}>${afterText}`;

    updateField(targetField, newText);

    // Reposicionar cursor
    setTimeout(() => {
      const newCursorPos = selectedText ? end + tag.length * 2 + 5 : start + tag.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  /**
   * 🖼️ Inserir imagem
   */
  const insertImage = (targetField = 'front') => {
    const url = prompt('URL da imagem:');
    if (url) {
      const alt = prompt('Texto alternativo (opcional):') || 'Imagem';
      const imgTag = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`;
      
      const textarea = targetField === 'front' ? frontEditorRef.current : backEditorRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(start);
        updateField(targetField, beforeText + imgTag + afterText);
      }
    }
  };

  /**
   * 🔗 Inserir link
   */
  const insertLink = (targetField = 'front') => {
    const url = prompt('URL do link:');
    if (url) {
      const text = prompt('Texto do link:') || url;
      const linkTag = `<a href=\"${url}\" target=\"_blank\">${text}</a>`;
      
      const textarea = targetField === 'front' ? frontEditorRef.current : backEditorRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(start);
        updateField(targetField, beforeText + linkTag + afterText);
      }
    }
  };

  /**
   * 🎨 Inserir cor no texto
   */
  const insertColor = (targetField = 'front') => {
    const color = prompt('Cor (hex) (ex: #ff0000):');
    if (color) {
      const startTag = `<span style=\"color:${color}\">`;
      const endTag = `</span>`;
      const textarea = targetField === 'front' ? frontEditorRef.current : backEditorRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      const newText = selectedText
        ? `${beforeText}${startTag}${selectedText}${endTag}${afterText}`
        : `${beforeText}${startTag}${endTag}${afterText}`;
      updateField(targetField, newText);
      setTimeout(() => {
        const cursorPos = beforeText.length + startTag.length + (selectedText ? selectedText.length : 0);
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
      }, 0);
    }
  };

  /**
   * 🏷️ Gestão de tags
   */
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      updateField('tags', [...formData.tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    updateField('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  /**
   * 📋 Aplicar template
   */
  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      front: template.front,
      back: template.back
    }));
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {mode === 'create' ? 'Criar Novo Card' : 
               mode === 'edit' ? 'Editar Card' : 'Duplicar Card'}
            </h2>
            {hasUnsavedChanges && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Alterações não salvas {autoSaveEnabled && mode === 'edit' ? '(auto-save ativo)' : ''}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle Preview */}
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant={showPreview ? "secondary" : "ghost"}
              size="icon"
              title="Alternar Preview (Ctrl+P)"
            >
              {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>

            {/* Auto-save Toggle */}
            {mode === 'edit' && (
              <button
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  autoSaveEnabled 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Auto-save"
              >
                <Save className="w-5 h-5" />
              </button>
            )}

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-muted">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="h-full max-w-7xl mx-auto p-6">
              <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-6 h-full`}>
                {/* Editor Principal */}
                <div className="overflow-y-auto">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="content">Conteúdo</TabsTrigger>
                      <TabsTrigger value="tags">Tags & Notas</TabsTrigger>
                      <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4 mt-0">
                      {/* Frente do Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>Frente do Card</span>
                            <div className="flex items-center gap-1">
                              {htmlTools.map((tool) => (
                                <Button
                                  key={tool.tag}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertHtmlTag(tool.tag, 'front')}
                                  title={tool.label}
                                  className="p-1 h-8 w-8"
                                >
                                  <tool.icon className="w-4 h-4" />
                                </Button>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertImage('front')}
                                title="Inserir Imagem"
                                className="p-1 h-8 w-8"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertLink('front')}
                                title="Inserir Link"
                                className="p-1 h-8 w-8"
                              >
                                <Link className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertColor('front')}
                                title="Cor do texto"
                                className="p-1 h-8 w-8"
                              >
                                <Palette className="w-4 h-4" />
                              </Button>
                  </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="front">Conteúdo da frente *</Label>
                            <div
                    ref={frontEditorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={(e) => updateField('front', e.currentTarget.innerHTML)}
                              dangerouslySetInnerHTML={{ __html: formData.front }}
                              className={`min-h-[200px] font-mono text-sm border ${errors.front ? 'border-destructive' : 'border-border'} p-2 rounded`}
                  />
                  {errors.front && (
                              <p className="text-sm text-destructive">{errors.front}</p>
                  )}
                            <p className="text-xs text-muted-foreground">
                              Suporte a HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;img&gt;, &lt;a&gt;, etc. • {formData.front.length}/1000 caracteres
                  </p>
                </div>
                        </CardContent>
                      </Card>

                {/* Back */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>Verso do Card</span>
                            <div className="flex items-center gap-1">
                              {htmlTools.map((tool) => (
                                <Button
                                  key={tool.tag}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertHtmlTag(tool.tag, 'back')}
                                  title={tool.label}
                                  className="p-1 h-8 w-8"
                                >
                                  <tool.icon className="w-4 h-4" />
                                </Button>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertImage('back')}
                                title="Inserir Imagem"
                                className="p-1 h-8 w-8"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertLink('back')}
                                title="Inserir Link"
                                className="p-1 h-8 w-8"
                              >
                                <Link className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => insertColor('back')}
                                title="Cor do texto"
                                className="p-1 h-8 w-8"
                              >
                                <Palette className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="back">Conteúdo do verso *</Label>
                            <div
                    ref={backEditorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={(e) => updateField('back', e.currentTarget.innerHTML)}
                              dangerouslySetInnerHTML={{ __html: formData.back }}
                              className={`min-h-[200px] font-mono text-sm border ${errors.back ? 'border-destructive' : 'border-border'} p-2 rounded`}
                  />
                  {errors.back && (
                              <p className="text-sm text-destructive">{errors.back}</p>
                  )}
                            <p className="text-xs text-muted-foreground">
                    {formData.back.length}/2000 caracteres
                  </p>
                </div>
                        </CardContent>
                      </Card>

                      {/* Erro geral */}
                      {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{errors.general}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="tags" className="space-y-4 mt-0">
                {/* Tags */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Hash className="w-5 h-5" />
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
                                  className="cursor-pointer hover:bg-red-100 hover:text-red-800 flex items-center gap-1"
                                  onClick={() => removeTag(tag)}
                                  title="Clique para remover"
                        >
                                  <Hash className="w-3 h-3" />
                          {tag}
                            <X className="w-3 h-3" />
                        </Badge>
                      ))}
                              {formData.tags.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhuma tag adicionada</p>
                              )}
                    </div>

                            {/* Adicionar nova tag */}
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      placeholder="Digite uma tag e pressione Enter"
                      className="flex-1"
                      disabled={formData.tags.length >= 10}
                    />
                    <Button
                      onClick={addTag}
                      disabled={!tagInput.trim() || formData.tags.length >= 10}
                                variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {errors.tags && (
                              <p className="text-sm text-destructive">{errors.tags}</p>
                  )}
                            <p className="text-xs text-muted-foreground">
                    {formData.tags.length}/10 tags
                  </p>
                </div>
                        </CardContent>
                      </Card>

                      {/* Notas */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5" />
                            <span>Notas Pessoais</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                              id="notes"
                              value={formData.notes}
                              onChange={(e) => updateField('notes', e.target.value)}
                              placeholder="Adicione notas pessoais sobre este card..."
                              className="min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">
                              Notas privadas para auxiliar seus estudos
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                {/* Dificuldade */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Dificuldade Inicial</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="difficulty">Dificuldade ({Math.round(formData.difficulty * 100)}%)</Label>
                  <input
                              id="difficulty"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.difficulty}
                    onChange={(e) => updateField('difficulty', parseFloat(e.target.value))}
                    className="w-full"
                  />
                            <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Fácil</span>
                              <span>Médio</span>
                    <span>Difícil</span>
                  </div>
                </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="templates" className="space-y-4 mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Templates Rápidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-3">
                            {templates.map(template => (
                              <div
                                key={template.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => applyTemplate(template)}
                              >
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Frente: {template.front.substring(0, 50)}...
                                </p>
                              </div>
                            ))}
                  </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
              </div>

              {/* Preview */}
              {showPreview && (
                  <div className="overflow-y-auto">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                  {/* Preview Frente */}
                          <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Frente
                    </h4>
                            <div className="p-4 bg-background border border-border rounded-lg min-h-[120px]">
                      <div className="prose dark:prose-invert max-w-none">
                        {formData.front ? (
                          <div dangerouslySetInnerHTML={{ 
                                    __html: formData.front 
                          }} />
                        ) : (
                                  <p className="text-muted-foreground italic">Frente do card aparecerá aqui...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview Verso */}
                          <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">
                      Verso
                    </h4>
                            <div className="p-4 bg-background border border-border rounded-lg min-h-[160px]">
                      <div className="prose dark:prose-invert max-w-none">
                        {formData.back ? (
                          <div dangerouslySetInnerHTML={{ 
                                    __html: formData.back 
                          }} />
                        ) : (
                                  <p className="text-muted-foreground italic">Verso do card aparecerá aqui...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview Tags */}
                  {formData.tags.length > 0 && (
                    <div>
                              <h4 className="text-sm font-medium text-foreground mb-2">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                                  <Badge
                            key={index}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                          >
                                    <Hash className="w-3 h-3" />
                            {tag}
                                  </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                          {/* Preview Notas */}
                          {formData.notes && (
                            <div>
                              <h4 className="text-sm font-medium text-foreground mb-2">
                                Notas
                              </h4>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">{formData.notes}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd> para salvar • 
              <kbd className="px-2 py-1 bg-muted rounded text-xs ml-2">Ctrl+P</kbd> para preview
          </div>
          
          <div className="flex items-center gap-3">
              <Button
              onClick={onClose}
              disabled={isSaving}
                variant="ghost"
            >
              Cancelar
              </Button>
              <Button
              onClick={handleSave}
              disabled={isSaving || !formData.front.trim() || !formData.back.trim()}
                className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {mode === 'create' ? 'Criar Card' : 'Salvar Alterações'}
                </>
              )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEditor; 