'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/services/api';
import Checkbox from '@/components/ui/Checkbox';
import dynamic from 'next/dynamic';
import { r2ImageUploadService } from '@/services/r2ImageUploadService';

// Importar RichTextEditor dinamicamente (mesmo do bulk)
const RichTextEditor = dynamic(
  () => import('@/components/admin/ui/RichTextEditor'),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-48 rounded-lg"></div> }
);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Alternative {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface CustomQuestionData {
  content: string;
  alternatives: Alternative[];
  correctAnswer: string;
  explanation: string;
  subFilterIds: string[];
  difficulty: number;
}

interface FilterNode {
  id: string;
  name: string;
  level: number;
  children?: FilterNode[];
}

interface CustomQuestionEditorProps {
  onSave: (questionData: CustomQuestionData) => void;
  onCancel: () => void;
  initialData?: Partial<CustomQuestionData>;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Muito Fácil', color: 'bg-emerald-100 text-emerald-700' },
  { value: 2, label: 'Fácil', color: 'bg-green-100 text-green-700' },
  { value: 3, label: 'Médio', color: 'bg-yellow-100 text-yellow-700' },
  { value: 4, label: 'Difícil', color: 'bg-orange-100 text-orange-700' },
  { value: 5, label: 'Muito Difícil', color: 'bg-red-100 text-red-700' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function CustomQuestionEditor({
  onSave,
  onCancel,
  initialData = {}
}: CustomQuestionEditorProps) {
  const toast = useToast();
  
  // Form state
  const [content, setContent] = useState(initialData.content || '');
  const [alternatives, setAlternatives] = useState<Alternative[]>(
    initialData.alternatives || [
      { id: '1', text: '', isCorrect: true },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
    ]
  );
  const [explanation, setExplanation] = useState(initialData.explanation || '');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initialData.subFilterIds || []);
  const [difficulty, setDifficulty] = useState(initialData.difficulty || 3);

  // Filter data
  const [specialties, setSpecialties] = useState<FilterNode[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [filterNames, setFilterNames] = useState<Map<string, string>>(new Map());

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    setLoadingFilters(true);
    try {
      const response = await api.get('/banco-questoes/filters/hierarchy');
      const data = response.data.data || [];
      setSpecialties(data);
      
      // Build names map
      const namesMap = new Map<string, string>();
      const addToMap = (nodes: FilterNode[]) => {
        nodes.forEach(node => {
          namesMap.set(node.id, node.name);
          if (node.children) addToMap(node.children);
        });
      };
      addToMap(data);
      setFilterNames(namesMap);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // ============================================================================
  // IMAGE UPLOAD HANDLER
  // ============================================================================

  const handleImageInsert = useCallback(async (file: File): Promise<string> => {
    setIsUploadingImage(true);
    try {
      // Converter file para data URI
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload para R2
      const result = await r2ImageUploadService.uploadImageToR2(dataUri, {
        customFolder: 'mentor/questions',
        source: 'mentor_question_editor'
      });

      if (result.success) {
        toast.success('Imagem enviada com sucesso!');
        return result.url;
      } else {
        throw new Error('Falha no upload');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao enviar imagem');
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }, [toast]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAlternativeChange = (index: number, text: string) => {
    setAlternatives(prev => prev.map((alt, i) => 
      i === index ? { ...alt, text } : alt
    ));
  };

  const handleCorrectAnswerChange = (index: number) => {
    setAlternatives(prev => prev.map((alt, i) => ({
      ...alt,
      isCorrect: i === index
    })));
  };

  const addAlternative = () => {
    if (alternatives.length >= 8) {
      toast.warning('Máximo de 8 alternativas');
      return;
    }
    const newId = (alternatives.length + 1).toString();
    setAlternatives(prev => [...prev, { id: newId, text: '', isCorrect: false }]);
  };

  const removeAlternative = (index: number) => {
    if (alternatives.length <= 2) {
      toast.warning('Mínimo de 2 alternativas');
      return;
    }
    const removed = alternatives[index];
    const newAlts = alternatives.filter((_, i) => i !== index);
    
    // Se removeu a correta, marcar a primeira
    if (removed.isCorrect && newAlts.length > 0) {
      newAlts[0].isCorrect = true;
    }
    setAlternatives(newAlts);
  };

  const toggleFilter = (id: string) => {
    setSelectedFilters(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleExpandSpecialty = (id: string) => {
    setExpandedSpecialties(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleSave = async () => {
    // Validações
    if (!content.trim() || content === '<p></p>') {
      toast.error('Digite o enunciado da questão');
      return;
    }

    const validAlternatives = alternatives.filter(alt => alt.text.trim());
    if (validAlternatives.length < 2) {
      toast.error('Pelo menos 2 alternativas são obrigatórias');
      return;
    }

    const correctAlt = validAlternatives.find(alt => alt.isCorrect);
    if (!correctAlt) {
      toast.error('Marque uma alternativa como correta');
      return;
    }

    setIsSaving(true);
    try {
      // Processar imagens do conteúdo (converter data URIs para R2)
      let processedContent = content;
      let processedExplanation = explanation;

      // Processar imagens no enunciado
      if (content.includes('data:image/')) {
        const result = await (r2ImageUploadService as any).processQuestionHTML(content, null, 'mentor/questions');
        processedContent = result.html;
      }

      // Processar imagens na explicação
      if (explanation.includes('data:image/')) {
        const result = await (r2ImageUploadService as any).processQuestionHTML(explanation, null, 'mentor/explanations');
        processedExplanation = result.html;
      }

      const questionData: CustomQuestionData = {
        content: processedContent,
        alternatives: validAlternatives,
        correctAnswer: correctAlt.id,
        explanation: processedExplanation,
        subFilterIds: selectedFilters,
        difficulty
      };
      
      await onSave(questionData);
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Erro ao salvar questão');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER FILTER NODE
  // ============================================================================

  const renderFilterNode = (node: FilterNode, depth: number = 0) => {
    const isExpanded = expandedSpecialties.has(node.id);
    const isSelected = selectedFilters.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Filtrar por busca
    const matchesSearch = !specialtySearch || 
      node.name.toLowerCase().includes(specialtySearch.toLowerCase());
    
    const childrenMatch = hasChildren && node.children!.some(child => 
      child.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
      (child.children && child.children.some(gc => gc.name.toLowerCase().includes(specialtySearch.toLowerCase())))
    );

    if (!matchesSearch && !childrenMatch) return null;

    return (
      <div key={node.id}>
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
            hover:bg-primary/5 dark:hover:bg-primary/10 ${depth > 0 ? 'ml-4' : ''}`}
          onClick={() => hasChildren && toggleExpandSpecialty(node.id)}
        >
          {hasChildren ? (
            <span className={`material-symbols-outlined text-sm text-text-light-secondary 
              dark:text-text-dark-secondary transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          ) : <span className="w-5" />}
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onChange={() => toggleFilter(node.id)}
            />
          </div>
          <span 
            className="text-sm text-text-light-primary dark:text-text-dark-primary cursor-pointer
              hover:text-primary transition-colors flex-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleFilter(node.id);
            }}
          >
            {node.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="pl-2">
            {node.children!.map(child => renderFilterNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
      rounded-2xl overflow-hidden border border-border-light dark:border-border-dark
      shadow-xl dark:shadow-dark-xl">
      
      {/* Header */}
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
              Criar Questão Autoral
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Editor avançado com suporte a imagens e formatação rica
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Enunciado */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            Enunciado da Questão *
          </label>
          <div className="relative">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Digite o enunciado da questão..."
              height="200px"
              onImageInsert={handleImageInsert}
            />
            {isUploadingImage && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Enviando imagem...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alternativas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Alternativas * <span className="font-normal text-text-light-secondary">({alternatives.length}/8)</span>
            </label>
            <button
              onClick={addAlternative}
              disabled={alternatives.length >= 8}
              className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-lg font-medium
                hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Adicionar
            </button>
          </div>
          
          <div className="space-y-3">
            {alternatives.map((alt, index) => (
              <div key={alt.id} className="flex items-start gap-3">
                <button
                  onClick={() => handleCorrectAnswerChange(index)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    font-bold text-sm transition-all duration-200 shadow-md mt-1
                    ${alt.isCorrect
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    }`}
                  title={alt.isCorrect ? 'Resposta correta' : 'Clique para marcar como correta'}
                >
                  {String.fromCharCode(65 + index)}
                </button>
                
                <div className="flex-1">
                  <RichTextEditor
                    value={alt.text}
                    onChange={(text) => handleAlternativeChange(index, text)}
                    placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                    height="80px"
                    onImageInsert={handleImageInsert}
                  />
                </div>
                
                {alternatives.length > 2 && (
                  <button
                    onClick={() => removeAlternative(index)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl
                      text-slate-400 hover:text-red-500 transition-all duration-200 mt-1"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Clique na letra para marcar a alternativa correta (verde = correta)
          </p>
        </div>

        {/* Explicação */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            Explicação / Comentário <span className="font-normal text-text-light-secondary">(opcional)</span>
          </label>
          <RichTextEditor
            value={explanation}
            onChange={setExplanation}
            placeholder="Explique a resposta correta..."
            height="150px"
            onImageInsert={handleImageInsert}
          />
        </div>

        {/* Dificuldade */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            Dificuldade
          </label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${difficulty === opt.value
                    ? `${opt.color} ring-2 ring-offset-2 ring-primary/50`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros/Especialidades */}
        <div className="space-y-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary
              hover:text-primary transition-colors"
          >
            <span className={`material-symbols-outlined text-base transition-transform duration-200 ${showFilters ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
            Especialidades / Filtros
            {selectedFilters.length > 0 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {selectedFilters.length} selecionado(s)
              </span>
            )}
          </button>

          {showFilters && (
            <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
              <input
                type="text"
                placeholder="Buscar especialidade..."
                value={specialtySearch}
                onChange={(e) => setSpecialtySearch(e.target.value)}
                className="w-full px-3 py-2 mb-3 bg-surface-light dark:bg-surface-dark
                  border border-border-light dark:border-border-dark rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              
              {/* Selected filters chips */}
              {selectedFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border-light dark:border-border-dark">
                  {selectedFilters.map(id => (
                    <span 
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {filterNames.get(id) || id}
                      <button onClick={() => toggleFilter(id)} className="hover:text-red-500">
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="max-h-64 overflow-y-auto space-y-1">
                {loadingFilters ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  specialties.map(node => renderFilterNode(node))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            * Campos obrigatórios
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-text-light-secondary dark:text-text-dark-secondary
                hover:text-text-light-primary dark:hover:text-text-dark-primary
                transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim() || content === '<p></p>'}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span className="material-symbols-outlined text-sm">check</span>
              {isSaving ? 'Salvando...' : 'Adicionar Questão'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
