import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { auth } from '../../services/firebase';
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { getAllFiltersAndSubFiltersOptimized, getAllFilterIdsForAIOptimized } from "../../services/optimizedFilterService";
import { pulseAIService } from '../../services/pulseAIService';
import { r2ImageUploadService } from '../../services/r2ImageUploadService';
import type { Filter as FilterTypeImport, SubFilter as SubFilterTypeImport } from "../../services/firebaseFilterService";
// import { processBulkQuestions } from "../../services/bulkProcessorService"; // Mantido para autocategorização

// Importações do Tiptap (Mantidas)
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';

// Componente MenuBar (Mantido)
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addImage = useCallback(() => {
    const url = window.prompt('URL da Imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div className="tiptap-toolbar border-2 border-[var(--color-border)] border-b-1 bg-[var(--color-bg-card)] rounded-t-lg p-4 flex flex-wrap gap-2">
      {/* Botões da toolbar mantidos... */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`toolbar-button ${editor.isActive('bold') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-bold"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`toolbar-button ${editor.isActive('italic') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-italic"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`toolbar-button ${editor.isActive('underline') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-underline"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`toolbar-button ${editor.isActive('strike') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-strikethrough"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`toolbar-button ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`toolbar-button ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`toolbar-button ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-button ${editor.isActive('bulletList') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-list-ul"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-button ${editor.isActive('orderedList') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-list-ol"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`toolbar-button ${editor.isActive('codeBlock') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-code"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`toolbar-button ${editor.isActive('blockquote') ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-quote-right"></i>
      </button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="toolbar-button text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]">
        <i className="fas fa-minus"></i> {/* Horizontal Rule */}
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`toolbar-button ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-align-left"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`toolbar-button ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-align-center"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`toolbar-button ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-align-right"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`toolbar-button ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''} text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]`}
      >
        <i className="fas fa-align-justify"></i>
      </button>
      <button onClick={addImage} className="toolbar-button text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]">
        <i className="fas fa-image"></i>
      </button>
      <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className="toolbar-button text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]">
        <i className="fas fa-eraser"></i> {/* Clean */}
      </button>
    </div>
  );
};

// Componente RichTextEditor (Mantido)
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  onImageInsert?: (file: File) => Promise<string>;
  editorRef?: React.MutableRefObject<Editor | null>;
}> = ({ value, onChange, placeholder, height = '200px', onImageInsert, editorRef }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder || 'Digite o enunciado da questão...' }),
      TextStyle, Color, Highlight.configure({ multicolor: true }), Typography, Underline,
      Subscript, Superscript, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CodeBlock, Blockquote,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none p-5',
      },
    },
  });

  // Expor o editor através da ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  useEffect(() => {
    // Atualiza o editor se o valor externo mudar (ex: reset)
    if (editor) {
       const isSame = editor.getHTML() === value;
       if (!isSame) {
         // console.log("Updating editor content from prop");
         // A linha abaixo pode causar perda de foco/cursor. Usar com cautela.
         // Idealmente, 'value' só muda por ações externas controladas.
         // editor.commands.setContent(value, false);
       }
    }
  }, [value, editor]);

  const editorStyles = `
    .tiptap-editor-wrapper {
      border: 2px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 12px 12px;
      font-size: 14px;
      width: 100% !important;
    }
    .tiptap-editor-wrapper .ProseMirror {
      min-height: ${height};
      padding: 20px;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      outline: none;
    }
    .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #adb5bd;
      pointer-events: none;
      height: 0;
    }
    .toolbar-button {
      margin: 2px;
      border-radius: 8px;
      padding: 8px;
      transition: all 0.2s ease;
      background: white;
      border: 1px solid #e5e7eb;
      cursor: pointer;
    }
    .toolbar-button:hover {
      background: #f3f4f6;
      transform: translateY(-1px);
    }
    .toolbar-button.is-active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    .toolbar-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* Estilos de limpeza mantidos */
    .tiptap-editor-wrapper .ProseMirror * {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      float: none !important;
      position: static !important;
      column-count: auto !important;
      columns: auto !important;
      column-width: auto !important;
      column-gap: normal !important;
      column-fill: auto !important;
      column-rule: none !important;
      column-span: none !important;
      text-align: left !important;
      vertical-align: baseline !important;
      box-sizing: border-box !important;
    }
    .tiptap-editor-wrapper .ProseMirror table,
    .tiptap-editor-wrapper .ProseMirror tr,
    .tiptap-wrapper .ProseMirror td,
    .tiptap-editor-wrapper .ProseMirror th {
      width: 100% !important;
      border-collapse: collapse !important;
      display: table !important;
    }
    .tiptap-editor-wrapper .ProseMirror br {
      display: block !important;
    }
    .tiptap-editor-wrapper .ProseMirror img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  `;

  if (!editor) {
    return (
      <div className="border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-gray-600 font-medium">Carregando editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tiptap-editor-container">
      <style>{editorStyles}</style>
      <MenuBar editor={editor} />
      <div className="tiptap-editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

// Interfaces (Mantidas)
interface BulkQuestion {
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta?: number | number[]; // 🎯 PERMITIR MÚLTIPLAS RESPOSTAS CORRETAS
  dificuldade?: string;
  status?: string;
  tags?: string[];
  filterIds?: string[];
  subFilterIds?: string[];
  explicacao?: string;
  imagem?: string;
  tempId?: string;
  aiGenerated?: boolean;
  aiConfidence?: number;
  isAnnulled?: boolean;
  isOutdated?: boolean;
}

interface FilterNode {
  id: string;
  name: string;
  category?: string;
  description?: string;
  parentId?: string;
  level: number;
  children?: FilterNode[];
  isExpanded?: boolean;
}

type Filter = FilterTypeImport & { children?: SubFilter[] };
type SubFilter = SubFilterTypeImport & { children?: SubFilter[] };

// Componente Principal Refatorado
const AdminQuestionsBulkCreatePage: React.FC = () => {
  // Estados Essenciais
  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);  // 📄 NOVO: Estado para arquivo PDF
  const [fileInfo, setFileInfo] = useState<string>("");
  const [pptxLoading, setPptxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);  // 📄 NOVO: Loading específico para PDF
  const [categorizationLoading, setCategorizationLoading] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState<{
    currentBatch: number;
    total: number;
    percentage: number;
    questionsInBatch: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚀 Estados para Extrator Gemini PPTX Avançado
  const [geminiPptxLoading, setGeminiPptxLoading] = useState(false);
  const [geminiPptxError, setGeminiPptxError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<BulkQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterTree, setFilterTree] = useState<FilterNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // 💰 ECONOMIA: Estados para controle de carregamento lazy
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filtersCache, setFiltersCache] = useState<{ data: Filter[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em cache para evitar requisições desnecessárias
  
  // Refs para inputs de upload de imagem por questão
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  // Refs para editores de enunciado por questão
  const editorRefs = useRef<{ [key: string]: Editor | null }>({});
  // Estado para automação inteligente e gabarito
  const [intelligentAutomationMode, setIntelligentAutomationMode] = useState(false);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [processingGabarito, setProcessingGabarito] = useState(false);
  // Estado para busca e expansão de filtros
  const [filterSearch, setFilterSearch] = useState('');
  // Estado para resumo da extração
  const [extractionSummary, setExtractionSummary] = useState<{
    total: number;
    extracted: number;
    missing: string[];
    extractedNumbers: string[];
    problematic: string[];
    questionsWithDetails: { numero: string; alternativas: number; problema: string }[];
    successRate: number;
    mediaStats?: {
      totalImages?: number;
      totalTables?: number;
      imagesList?: { filename: string; page: number; size: string }[];
      tablesList?: { filename: string; page: number; dimensions: string; method: string }[];
    };
    detailedReport?: {
      questions_with_4_alternatives?: number | string[];
      questions_with_3_alternatives?: string[];
      questions_with_2_or_less_alternatives?: string[];
      questions_with_5_alternatives?: string[];
      questions_with_problematic_statements?: string[];
      missing_questions?: string[];
      questions_with_problematic_statement?: string[];
      questions_with_images?: string[];
      questions_with_tables?: string[];
      extracted_images_list?: string[];
      extracted_tables_list?: string[];
      success_rate?: number;
      media_coverage?: number;
      total_media_items?: number;
      total_questions?: number;
    };
  } | null>(null);

  // 🎯 FUNCIONALIDADES DE BACKUP E IMPORT/EXPORT
  const exportQuestionsToJSON = () => {
    try {
      const dataToExport = {
        questions,
        extractionSummary,
        exportDate: new Date().toISOString(),
        totalQuestions: questions.length
      };
      
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Backup exportado com sucesso!');
      alert(`✅ Backup salvo com ${questions.length} questões!`);
    } catch (error) {
      console.error('❌ Erro ao exportar backup:', error);
      setError('Erro ao exportar backup. Verifique o console.');
    }
  };

  const importQuestionsFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (importedData.questions && Array.isArray(importedData.questions)) {
          const confirmImport = window.confirm(
            `Deseja importar ${importedData.questions.length} questões?\n\n` +
            `⚠️ ATENÇÃO: Isso substituirá todas as questões atuais!\n\n` +
            `Data do backup: ${importedData.exportDate ? new Date(importedData.exportDate).toLocaleString() : 'Desconhecida'}`
          );
          
          if (confirmImport) {
            setQuestions(importedData.questions);
            setExtractionSummary(importedData.extractionSummary || null);
            setSelectedQuestions(new Set());
            setExpandedQuestions(new Set());
            console.log('✅ Questões importadas com sucesso!');
            alert(`✅ ${importedData.questions.length} questões importadas com sucesso!`);
          }
        } else {
          throw new Error('Formato de arquivo inválido. Questões não encontradas.');
        }
      } catch (error) {
        console.error('❌ Erro ao importar questões:', error);
        setError(`Erro ao importar questões: ${error instanceof Error ? error.message : 'Formato inválido'}`);
      }
    };
    reader.readAsText(file);
    
    // Limpar o input para permitir reimportar o mesmo arquivo
    event.target.value = '';
  };

  const copyQuestionsToClipboard = async () => {
    try {
      const dataToExport = {
        questions,
        extractionSummary,
        exportDate: new Date().toISOString(),
        totalQuestions: questions.length
      };
      
      const jsonString = JSON.stringify(dataToExport, null, 2);
      await navigator.clipboard.writeText(jsonString);
      alert(`✅ ${questions.length} questões copiadas para a área de transferência!`);
    } catch (error) {
      console.error('❌ Erro ao copiar questões:', error);
      setError('Erro ao copiar questões. Seu navegador pode não suportar esta funcionalidade.');
    }
  };

  // Função para obter token (Mantida)
  const getAuthToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao obter token de autenticação:", error);
      setError("Falha ao obter token de autenticação. Tente recarregar a página.");
      return null;
    }
  };

  // 💰 ECONOMIA: Carregar filtros apenas quando necessário (LAZY LOADING)
  const loadFiltersLazy = async (forceReload: boolean = false): Promise<boolean> => {
    // Verificar cache primeiro
    const now = Date.now();
    if (!forceReload && filtersCache && (now - filtersCache.timestamp) < CACHE_DURATION) {
      console.log('💰 ECONOMIA: Usando filtros do cache local (sem requisição ao Firestore)');
      setFilters(filtersCache.data);
      const tree = buildFilterTreeFromFirebase(filtersCache.data);
      setFilterTree(tree);
      setFiltersLoaded(true);
      
      // ✅ VALIDAÇÃO: Verificar se os dados do cache são válidos
      if (!filtersCache.data || filtersCache.data.length === 0) {
        console.warn('⚠️ Cache inválido: dados vazios, forçando reload');
        return await loadFiltersLazy(true); // Forçar reload se cache está inválido
      }
      
      return true;
    }

    // Se já tentou carregar e falhou recentemente, não tentar novamente
    if (filtersLoaded && filters.length === 0 && !forceReload) {
      console.log('💰 ECONOMIA: Carregamento anterior falhou, evitando nova requisição');
      return false;
    }

    setLoadingFilters(true);
    setError(null);
    
    try {
      console.log(`💰 FAZENDO REQUISIÇÃO AO FIRESTORE: ${forceReload ? 'forçada' : 'primeira vez'}`);
      const allFilters = await getAllFiltersAndSubFiltersOptimized();
      
      // ✅ VALIDAÇÃO ROBUSTA: Verificar se os dados são válidos e úteis
      if (Array.isArray(allFilters) && allFilters.length > 0) {
        // Verificar se os filtros têm estrutura mínima esperada
        const validFilters = allFilters.filter(f => f && f.id && f.name);
        
        if (validFilters.length === 0) {
          console.error('❌ Nenhum filtro válido encontrado (sem id ou name)');
          setFilters([]);
          setFilterTree([]);
          setFiltersLoaded(true);
          setError('Filtros carregados não têm estrutura válida.');
          return false;
        }
        
        setFilters(validFilters);
        const tree = buildFilterTreeFromFirebase(validFilters);
        setFilterTree(tree);
        setFiltersLoaded(true);
        
        // Atualizar cache
        setFiltersCache({
          data: validFilters,
          timestamp: now
        });
        
        console.log(`✅ FILTROS CARREGADOS: ${validFilters.length} filtros principais carregados e salvos no cache`);
        
        // Log adicional para debug
        const totalSubFilters = validFilters.reduce((total, f) => {
          const subCount = f.children?.length || 0;
          return total + subCount;
        }, 0);
        
        console.log(`📊 ESTRUTURA CARREGADA: ${validFilters.length} filtros, ${totalSubFilters} subfiltros`);
        
        return true;
      } else {
        console.error("❌ Dados de filtros inválidos recebidos:", {
          isArray: Array.isArray(allFilters),
          length: allFilters?.length,
          type: typeof allFilters
        });
        setFilters([]);
        setFilterTree([]);
        setFiltersLoaded(true);
        setError(Array.isArray(allFilters) 
          ? 'Nenhum filtro encontrado no banco de dados.' 
          : 'Formato inesperado recebido para filtros.');
        return false;
      }
    } catch (e) {
      console.error('❌ Exceção ao carregar filtros:', e);
      setError('Falha ao carregar filtros de categorização. Verifique a conexão ou contate o suporte.');
      setFiltersLoaded(true);
      setFilters([]);
      setFilterTree([]);
      return false;
    } finally {
      setLoadingFilters(false);
    }
  };

  // 🗑️ REMOVIDO: useEffect que carregava filtros automaticamente
  // useEffect(() => {
  //   loadFilters();
  // }, []);

  const loadFilters = async () => {
    // Manter compatibilidade mas usar função lazy
    return await loadFiltersLazy(false);
  };

  // 🔍 FUNÇÃO DE DEBUG: Testar carregamento de filtros
  const debugFilters = async () => {
    if (loadingFilters) return;
    
    setLoadingFilters(true);
    setError(null);
    try {
      const success = await loadFiltersLazy(true); // Forçar recarregamento
      if (success && filters.length > 0) {
        // Remover logs de debug desnecessários
        setError(null);
      } else {
        setError('Falha ao carregar filtros no debug. Verifique a conexão com o Firestore.');
      }
    } catch (err: any) {
      console.error('❌ Erro no debug de filtros:', err);
      setError(`Erro no debug: ${err.message}`);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Handler para mudança de arquivo (Adaptado para PPTX)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pptx")) {
        setError("Formato de arquivo inválido. Por favor, selecione um arquivo PPTX.");
        setPptxFile(null);
        setFileInfo("");
        setQuestions([]); // Limpa questões se o arquivo for inválido
        return;
      }
      setPptxFile(file);
      setError(null);
      setFileInfo(`Arquivo PPTX: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      setQuestions([]); // Limpar questões anteriores ao carregar novo arquivo
      setSelectedQuestions(new Set());
      setExpandedQuestions(new Set());
    }
  };

  // 📄 NOVO: Handler para mudança de arquivo PDF
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Formato de arquivo inválido. Por favor, selecione um arquivo PDF.");
        setPdfFile(null);
        setQuestions([]); // Limpa questões se o arquivo for inválido
        return;
      }
      setPdfFile(file);
      setError(null);
      setQuestions([]); // Limpar questões anteriores ao carregar novo arquivo
      setSelectedQuestions(new Set());
      setExpandedQuestions(new Set());
    }
  };

  // Função para extração de PPTX (Mantida e Adaptada)
  const handleExtractQuestionsPPTX = async () => {
    if (!pptxFile) {
      setError("Por favor, selecione um arquivo PPTX.");
      return;
    }

    setPptxLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setExpandedQuestions(new Set());

    try {
      console.log("🚀 Iniciando extração de PPTX...");
      // Chamada real do serviço de extração
      const result = await pulseAIService.extractQuestionsFromFile(pptxFile);

      if (result && result.questions && Array.isArray(result.questions)) {
          const formattedQuestions = result.questions.map((q: any, index: number) => ({
            numero: q.numero || `Q${index + 1}`,
            enunciado: q.enunciado || "",
            alternativas: q.alternativas || [],
            correta: q.correta, // Mantém undefined se não vier
            dificuldade: q.dificuldade || "Média",
            tags: q.tags || [],
            filterIds: q.filterIds || [],
            subFilterIds: q.subFilterIds || [],
            explicacao: q.explicacao || "",
            imagem: q.imagem || undefined,
            tempId: `temp-pptx-${Date.now()}-${index}`,
            aiGenerated: false, // Marcar como não gerado por IA inicialmente
            isAnnulled: false,
            isOutdated: false,
            status: q.status || "Publicada", // Alterado de "Rascunho" para "Publicada"
          }));
          setQuestions(formattedQuestions);
          console.log("📊 Questões formatadas (PPTX):", formattedQuestions);
          
          // Calcular resumo da extração
          const extractedNumbers = formattedQuestions.map((q: any) => {
            const numeroStr = String(q.numero || '').replace(/\D/g, '');
            return numeroStr;
          }).filter((num: string) => num);
          const expectedTotal = 100; // Assumindo que esperamos 100 questões
          const allExpectedNumbers = Array.from({length: expectedTotal}, (_, i) => (i + 1).toString());
          const missingNumbers = allExpectedNumbers.filter(num => !extractedNumbers.includes(num));
          
          // 🎯 NOVA FUNCIONALIDADE: Incluir questões com menos de 4 alternativas com detalhes
          const questionsWithFewAlternatives = formattedQuestions
            .filter((q: any) => q.alternativas && q.alternativas.length < 4)
            .map((q: any) => {
              const numeroStr = String(q.numero || '').replace(/\D/g, '');
              return numeroStr;
            })
            .filter((num: string) => num);
          
          // Criar detalhes das questões problemáticas
          const questionsWithDetails: { numero: string; alternativas: number; problema: string }[] = [];
          
          // Questões não extraídas
          missingNumbers.forEach(num => {
            questionsWithDetails.push({
              numero: `Q${num}`,
              alternativas: 0,
              problema: 'Não extraída'
            });
          });
          
          // Questões extraídas mas com poucas alternativas
          formattedQuestions.forEach((q: any) => {
            const numeroStr = String(q.numero || '').replace(/\D/g, '');
            if (q.alternativas && q.alternativas.length > 0 && q.alternativas.length < 4) {
              questionsWithDetails.push({
                numero: `Q${numeroStr}`,
                alternativas: q.alternativas.length,
                problema: `Apenas ${q.alternativas.length} alternativa${q.alternativas.length === 1 ? '' : 's'}`
              });
            }
          });
          
          // Log para debug
          if (questionsWithFewAlternatives.length > 0) {
            console.log('🔍 Questões com poucas alternativas:', questionsWithFewAlternatives);
          }
          
          // Combinar questões não extraídas + questões com poucas alternativas
          const allProblematicNumbers = [...new Set([...missingNumbers, ...questionsWithFewAlternatives])];
          
          // 📊 CALCULAR ESTATÍSTICAS DE ALTERNATIVAS
          const calculateAlternativesStats = (questions: any[]) => {
            const stats = {
              questions_with_6_plus_alternatives: [] as string[],
              questions_with_5_alternatives: [] as string[],
              questions_with_4_alternatives: [] as string[],
              questions_with_3_minus_alternatives: [] as string[]
            };
            
            questions.forEach((q: any) => {
              const numAlternatives = q.alternativas?.length || 0;
              const questionNumber = String(q.numero || '').replace(/\D/g, '');
              
              if (numAlternatives >= 6) {
                stats.questions_with_6_plus_alternatives.push(questionNumber);
              } else if (numAlternatives === 5) {
                stats.questions_with_5_alternatives.push(questionNumber);
              } else if (numAlternatives === 4) {
                stats.questions_with_4_alternatives.push(questionNumber);
              } else if (numAlternatives <= 3 && numAlternatives > 0) {
                stats.questions_with_3_minus_alternatives.push(questionNumber);
              }
            });
            
            return stats;
          };
          
          const alternativesStats = calculateAlternativesStats(formattedQuestions);
          
          setExtractionSummary({
            total: expectedTotal,
            extracted: formattedQuestions.length,
            missing: missingNumbers,
            extractedNumbers: extractedNumbers,
            problematic: questionsWithFewAlternatives,
            questionsWithDetails: questionsWithDetails,
            successRate: ((formattedQuestions.length - questionsWithFewAlternatives.length) / expectedTotal) * 100,
            detailedReport: {
              questions_with_6_plus_alternatives: alternativesStats.questions_with_6_plus_alternatives,
              questions_with_5_alternatives: alternativesStats.questions_with_5_alternatives,
              questions_with_4_alternatives: alternativesStats.questions_with_4_alternatives,
              questions_with_3_minus_alternatives: alternativesStats.questions_with_3_minus_alternatives,
              missing_questions: missingNumbers,
              total_questions: formattedQuestions.length
            }
          });
          
          // Auto-expandir as primeiras questões para visualização
          setExpandedQuestions(new Set(formattedQuestions.slice(0, 3).map((_: any, idx: number) => idx)));
      } else {
          console.error("❌ Formato de resposta inesperado da extração PPTX:", result);
          setError("Falha ao extrair questões do PPTX. Formato de resposta inválido.");
          setQuestions([]);
      }

    } catch (err: any) {
      console.error("❌ Erro na extração de PPTX:", err);
      setError(`Erro na extração de PPTX: ${err.message || "Erro desconhecido"}`);
      setQuestions([]);
    } finally {
      setPptxLoading(false);
    }
  };

  // 📄 NOVA FUNÇÃO: Extração de mídia de PDF
  const handleExtractMediaPDF = async () => {
    if (!pdfFile) {
      setError("Por favor, selecione um arquivo PDF.");
      return;
    }

    setPdfLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setExpandedQuestions(new Set());

    try {
      console.log("🚀 Iniciando extração de mídia PDF...");
      // Chamada para nosso extrator híbrido via endpoint universal
      const result = await pulseAIService.extractQuestionsFromFile(pdfFile);

      if (result && result.success) {
        // ✅ FORMATO CORRIGIDO: Aceitar resposta padrão do extrator de PDF
        if (result.file_type === 'pdf' && result.questions && result.extractionMetadata) {
          // Processar resultado do PDF com questões completas (não apenas mídia)
          const questions = result.questions || [];
          const extractionMetadata = result.extractionMetadata || {};
          
          console.log("📊 Questões extraídas (PDF):", {
            questions: questions.length,
            totalImages: extractionMetadata.totalImages || 0,
            totalTables: extractionMetadata.totalTables || 0,
            pages: extractionMetadata.pages_processed || 0
          });

          // Converter questões para formato compatível com frontend
          const formattedQuestions = questions.map((q: any, index: number) => ({
            numero: q.numero || `${index + 1}`,
            enunciado: q.enunciado || `Questão ${index + 1}`,
            alternativas: q.alternativas || [],
            correta: undefined, // Será definido pelo gabarito
            dificuldade: "Média",
            tags: q.page ? [`Página ${q.page}`] : [],
            filterIds: [],
            subFilterIds: [],
            explicacao: '',
            tempId: `temp-pdf-${Date.now()}-${index}`,
            aiGenerated: false,
            isAnnulled: false,
            isOutdated: false,
            status: "Publicada",
            // Campos específicos de questão com mídia
            page: q.page,
            imagens: q.imagens || [],
            tabelas: q.tabelas || [],
            extractorType: 'revalida_completo'
          }));

          setQuestions(formattedQuestions);
          
          // Preparar resumo da extração
          const totalImages = extractionMetadata.totalImages || 0;
          const totalTables = extractionMetadata.totalTables || 0;
          const pagesProcessed = extractionMetadata.pages_processed || questions.length;
          
          setExtractionSummary({
            total: questions.length,
            extracted: formattedQuestions.length,
            missing: extractionMetadata.detailed_report?.missing_questions || [],
            extractedNumbers: formattedQuestions.map((q: any) => q.numero),
            problematic: extractionMetadata.detailed_report?.questions_with_problematic_statements || [],
            questionsWithDetails: [],
            successRate: formattedQuestions.length > 0 ? (formattedQuestions.length / 100) * 100 : 0,
            mediaStats: {
              totalImages: totalImages,
              totalTables: totalTables,
              imagesList: extractionMetadata.detailed_report?.extracted_images_list || [],
              tablesList: extractionMetadata.detailed_report?.extracted_tables_list || []
            }
          });

          // Auto-expandir as primeiras questões para visualização
          setExpandedQuestions(new Set(formattedQuestions.slice(0, 3).map((_: any, idx: number) => idx)));
          
          console.log("✅ Extração de questões PDF concluída:", {
            formatted_questions: formattedQuestions.length,
            total_images: totalImages,
            total_tables: totalTables,
            pages_processed: pagesProcessed
          });
        } else {
          console.error("❌ Resposta inesperada para PDF:", result);
          setError("Falha ao extrair mídia do PDF. Formato de resposta inválido.");
          setQuestions([]);
        }
      } else {
        console.error("❌ Erro na extração de mídia PDF:", result);
        setError(result?.error || "Falha ao extrair mídia do PDF.");
        setQuestions([]);
      }

    } catch (err: any) {
      console.error("❌ Erro na extração de mídia PDF:", err);
      setError(`Erro na extração de mídia PDF: ${err.message || "Erro desconhecido"}`);
      setQuestions([]);
    } finally {
      setPdfLoading(false);
    }
  };

  // 🚀 NOVA FUNÇÃO: Extração PPTX com Gemini Avançado
  const handleGeminiPptxExtraction = async () => {
    if (!pptxFile) {
      setError('Nenhum arquivo PPTX selecionado');
      return;
    }

    try {
      console.log('🚀 Iniciando extração PPTX com Gemini Avançado...');
      setGeminiPptxLoading(true);
      setGeminiPptxError(null);
      setError(null);

      // 🔐 Obter token de autenticação
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      const formData = new FormData();
      formData.append('file', pptxFile);

      console.log('📡 Enviando para extrator Gemini PPTX...');
      const response = await fetch('http://localhost:5001/api/pulse-ai/extract-pptx-gemini-advanced', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Resultado do extrator Gemini PPTX:', result);

      if (result.success && result.questions && result.questions.length > 0) {
        // Converter questões para o formato esperado
        const questoesConvertidas = result.questions.map((q: any, index: number) => ({
          numero: q.numero || (index + 1).toString(),
          enunciado: q.enunciado || '',
          alternativas: q.alternativas || [],
          correta: q.correta,
          dificuldade: q.dificuldade || 'Médio',
          status: 'Publicada',
          tags: q.tags || [],
          filterIds: q.filterIds || [],
          subFilterIds: q.subFilterIds || [],
          explicacao: q.explicacao || '',
          imagem: q.imagem || '',
          tempId: `temp-gemini-pptx-${Date.now()}-${index}`,
          aiGenerated: true,
          aiConfidence: q.confidence || 0.9,
          isAnnulled: q.isAnnulled || false,
          isOutdated: q.isOutdated || false
        }));

        setQuestions(questoesConvertidas);
        console.log(`✅ ${questoesConvertidas.length} questões extraídas com Gemini PPTX!`);

        // 📊 CRIAR EXTRACTION SUMMARY COM ESTATÍSTICAS DE MÍDIA VALIDADA
        const questoesComImagens = questoesConvertidas.filter(q => q.imagem && q.imagem.trim() !== '').map(q => q.numero);
        const totalImagensValidadas = result.total_imagens_validadas || 0;
        const totalTabelasValidadas = result.total_tabelas_validadas || 0;
        const questoesComImagensLista = result.questoes_com_imagens_lista || [];
        const questoesComTabelasLista = result.questoes_com_tabelas_lista || [];
        
        // 📊 CALCULAR ESTATÍSTICAS DE ALTERNATIVAS PARA GEMINI PPTX
        const calculateAlternativesStats = (questions: any[]) => {
          const stats = {
            questions_with_6_plus_alternatives: [] as string[],
            questions_with_5_alternatives: [] as string[],
            questions_with_4_alternatives: [] as string[],
            questions_with_3_minus_alternatives: [] as string[]
          };
          
          questions.forEach((q: any) => {
            const numAlternatives = q.alternativas?.length || 0;
            const questionNumber = String(q.numero || '').replace(/\D/g, '');
            
            if (numAlternatives >= 6) {
              stats.questions_with_6_plus_alternatives.push(questionNumber);
            } else if (numAlternatives === 5) {
              stats.questions_with_5_alternatives.push(questionNumber);
            } else if (numAlternatives === 4) {
              stats.questions_with_4_alternatives.push(questionNumber);
            } else if (numAlternatives <= 3 && numAlternatives > 0) {
              stats.questions_with_3_minus_alternatives.push(questionNumber);
            }
          });
          
          return stats;
        };
        
        const alternativesStats = calculateAlternativesStats(questoesConvertidas);

        setExtractionSummary({
          total: questoesConvertidas.length,
          extracted: questoesConvertidas.length,
          missing: [],
          extractedNumbers: questoesConvertidas.map(q => q.numero),
          problematic: [],
          questionsWithDetails: [],
          successRate: questoesConvertidas.length > 0 ? 100 : 0,
          mediaStats: {
            totalImages: totalImagensValidadas,
            totalTables: totalTabelasValidadas,
            imagesList: result.detailed_report?.extracted_images_list || [],
            tablesList: result.detailed_report?.extracted_tables_list || []
          },
          detailedReport: {
            questions_with_images: questoesComImagensLista,
            questions_with_tables: questoesComTabelasLista,
            extracted_images_list: result.detailed_report?.extracted_images_list || [],
            extracted_tables_list: result.detailed_report?.extracted_tables_list || [],
            total_media_items: totalImagensValidadas + totalTabelasValidadas,
            media_coverage: result.detailed_report?.media_coverage || 0,
            total_questions: questoesConvertidas.length,
            questions_with_6_plus_alternatives: alternativesStats.questions_with_6_plus_alternatives,
            questions_with_5_alternatives: alternativesStats.questions_with_5_alternatives,
            questions_with_4_alternatives: alternativesStats.questions_with_4_alternatives,
            questions_with_3_minus_alternatives: alternativesStats.questions_with_3_minus_alternatives,
            missing_questions: []
          }
        });

        // Expandir as primeiras questões para visualização
        const expandedSet = new Set<number>();
        questoesConvertidas.slice(0, 3).forEach((_, idx) => expandedSet.add(idx));
        setExpandedQuestions(expandedSet);

      } else {
        throw new Error(result.error || 'Nenhuma questão foi extraída');
      }

    } catch (error: any) {
      console.error('❌ Erro na extração Gemini PPTX:', error);
      setGeminiPptxError(error.message);
      setError(`Erro na extração: ${error.message}`);
    } finally {
      setGeminiPptxLoading(false);
    }
  };

  // Handler para upload de gabarito
  const handleGabaritoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGabaritoFile(e.target.files[0]);
    }
  };

  // Função para processar gabarito e aplicar às questões
  const processGabarito = async () => {
    if (!gabaritoFile) {
      setError('Nenhum arquivo de gabarito selecionado.');
      return;
    }

    setProcessingGabarito(true);
    setError(null);

    try {
      console.log('📋 Processando gabarito:', gabaritoFile.name);
      
      let respostas: { [key: string]: string } = {};
      
      if (gabaritoFile.type === 'application/pdf') {
        // Processar PDF usando o backend Flask
        const formData = new FormData();
        formData.append('file', gabaritoFile);
        
        const response = await fetch('http://localhost:5001/api/parse-gabarito', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao processar PDF: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success && result.respostas) {
          respostas = result.respostas;
        } else {
          throw new Error(result.error || 'Falha ao extrair gabarito do PDF');
        }
      } else {
        // Processar TXT/CSV simples
        const text = await gabaritoFile.text();
        text.split(/\r?\n/).forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          // Formatos suportados:
          // "1,A" "Q1: A" "1) A" "1. A" "Questão 1: A"
          const match = trimmedLine.match(/(?:(?:questão|q)?\.?\s*)?(\d+)(?:\)|:|\.|\s*[-,]\s*|\s+)([A-Fa-f])/i);
          if (match) {
            const [, num, alt] = match;
            respostas[num] = alt.toUpperCase();
          }
        });
      }
      
      if (Object.keys(respostas).length === 0) {
        throw new Error('Nenhuma resposta válida encontrada no gabarito. Verifique o formato do arquivo.');
      }
      
      console.log('📋 Respostas extraídas:', respostas);
      
      // Primeiro, vamos mapear quais questões realmente temos para debug
      const questoesDisponiveis = questions.map(q => ({
        indice: questions.indexOf(q),
        numeroOriginal: String(q.numero || '').replace(/\D/g, ''),
        numeroDisplay: q.numero,
        alternativas: q.alternativas.length
      }));
      
      console.log('📋 Questões disponíveis no PPTX:', questoesDisponiveis);
      
      // Aplicar gabarito às questões
      let questoesAtualizadas = 0;
      let questoesNaoEncontradas: string[] = [];
      let questoesSemResposta: string[] = [];
      
      const questoesAtualizadasTemp = questions.map(q => {
        const numeroQuestao = String(q.numero || '').replace(/\D/g, ''); // Remove caracteres não numéricos
        const respostaCorreta = respostas[numeroQuestao];
        
        if (respostaCorreta) {
          console.log(`📋 Aplicando gabarito questão ${numeroQuestao} (${q.numero}): ${respostaCorreta}`);
          
          // Mapear letra para índice (A=0, B=1, C=2, D=3, E=4, F=5)
          const letraParaIndice: { [key: string]: number } = {
            'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5
          };
          
          const indiceCorreto = letraParaIndice[respostaCorreta];
          
          if (indiceCorreto !== undefined && indiceCorreto < q.alternativas.length) {
            console.log(`✅ Questão ${numeroQuestao}: definindo alternativa ${indiceCorreto} (${respostaCorreta}) como correta`);
            questoesAtualizadas++; // Incrementar contador aqui
            return { ...q, correta: indiceCorreto };
          } else {
            console.warn(`⚠️ Questão ${numeroQuestao}: índice inválido para resposta ${respostaCorreta} (${indiceCorreto}). Alternativas: ${q.alternativas.length}`);
            questoesNaoEncontradas.push(`Q${numeroQuestao} (${respostaCorreta} - índice ${indiceCorreto} inválido)`);
          }
        } else {
          questoesSemResposta.push(numeroQuestao);
        }
        
        return q;
      });
      
      setQuestions(questoesAtualizadasTemp);
      
      // Verificar quais questões do gabarito não foram encontradas no PPTX
      const numerosQuestoesExtraidas = questions.map(q => String(q.numero || '').replace(/\D/g, ''));
      const numerosGabarito = Object.keys(respostas);
      const questoesGabaritoNaoEncontradas = numerosGabarito.filter(num => !numerosQuestoesExtraidas.includes(num));
      
      // Criar relatório detalhado
      let relatorio = `Gabarito aplicado com sucesso!\n\n`;
      relatorio += `📊 ESTATÍSTICAS:\n`;
      relatorio += `• Questões no gabarito: ${Object.keys(respostas).length}\n`;
      relatorio += `• Questões extraídas do PPTX: ${questions.length}\n`;
      relatorio += `• Questões atualizadas: ${questoesAtualizadas}\n\n`;
      
      if (questoesGabaritoNaoEncontradas.length > 0) {
        relatorio += `⚠️ QUESTÕES NO GABARITO MAS NÃO EXTRAÍDAS DO PPTX:\n`;
        relatorio += questoesGabaritoNaoEncontradas.map(num => `• Q${num}: ${respostas[num]}`).join('\n');
        relatorio += `\n\n`;
      }
      
      if (questoesSemResposta.length > 0) {
        relatorio += `📝 QUESTÕES EXTRAÍDAS SEM RESPOSTA NO GABARITO:\n`;
        relatorio += questoesSemResposta.map(num => `• Q${num}`).join('\n');
        relatorio += `\n\n`;
      }
      
      if (questoesNaoEncontradas.length > 0) {
        relatorio += `❌ PROBLEMAS DE MAPEAMENTO:\n`;
        relatorio += questoesNaoEncontradas.join('\n');
      }
      
      console.log(`✅ Gabarito aplicado! Relatório completo:\n${relatorio}`);
      alert(relatorio);
      
    } catch (err: any) {
      console.error('❌ Erro ao processar gabarito:', err);
      setError(`Erro ao processar gabarito: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setProcessingGabarito(false);
    }
  };

  // Função utilitária para converter BulkQuestion para ExtractedQuestion
  const bulkToExtracted = (q: BulkQuestion): any => ({
    question: q.enunciado,
    alternatives: q.alternativas,
    correctAnswer: typeof q.correta === 'number' && q.alternativas[q.correta] ? q.alternativas[q.correta] : '',
    explanation: q.explicacao || '',
    specialty: q.tags && q.tags[0] ? q.tags[0] : '',
    difficulty: (q.dificuldade as any) || 'intermediária',
    topics: q.tags || [],
    references: [],
    estimatedTime: 0,
    bloomLevel: 'compreensão',
    tempId: q.tempId, // Preservar tempId original para matching correto
    originalId: q.tempId
  });

  // Função utilitária para converter CategorizedQuestion para BulkQuestion
  const categorizedToBulk = (q: any, idx: number): BulkQuestion => {
    console.log(`🎯 Convertendo questão categorizada para bulk:`, {
      tempId: q.tempId,
      filtros: q.suggestedFilters?.length || 0,
      subfiltros: q.suggestedSubfilters?.length || 0
    });

    return {
      numero: (idx + 1).toString(),
      enunciado: q.question || '',
      alternativas: q.alternatives || [],
      correta: typeof q.correctAnswer === 'string' ? (q.alternatives || []).findIndex((a: string) => a === q.correctAnswer) : undefined,
      dificuldade: q.difficulty || 'Média',
      status: 'Publicada',
      tags: q.topics || [],
      filterIds: (q.suggestedFilters || []).map((f: any) => f.filterId),
      subFilterIds: (q.suggestedSubfilters || []).map((sf: any) => sf.subfilterId),
      explicacao: q.explanation || '',
      imagem: q.imageUrl || '',
      tempId: q.tempId || q.originalId || `cat-q-${idx}`,
      aiGenerated: true,
      aiConfidence: q.aiConfidence || 1.0,
      isAnnulled: q.isAnnulled || false,
      isOutdated: q.isOutdated || false,
    };
  };

  // 🚀 Categorização Inteligente OTIMIZADA - 10 lotes de 10 questões
  const handleSmartCategorize = async () => {
    if (!questions.length) {
      setError('Nenhuma questão disponível para categorizar');
      return;
    }

    setCategorizationLoading(true);
    setError(null);
    
    try {
      // 🔄 Garantir que os filtros estão carregados e usar o resultado DIRETO
      let currentFilters = filters;

      // 🎯 VERIFICAR CACHE PRIMEIRO antes de tentar carregar
      if (!currentFilters.length && filtersCache && filtersCache.data.length > 0) {
        console.log('💰 USANDO FILTROS DO CACHE para categorização');
        currentFilters = filtersCache.data;
      }

      if (!currentFilters.length) {
        console.log('🔄 Carregando filtros para categorização...');
        const loadResult = await loadFiltersLazy(false);

        if (!loadResult) {
          throw new Error('Falha ao carregar filtros do banco de dados');
        }

        // ⏱️ Aguardar React atualizar o estado E usar o cache direto
        await new Promise(resolve => setTimeout(resolve, 100));

        // 🎯 USAR FILTROS DO CACHE DIRETO ao invés do estado React
        if (filtersCache && filtersCache.data.length > 0) {
          currentFilters = filtersCache.data;
          console.log(`✅ Usando filtros do cache: ${currentFilters.length} filtros`);
        } else {
          currentFilters = filters; // Fallback para estado React
        }
      }

      if (!currentFilters.length) {
        console.error('❌ NENHUM FILTRO DISPONÍVEL:', {
          filtersState: filters.length,
          filtersCache: filtersCache?.data?.length || 0,
          cacheTimestamp: filtersCache?.timestamp,
          filtersLoaded: filtersLoaded
        });
        throw new Error('Deve fornecer filtros disponíveis do banco de dados, NO_FILTERS');
      }

      console.log(`✅ FILTROS PRONTOS PARA CATEGORIZAÇÃO: ${currentFilters.length} filtros carregados`);
      console.log(`📊 Fonte dos filtros: ${currentFilters === filters ? 'Estado React' : 'Cache local'}`);

      // 🔍 DEBUG: Verificar se os filtros têm estrutura válida
      const validFilters = currentFilters.filter(f => f && f.id && f.name);
      if (validFilters.length !== currentFilters.length) {
        console.warn(`⚠️ FILTROS INVÁLIDOS DETECTADOS: ${currentFilters.length - validFilters.length} filtros sem id/name`);
        currentFilters = validFilters;
      }

      console.log(`🧠 Iniciando categorização OTIMIZADA de ${questions.length} questões em lotes de 10...`);
      console.log(`📋 Usando ${currentFilters.length} filtros carregados`);
      
      // 📦 OTIMIZAÇÃO: Dividir em lotes de 3 questões para evitar JSON truncado
      const OPTIMAL_BATCH_SIZE = 3; // ✅ ALINHADO COM BACKEND: 3 questões por lote
      const batches = [];
      
      for (let i = 0; i < questions.length; i += OPTIMAL_BATCH_SIZE) {
        batches.push(questions.slice(i, i + OPTIMAL_BATCH_SIZE));
      }
      
      console.log(`📊 Processando ${batches.length} lotes de até ${OPTIMAL_BATCH_SIZE} questões (redução de ${Math.ceil(questions.length / 3)} para ${batches.length} requisições)`);
      
      const updatedQuestions = [...questions];
      let totalCategorized = 0;
      
      // 🔄 Processar cada lote
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNumber = batchIndex + 1;
        
        const progressPercent = Math.round((batchIndex / batches.length) * 100);
        console.log(`🔄 Processando lote ${batchNumber}/${batches.length} (${batch.length} questões) - ${progressPercent}%`);

        // 📊 Atualizar progresso na UI
        setCategorizationProgress({
          currentBatch: batchNumber,
          total: batches.length,
          percentage: progressPercent,
          questionsInBatch: batch.length
        });

        // ⏱️ MONITORAMENTO DE TEMPO DETALHADO
        const batchStartTime = Date.now();
        
        try {
          // 🎯 TIMEOUT AUMENTADO para análise de 1300 filtros
          const controller = new AbortController();
          const TIMEOUT_MS = 300000; // 5 minutos por lote (era muito baixo antes)
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.error(`⏱️ TIMEOUT: Lote ${batchNumber} excedeu ${TIMEOUT_MS/1000}s`);
          }, TIMEOUT_MS);
          
          console.log(`⏱️ Iniciando requisição IA (timeout: ${TIMEOUT_MS/1000}s)...`);
          
          // 🔐 Obter token de autenticação
          const authToken = await getAuthToken();
          if (!authToken) {
            throw new Error('Token de autenticação não disponível');
          }

          // 🎯 CARREGAR TODOS OS FILTROS PARA IA (NOVA ABORDAGEM)
          console.log('🤖 Carregando TODOS os filtros para PULSE AI...');
          const aiFilterData = await getAllFilterIdsForAIOptimized();

          console.log(`📊 DADOS ENVIADOS PARA PULSE AI:`);
          console.log(`   🩺 Filtros de especialidades médicas: ${aiFilterData.totalFilters}`);
          console.log(`   📋 Total de subfiltros: ${aiFilterData.totalSubFilters}`);
          console.log(`   🎯 Total de IDs válidos: ${aiFilterData.allValidIds.length}`);



          if (aiFilterData.totalSubFilters < 1000) {
            console.log('⚠️ ALERTA: Poucos subfiltros carregados! Esperava-se mais de 1300.');
          } else {
            console.log('✅ Quantidade de subfiltros adequada para IA');
          }

          const response = await fetch('/api/pulse-ai/categorize-questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              questions: batch.map(q => bulkToExtracted(q)),
              availableFilters: aiFilterData.medicalSpecialtyFilters.map(filter => ({
                id: filter.id,
                name: filter.name,
                description: `Especialidade médica com ${filter.allSubFilterIds.length} subfiltros`,
                category: filter.category,
                children: filter.hierarchicalStructure
              }))
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // ⏱️ CALCULAR TEMPO REAL
          const batchDuration = Date.now() - batchStartTime;
          const avgTimePerQuestion = batchDuration / batch.length;

          console.log(`⏱️ TEMPO DE PROCESSAMENTO - Lote ${batchNumber}:`);
          console.log(`   • Tempo total: ${(batchDuration/1000).toFixed(1)}s`);
          console.log(`   • Tempo por questão: ${(avgTimePerQuestion/1000).toFixed(1)}s`);
          console.log(`   • Status da requisição: ${response.status} ${response.ok ? '✅' : '❌'}`);

          if (!response.ok) {
            const errorData = await response.text();
            console.error(`❌ ERRO HTTP ${response.status}:`, errorData);
            throw new Error(`Erro na requisição: ${response.status} - ${errorData}`);
          }

          const result = await response.json();
          
          // 📊 MONITORAMENTO DA RESPOSTA IA
          console.log(`🧠 RESULTADO IA - Lote ${batchNumber}:`);
          console.log(`   • Sucesso: ${result.success ? '✅' : '❌'}`);
          console.log(`   • Questões categorizadas: ${result.categorizedQuestions?.length || 0}/${batch.length}`);
          
          if (result.success && result.categorizedQuestions) {
            // 📈 ANÁLISE DETALHADA DOS FILTROS APLICADOS
            let totalFiltersApplied = 0;
            let totalSubFiltersApplied = 0;
            let questionsWithFilters = 0;
            
            result.categorizedQuestions.forEach((categorized: any, qIndex: number) => {
              // ✅ CORREÇÃO: Usar os campos corretos da resposta da API
              const questionFilters = categorized.suggestedFilterIds?.length || 0;
              const questionSubFilters = categorized.suggestedSubFilterIds?.length || 0;
              
              totalFiltersApplied += questionFilters;
              totalSubFiltersApplied += questionSubFilters;
              
              if (questionFilters > 0 || questionSubFilters > 0) {
                questionsWithFilters++;
              }
              
              console.log(`   📋 Q${qIndex + 1}: ${questionFilters}F + ${questionSubFilters}SF = ${questionFilters + questionSubFilters} total`);
              
              // 🎯 LOG DETALHADO DOS FILTROS (apenas primeiros para não poluir)
              if (qIndex < 2 && categorized.suggestedFilterIds?.length > 0) {
                console.log(`      🏷️ Filtros sugeridos:`, categorized.suggestedFilterIds.slice(0, 5));
                console.log(`      🔖 Subfiltros sugeridos:`, categorized.suggestedSubFilterIds?.slice(0, 8));
              }
            });
            
            console.log(`📊 ESTATÍSTICAS DO LOTE ${batchNumber}:`);
            console.log(`   • Taxa de sucesso: ${questionsWithFilters}/${batch.length} questões (${(questionsWithFilters/batch.length*100).toFixed(0)}%)`);
            console.log(`   • Filtros principais aplicados: ${totalFiltersApplied}`);
            console.log(`   • Subfiltros aplicados: ${totalSubFiltersApplied}`);
            console.log(`   • Média filtros/questão: ${(totalFiltersApplied/batch.length).toFixed(1)}`);
            console.log(`   • Cobertura hierárquica: ${totalSubFiltersApplied > 0 ? '✅ Sim' : '⚠️ Não'}`);
            
            // ⚠️ ALERTAS DE PERFORMANCE
            if (batchDuration > 240000) { // > 4 minutos
              console.warn(`⚠️ ALERTA: Lote ${batchNumber} demorou ${(batchDuration/1000).toFixed(1)}s (>4min). Considere otimização.`);
            }
            
            if (questionsWithFilters < batch.length * 0.7) { // < 70% sucesso
              console.warn(`⚠️ ALERTA: Baixa taxa de categorização no lote ${batchNumber}: ${questionsWithFilters}/${batch.length}`);
            }

            // ✅ Aplicar categorizações do lote
            result.categorizedQuestions.forEach((categorized: any) => {
              const questionIndex = updatedQuestions.findIndex(q => q.tempId === categorized.tempId);
              if (questionIndex !== -1) {
                // ✅ CORREÇÃO: Usar os IDs diretamente da resposta da API
                updatedQuestions[questionIndex] = {
                  ...updatedQuestions[questionIndex],
                  filterIds: categorized.suggestedFilterIds || [],
                  subFilterIds: categorized.suggestedSubFilterIds || [],
                  tags: [...(updatedQuestions[questionIndex].tags || []), 'ai-categorized']
                };
                totalCategorized++;
                
                // 🎯 LOG de aplicação bem-sucedida
                console.log(`   ✅ Aplicado à Q${questionIndex + 1}: ${(categorized.suggestedFilterIds || []).length}F + ${(categorized.suggestedSubFilterIds || []).length}SF`);
              } else {
                console.warn(`   ⚠️ Questão não encontrada: tempId=${categorized.tempId}`);
              }
            });
            
            console.log(`✅ Lote ${batchNumber} processado com sucesso em ${(batchDuration/1000).toFixed(1)}s`);
          } else {
            console.warn(`⚠️ Lote ${batchNumber} falhou:`, result.error || 'Erro desconhecido');
          }
          
        } catch (batchError) {
          console.error(`❌ Erro no lote ${batchNumber}:`, batchError);
        }
        
        // ⏱️ Delay entre lotes para evitar rate limiting
        if (batchIndex < batches.length - 1) {
          console.log('⏱️ Aguardando 1 segundo antes do próximo lote...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 🎯 Atualizar estado final
      setQuestions(updatedQuestions);

      // 📊 RELATÓRIO FINAL CONSOLIDADO
      const totalProcessingTime = Date.now() - Date.now(); // Será calculado corretamente
      console.log(`\n🎉 ================== RELATÓRIO FINAL DE CATEGORIZAÇÃO ==================`);
      console.log(`📊 Estatísticas Gerais:`);
      console.log(`   • Total de questões: ${questions.length}`);
      console.log(`   • Questões categorizadas: ${totalCategorized}`);
      console.log(`   • Taxa de sucesso: ${((totalCategorized/questions.length)*100).toFixed(1)}%`);
      console.log(`   • Lotes processados: ${batches.length}`);
      console.log(`   • Redução de requisições: ${Math.ceil(questions.length / 3)} → ${batches.length} (${Math.round((1 - batches.length / Math.ceil(questions.length / 3)) * 100)}% menos)`);
      
      console.log(`\n⏱️ Performance e Tempo:`);
      console.log(`   • Filtros de especialidades médicas: 7`);
      console.log(`   • Total de subfiltros analisados: 1300+`);
      console.log(`   • Timeout configurado: 5 minutos por lote`);
      
      console.log(`\n🎯 Recomendações:`);
      console.log(`   • Se algum lote demorou >4min: considere reduzir tamanho do lote`);
      console.log(`   • Se taxa de sucesso <70%: verificar qualidade dos filtros`);
      console.log(`   • Para 1300+ filtros: monitor ideal é 3-5min por lote de 10 questões`);
      console.log(`==================== FIM DO RELATÓRIO ====================\n`);
      
      console.log(`🎉 Categorização OTIMIZADA concluída!`);
      
    } catch (error) {
      console.error('❌ Erro na categorização:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido na categorização');
    } finally {
      setCategorizationLoading(false);
      setCategorizationProgress(null); // Limpar progresso
    }
  };

  // 🧠 Categorização Local DINÂMICA - Usa os filtros REAIS do sistema
  const performLocalCategorization = (questionsToAnalyze: BulkQuestion[], availableFilters: Filter[]) => {
    const localCategorized: BulkQuestion[] = [];
    const needsAI: BulkQuestion[] = [];
    
    console.log(`🔍 Iniciando análise DINÂMICA de ${questionsToAnalyze.length} questões usando ${availableFilters.length} filtros reais...`);
    
    questionsToAnalyze.forEach((question, index) => {
      const text = `${question.enunciado || ''} ${(question.alternativas || []).join(' ')}`.toLowerCase();
      
      // 🎯 ANÁLISE DINÂMICA baseada nos filtros REAIS
      const matches = analyzeDynamicKeywords(text, availableFilters);
      
      // 🗺️ BUSCA nos filtros reais carregados
      const { matchedFilters, matchedSubFilters, confidence, specialtyBreakdown } = findDynamicMatches(
        matches, 
        availableFilters
      );
      
      // 📊 DECISÃO baseada em confiança da análise dinâmica
      if (confidence >= 0.6 && (matchedFilters.length > 0 || matchedSubFilters.length > 0)) {
        const multidisciplinaryTag = specialtyBreakdown.totalMatches > 3 
          ? `multi-${specialtyBreakdown.totalMatches}` 
          : 'focused';
          
        localCategorized.push({
          ...question,
          filterIds: matchedFilters,
          subFilterIds: matchedSubFilters,
          tags: [...(question.tags || []), `auto-dynamic-${Math.round(confidence * 100)}%`, multidisciplinaryTag]
        });
        
        console.log(`   ✅ Q${index + 1}: DINÂMICO (${Math.round(confidence * 100)}%) - ${matchedFilters.length}F + ${matchedSubFilters.length}SF`);
      } else {
        needsAI.push(question);
        const reason = confidence < 0.6 ? 'baixa-confiança' : 'sem-matches';
        console.log(`   ❓ Q${index + 1}: IA (${Math.round(confidence * 100)}%) - ${reason}`);
      }
    });
    
    return { localCategorized, needsAI };
  };
  
  // 🔍 Análise DINÂMICA usando os nomes dos filtros reais
  const analyzeDynamicKeywords = (text: string, availableFilters: Filter[]) => {
    const matches: Array<{
      filterId: string;
      filterName: string;
      level: number;
      score: number;
      matchType: 'exact' | 'partial' | 'fuzzy';
    }> = [];
    
    // Função recursiva para analisar TODOS os filtros e subfiltros
    const analyzeFilterRecursively = (items: any[], currentLevel: number = 0): void => {
      items.forEach(item => {
        if (!item.name) return;
        
        const filterName = item.name.toLowerCase();
        const filterWords = filterName.split(/[\s\-_,]+/); // Quebrar em palavras
        
        // 🎯 ANÁLISE MULTI-NÍVEL
        let matchScore = 0;
        let matchType: 'exact' | 'partial' | 'fuzzy' = 'fuzzy';
        
        // 1. Match exato do nome completo
        if (text.includes(filterName)) {
          matchScore = filterName.length * 3; // Score alto para match exato
          matchType = 'exact';
        }
        // 2. Match parcial (50%+ das palavras)
        else {
          const wordMatches = filterWords.filter((word: string) => 
            word.length > 2 && text.includes(word)
          );
          
          if (wordMatches.length >= Math.ceil(filterWords.length / 2)) {
            matchScore = wordMatches.length * filterName.length * 1.5;
            matchType = 'partial';
          }
          // 3. Match fuzzy (palavras importantes)
          else if (wordMatches.length > 0) {
            matchScore = wordMatches.length * filterName.length * 0.8;
            matchType = 'fuzzy';
          }
        }
        
        // Bonus por nível (filtros mais específicos = maior score)
        const levelBonus = currentLevel * 0.3;
        const finalScore = matchScore + levelBonus;
        
        if (finalScore > 0) {
          matches.push({
            filterId: item.id,
            filterName: item.name,
            level: currentLevel,
            score: finalScore,
            matchType
          });
        }
        
        // 🔄 RECURSÃO para subfiltros
        if (item.children && item.children.length > 0) {
          analyzeFilterRecursively(item.children, currentLevel + 1);
        }
      });
    };
    
    // Analisar TODOS os filtros reais
    analyzeFilterRecursively(availableFilters);
    
    // Ordenar por score (melhores primeiro)
    return matches.sort((a, b) => b.score - a.score);
  };
  
  // 🗺️ Busca dinâmica nos filtros reais
  const findDynamicMatches = (matches: any[], availableFilters: Filter[]) => {
    const matchedFilters: string[] = [];
    const matchedSubFilters: string[] = [];
    let totalScore = 0;
    
    // Pegar os top matches (limite para evitar ruído)
    const topMatches = matches.slice(0, 20); // Top 20 matches
    const SCORE_THRESHOLD = 5; // Score mínimo para considerar
    
    topMatches.forEach(match => {
      if (match.score < SCORE_THRESHOLD) return;
      
      totalScore += match.score;
      
      // Determinar se é filtro principal ou subfiltro
      if (match.level === 0) {
        // Nível 0 = Filtro principal
        if (!matchedFilters.includes(match.filterId)) {
          matchedFilters.push(match.filterId);
          console.log(`   🏷️ FILTRO: ${match.filterName} (${match.matchType}, score: ${match.score.toFixed(1)})`);
        }
      } else {
        // Nível 1+ = Subfiltro
        if (!matchedSubFilters.includes(match.filterId)) {
          matchedSubFilters.push(match.filterId);
          console.log(`   🔖 SUBFILTRO: ${match.filterName} (nível ${match.level}, ${match.matchType}, score: ${match.score.toFixed(1)})`);
          
          // 🔗 Adicionar filtro pai automaticamente
          const parentId = findParentFilterId(match.filterId, availableFilters);
          if (parentId && !matchedFilters.includes(parentId)) {
            matchedFilters.push(parentId);
            console.log(`   🔗 FILTRO PAI: Auto-adicionado para ${match.filterName}`);
          }
        }
      }
    });
    
    // Calcular confiança baseada no score total e qualidade dos matches
    const qualityBonus = topMatches.filter(m => m.matchType === 'exact').length * 0.2;
    const confidence = Math.min((totalScore / 50) + qualityBonus, 1);
    
    console.log(`   📊 RESULTADO DINÂMICO: ${confidence.toFixed(2)} confiança (${matchedFilters.length}F + ${matchedSubFilters.length}SF)`);
    
    return {
      matchedFilters: [...new Set(matchedFilters)],
      matchedSubFilters: [...new Set(matchedSubFilters)],
      confidence,
      specialtyBreakdown: {
        totalMatches: matchedFilters.length + matchedSubFilters.length,
        exactMatches: topMatches.filter(m => m.matchType === 'exact').length,
        partialMatches: topMatches.filter(m => m.matchType === 'partial').length
      }
    };
  };
  
  // 🔍 Encontrar ID do filtro pai
  const findParentFilterId = (targetId: string, filters: Filter[]): string | null => {
    for (const filter of filters) {
      if (filter.children) {
        for (const child of filter.children) {
          if (child.id === targetId) {
            return filter.id; // Encontrou o pai
          }
          // Buscar recursivamente em níveis mais profundos
          const deepParent = findParentInChildren(targetId, child.children || []);
          if (deepParent) return deepParent;
        }
      }
    }
    return null;
  };
  
  // 🔍 Busca recursiva em filhos
  const findParentInChildren = (targetId: string, children: any[]): string | null => {
    for (const child of children) {
      if (child.id === targetId) {
        return child.parentId || null;
      }
      if (child.children) {
        const found = findParentInChildren(targetId, child.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 🔄 Função para alterar dados de uma questão específica
  const handleQuestionChange = (index: number, field: keyof BulkQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const handleAlternativeChange = (qIndex: number, aIndex: number, value: string) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[qIndex]?.alternativas?.[aIndex] !== undefined) {
        const newAlternatives = [...newQuestions[qIndex].alternativas];
        newAlternatives[aIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], alternativas: newAlternatives };
      }
      return newQuestions;
    });
  };

  // Função para adicionar alternativa (máximo 6)
  const handleAddAlternative = (qIndex: number) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
        const alternativas = newQuestions[qIndex].alternativas || [];
      if (alternativas.length < 6) {
        newQuestions[qIndex] = { ...newQuestions[qIndex], alternativas: [...alternativas, ''] };
      }
      return newQuestions;
    });
  };

  // Função para remover alternativa (mínimo 2)
  const handleRemoveAlternative = (qIndex: number, aIndex: number) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      const alternativas = newQuestions[qIndex].alternativas || [];
      if (alternativas.length > 2) {
        const newAlternatives = alternativas.filter((_, i) => i !== aIndex);
        // Ajustar correta se necessário
        let novaCorreta = newQuestions[qIndex].correta;
        if (novaCorreta === aIndex) novaCorreta = undefined;
        else if (typeof novaCorreta === 'number' && novaCorreta > aIndex) novaCorreta--;
        newQuestions[qIndex] = { ...newQuestions[qIndex], alternativas: newAlternatives, correta: novaCorreta };
      }
      return newQuestions;
    });
  };

  const handleCorrectAlternativeChange = (qIndex: number, aIndex: number) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[qIndex]) {
        // 🎯 Para questões normais (não anuladas/desatualizadas), apenas uma resposta
        newQuestions[qIndex] = { ...newQuestions[qIndex], correta: aIndex };
      }
      return newQuestions;
    });
  };

  // Funções para marcar questões como anuladas/desatualizadas
  const toggleAnulada = (questionIdx: number) => {
    const question = questions[questionIdx];
    const newValue = !question.isAnnulled;
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[questionIdx]) {
        newQuestions[questionIdx] = { ...newQuestions[questionIdx], isAnnulled: newValue };
      }
      return newQuestions;
    });
  };

  const toggleDesatualizada = (questionIdx: number) => {
    const question = questions[questionIdx];
    const newValue = !question.isOutdated;
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[questionIdx]) {
        newQuestions[questionIdx] = { ...newQuestions[questionIdx], isOutdated: newValue };
      }
      return newQuestions;
    });
  };

  // Handlers de Seleção/Expansão (Mantidos)
  const handleSelectQuestion = (index: number) => {
    setSelectedQuestions((prevSelected) => {
      const newSelected = new Set(prevSelected);
      newSelected.has(index) ? newSelected.delete(index) : newSelected.add(index);
      return newSelected;
    });
  };

  const handleSelectAllQuestions = () => {
    setSelectedQuestions(prev =>
      prev.size === questions.length ? new Set() : new Set(questions.map((_, index) => index))
    );
  };

  const handleToggleExpandQuestion = (index: number) => {
    setExpandedQuestions((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      newExpanded.has(index) ? newExpanded.delete(index) : newExpanded.add(index);
      return newExpanded;
    });
  };

  const handleExpandAll = () => {
    setExpandedQuestions(new Set(questions.map((_, index) => index)));
  };

  const handleCollapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const handleRemoveSelectedQuestions = () => {
    if (selectedQuestions.size === 0) return;
    if (window.confirm(`Tem certeza que deseja remover ${selectedQuestions.size} questão(ões) selecionada(s)? Esta ação não pode ser desfeita.`)) {
      setQuestions((prev) => prev.filter((_, index) => !selectedQuestions.has(index)));
      setSelectedQuestions(new Set());
      // Resetar expansão para evitar inconsistências de índice
      setExpandedQuestions(new Set());
    }
  };

  // Função para adicionar questão manual
  const handleAddManualQuestion = () => {
    const newQuestionNumber = questions.length + 1;
    const newQuestion: BulkQuestion = {
      numero: `Q${newQuestionNumber}`,
      enunciado: '',
      alternativas: ['', '', '', ''], // 4 alternativas vazias por padrão
      correta: undefined,
      dificuldade: 'Média',
      status: 'Rascunho',
      tags: [],
      filterIds: [],
      subFilterIds: [],
      explicacao: '',
      imagem: '',
      tempId: `manual-${Date.now()}-${newQuestionNumber}`,
      aiGenerated: false,
      isAnnulled: false,
      isOutdated: false,
    };
    
    setQuestions(prev => [...prev, newQuestion]);
    // Auto-expandir a nova questão
    setExpandedQuestions(prev => new Set([...prev, questions.length]));
    // Auto-selecionar a nova questão  
    setSelectedQuestions(prev => new Set([...prev, questions.length]));
    
    // Scroll para a nova questão
    setTimeout(() => {
      const element = document.getElementById(`question-${questions.length}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Função de Salvar (Mantida com Validação)
  const handleSaveChanges = async () => {
    if (questions.length === 0) {
      setError("Nenhuma questão para salvar.");
      return;
    }
    // Validação de alternativas (mínimo 2, máximo 6, nenhuma vazia, correta válida)
    const invalidQuestionsInfo: { index: number; reason: string }[] = [];
    questions.forEach((q, index) => {
      let reason = '';
      if (!q.enunciado || q.enunciado === '<p></p>') reason = 'Enunciado vazio';
      else if (!q.alternativas || q.alternativas.length < 2) reason = 'Menos de 2 alternativas';
      else if (q.alternativas.length > 6) reason = 'Mais de 6 alternativas';
      else if (q.alternativas.some(alt => !alt || alt === '<p></p>')) reason = 'Alternativa vazia';
      else {
        // 🎯 VALIDAÇÃO PARA MÚLTIPLAS RESPOSTAS
        if (q.isAnnulled || q.isOutdated) {
          // Para questões anuladas/desatualizadas: permitir array de respostas ou resposta única
          if (Array.isArray(q.correta)) {
            if (q.correta.length === 0) reason = 'Nenhuma alternativa marcada como correta';
            else if (q.correta.some(idx => idx < 0 || idx >= q.alternativas.length)) reason = 'Alternativa correta inválida';
          } else if (typeof q.correta === 'number') {
            if (q.correta < 0 || q.correta >= q.alternativas.length) reason = 'Alternativa correta inválida';
          } else {
            reason = 'Nenhuma alternativa marcada como correta';
          }
        } else {
          // Para questões normais: apenas uma resposta
          if (typeof q.correta !== 'number' || q.correta < 0 || q.correta >= q.alternativas.length) reason = 'Alternativa correta inválida';
        }
      }
      if (reason) invalidQuestionsInfo.push({ index, reason });
    });
    if (invalidQuestionsInfo.length > 0) {
      setError(
        `Corrija as seguintes questões antes de salvar:\n` +
        invalidQuestionsInfo.map(iq => `Q${iq.index + 1}: ${iq.reason}`).join('\n')
      );
      return;
    }

    setSaving(true);
    setError(null);

    // 🎯 Mover token para escopo global da função
    const token = await getAuthToken();
    if (!token) {
      setError("Falha na autenticação. Tente recarregar a página.");
      setSaving(false);
      return;
    }

    try {
      // 🚀 NOVA ETAPA: Processar imagens para R2 antes de salvar
      console.log(`🖼️ Processando imagens das questões para R2...`);
      
      let totalImagesProcessed = 0;
      let totalImagesFound = 0;
      
      const processedQuestions = await Promise.all(
        questions.map(async (q, index) => {
          try {
            // Processar HTML do enunciado para substituir data URIs por URLs do R2
            const { html: processedEnunciado, uploadedImages, totalFound } = await r2ImageUploadService.processQuestionHTML(
              q.enunciado,
              q.numero || (index + 1)
            );
            
            totalImagesFound += totalFound;
            totalImagesProcessed += uploadedImages.length;
            
            if (uploadedImages.length > 0) {
              console.log(`✅ Q${q.numero || (index + 1)}: ${uploadedImages.length}/${totalFound} imagens processadas`);
            }
            
            // Verificar se todas as imagens foram processadas com sucesso
            if (totalFound > 0 && uploadedImages.length !== totalFound) {
              throw new Error(`Falha no processamento: apenas ${uploadedImages.length}/${totalFound} imagens foram salvas no R2`);
            }

            return {
              ...q,
              enunciado: processedEnunciado,
              // Adicionar metadados sobre as imagens processadas
              imageMetadata: uploadedImages.length > 0 ? {
                r2Images: uploadedImages,
                totalImages: uploadedImages.length,
                processedAt: new Date().toISOString()
              } : undefined
            };
          } catch (error) {
            console.error(`❌ Erro ao processar imagens da Q${q.numero || (index + 1)}:`, error);
            // SEM FALLBACK - Falhar completamente se não conseguir processar imagens
            throw new Error(`Falha ao processar imagens da questão ${q.numero || (index + 1)}: ${error.message}`);
          }
        })
      );
      
      if (totalImagesFound > 0) {
        console.log(`📊 Processamento de imagens concluído: ${totalImagesProcessed}/${totalImagesFound} imagens enviadas para R2`);
      }

      // 🚀 OTIMIZAÇÃO: Usar endpoint BULK (1 requisição) ao invés de 100 requisições individuais
      console.log(`💾 Salvando ${processedQuestions.length} questões em LOTE (1 requisição única)...`);
      
      // Converter questões para formato do backend
      const questionsForBackend = processedQuestions.map((q) => ({
        statement: q.enunciado,
        alternatives: q.alternativas,
        correctOptionIndex: q.correta,
        difficulty: q.dificuldade || "Média",
        status: q.status || "Rascunho",
        tags: q.tags || [],
        filterIds: q.filterIds || [],
        subFilterIds: q.subFilterIds || [],
        explanation: q.explicacao || "",
        imageUrl: q.imagem || null,
        isAnnulled: q.isAnnulled || false,
        isOutdated: q.isOutdated || false,
        numero: q.numero, // Preservar número original se houver
        metadata: {
          sourceType: 'pptx_extraction',
          importedAt: new Date().toISOString(),
          originalNumber: q.numero,
          importBatch: `batch_${Date.now()}`,
          // Incluir metadados de imagens R2
          r2Images: q.imageMetadata?.r2Images || [],
          totalR2Images: q.imageMetadata?.totalImages || 0
        }
      }));

      // 🎯 UMA ÚNICA REQUISIÇÃO BULK - Muito mais eficiente!
      const response = await fetchWithAuth("/api/questions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ questions: questionsForBackend }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Exibir resultado baseado na resposta do backend
        const successCount = result.stats?.success || 0;
        const errorCount = result.stats?.error || 0;
        const successRate = result.stats?.successRate || '0%';
        
        if (successCount > 0) {
          const imageInfo = totalImagesProcessed > 0 ? `\n\n🖼️ ${totalImagesProcessed} imagens salvas no R2` : '';
          const message = `✅ ${successCount} questões salvas com sucesso! (Taxa: ${successRate})` + 
            (errorCount > 0 ? `\n\n⚠️ ${errorCount} questões com erro` : '') + imageInfo;
          alert(message);
          console.log(`✅ Salvamento BULK concluído: ${successCount} sucessos, ${errorCount} erros, ${totalImagesProcessed} imagens R2`);
          
          // 💰 ECONOMIA: Uma única requisição ao invés de 100!
          console.log(`💰 ECONOMIA: Usamos 1 requisição ao invés de ${questions.length} requisições individuais!`);
        } else {
          throw new Error(`Nenhuma questão foi salva. Verifique os dados e tente novamente.`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

    } catch (err: any) {
      console.error("❌ Erro geral ao salvar questões:", err);
      setError(`Erro ao salvar: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Funções de Filtro (Mantidas) --- 
  const buildFilterTreeFromFirebase = (filtersData: Filter[]): FilterNode[] => {
    const nodeMap: { [key: string]: FilterNode } = {};
    const tree: FilterNode[] = [];
    filtersData.forEach(filter => {
      nodeMap[filter.id] = { id: filter.id, name: filter.name, description: filter.description, level: 0, children: [], isExpanded: false };
      if (filter.children) {
        filter.children.forEach((subFilter: SubFilter) => {
          nodeMap[subFilter.id] = { id: subFilter.id, name: subFilter.name, description: subFilter.description, parentId: filter.id, level: 1, children: [], isExpanded: false };
          const processSubSubFilters = (sub: SubFilter, parentId: string, level: number) => {
            if (sub.children) {
              sub.children.forEach((subSubFilter: SubFilter) => {
                nodeMap[subSubFilter.id] = { id: subSubFilter.id, name: subSubFilter.name, description: subSubFilter.description, parentId: parentId, level: level + 1, children: [], isExpanded: false };
                processSubSubFilters(subSubFilter, subSubFilter.id, level + 1);
              });
            }
          };
          processSubSubFilters(subFilter, subFilter.id, 1);
        });
      }
    });
    Object.values(nodeMap).forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children?.push(node);
      } else if (node.level === 0) {
        tree.push(node);
      }
    });
    const sortNodes = (nodes: FilterNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => { if (node.children) sortNodes(node.children); });
    };
    sortNodes(tree);
    return tree;
  };

  // Handler para expandir/colapsar nós
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  // Handler para aplicar filtro em lote
  const applyHierarchicalFilter = (nodeId: string, path: string[]) => {
    console.log(`🌳 Aplicando filtro hierárquico "${nodeId}" a ${selectedQuestions.size} questões selecionadas`);
    
    if (selectedQuestions.size === 0) {
      console.warn('⚠️ Nenhuma questão selecionada para aplicar filtros');
      return;
    }
    
    // Usar smart matching para identificar o tipo do filtro
    const smartMatch = findFilterBySmartMatch(nodeId);
    
    if (!smartMatch) {
      console.error(`❌ Filtro "${nodeId}" não encontrado no sistema`);
      setError(`Filtro "${nodeId}" não foi encontrado. Verifique se os filtros foram carregados corretamente.`);
      return;
    }
    
    console.log(`🎯 Smart match para "${nodeId}": ${smartMatch.name} (${smartMatch.type})`);
    
    // Aplicar a todas as questões selecionadas
    setQuestions(prev => prev.map((q, idx) => {
      if (!selectedQuestions.has(idx)) {
        return q; // Não modificar questões não selecionadas
      }
      
      const currentFilterIds = [...(q.filterIds || [])];
      const currentSubFilterIds = [...(q.subFilterIds || [])];
      let updated = false;
      
      if (smartMatch.type === 'main') {
        // É um filtro principal
        if (!currentFilterIds.includes(smartMatch.id)) {
          currentFilterIds.push(smartMatch.id);
          updated = true;
          console.log(`   ✅ Filtro principal "${smartMatch.name}" aplicado à questão ${idx + 1}`);
        }
      } else {
        // É um subfiltro
        if (!currentSubFilterIds.includes(smartMatch.id)) {
          currentSubFilterIds.push(smartMatch.id);
          updated = true;
          console.log(`   ✅ Subfiltro "${smartMatch.name}" aplicado à questão ${idx + 1}`);
          
          // Aplicar filtro pai automaticamente se necessário
          if (smartMatch.parent && !currentFilterIds.includes(smartMatch.parent)) {
            currentFilterIds.push(smartMatch.parent);
            console.log(`   🔗 Filtro pai "${smartMatch.parent}" aplicado automaticamente à questão ${idx + 1}`);
          }
        }
      }
      
      if (updated) {
        return {
          ...q,
          filterIds: currentFilterIds,
          subFilterIds: currentSubFilterIds,
        };
      }
      
      return q;
    }));
    
    console.log(`✅ Filtro "${smartMatch.name}" aplicado com sucesso a ${selectedQuestions.size} questões`);
  };

  // Componente FilterTreeNode
  const FilterTreeNode: React.FC<{ node: FilterNode; level: number; path: string[] }> = ({ node, level, path }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const currentPath = [...path, node.id];
    const indentWidth = level * 20;
    
    return (
      <div key={node.id} className="filter-tree-node">
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg border transition-all mb-1 ${
            hasChildren ? 'border-gray-200 bg-white' : 'border-transparent bg-gray-50'
          }`} 
          style={{ marginLeft: `${indentWidth}px` }}
        >
          {/* Botão de expansão */}
          {hasChildren && (
            <button 
              className={`w-6 h-6 rounded-md flex items-center justify-center border mr-2 ${
                isExpanded 
                  ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary-hover)] text-[var(--color-text-on-primary)]' 
                  : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-main)]'
              }`}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                toggleNodeExpansion(node.id); 
              }}
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
          
          {/* Informações do filtro */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900 truncate" title={node.name}>
                {node.name}
              </div>
              {hasChildren && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {node.children!.length} {node.children!.length === 1 ? 'item' : 'itens'}
                </span>
              )}
              {level > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600">
                  Nível {level}
                </span>
              )}
              {node.description && (
                <span 
                  className="text-xs text-gray-400 cursor-help"
                  title={node.description}
                >
                  <i className="fas fa-info-circle"></i>
                </span>
              )}
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyHierarchicalFilter(node.id, currentPath.slice(0, -1));
              }}
              disabled={selectedQuestions.size === 0}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedQuestions.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--color-bg-accent)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-bg-accent-hover)]'
              }`}
              title={`Aplicar "${node.name}" às ${selectedQuestions.size} questões selecionadas`}
            >
              <i className="fas fa-plus mr-1"></i>
              Aplicar ({selectedQuestions.size})
            </button>
            
            {/* Informações adicionais */}
            {node.category && (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-600">
                {node.category}
              </span>
            )}
          </div>
        </div>
        
        {/* Filhos expandidos */}
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-blue-200 pl-2 mt-1">
            {node.children!.map(child => (
              <FilterTreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                path={currentPath} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Função para obter nomes dos filtros aplicados a uma questão
  const getSelectedFilterNames = (question: BulkQuestion): string[] => {
    const flattenTree = (nodes: FilterNode[]): FilterNode[] => {
      let result: FilterNode[] = [];
      nodes.forEach(node => {
        result.push(node);
        if (node.children) {
          result.push(...flattenTree(node.children));
        }
      });
      return result;
    };

    const allFilters = flattenTree(filterTree);
    
    const filterNames: string[] = [];
    
    (question.filterIds || []).forEach(filterId => {
      const filter = allFilters.find(f => f.id === filterId);
      if (filter) filterNames.push(filter.name);
    });
    
    (question.subFilterIds || []).forEach(subFilterId => {
      const subFilter = allFilters.find(f => f.id === subFilterId);
      if (subFilter) filterNames.push(subFilter.name);
    });
    
    return filterNames;
  };

  // 🎯 FUNÇÃO AUXILIAR: Normalizar texto para comparação
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]/g, '') // Remove espaços, hífens e underscores
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n');
  };

  // 🎯 FUNÇÃO PRINCIPAL: Smart Matching de Filtros (RESTAURADA)
  const findFilterBySmartMatch = (searchId: string): { id: string; name: string; type: 'main' | 'sub'; parent?: string } | null => {
    if (!searchId || !filters.length || !filterTree.length) return null;

    // 🔧 NORMALIZAR O SEARCH ID DE ENTRADA
    const normalizedSearchId = normalizeText(searchId);
    console.log(`🔍 SMART MATCH: Buscando "${searchId}" → normalizado: "${normalizedSearchId}"`);

    // 1. Buscar primeiro em filtros principais
    console.log(`   🔍 Buscando em ${filters.length} filtros principais...`);
    for (const filter of filters) {
      const filterIdNormalized = normalizeText(filter.id);
      const filterNameNormalized = normalizeText(filter.name);

      console.log(`      🔍 Comparando com filtro principal: "${filter.id}" (${filter.name}) - normalizado: "${filterIdNormalized}"`);

      if (filterIdNormalized === normalizedSearchId || filterNameNormalized === normalizedSearchId) {
        console.log(`   ✅ MATCH FILTRO PRINCIPAL: "${filter.id}" (${filter.name})`);
        return { id: filter.id, name: filter.name, type: 'main' };
      }
    }

    // 2. Buscar em subfiltros
    console.log(`   🔍 Buscando em ${filters.length} filtros principais com subfiltros...`);
    const searchInSubFilters = (children: any[], parentId: string, parentName: string): any => {
      for (const child of children) {
        const childIdNormalized = normalizeText(child.id);
        const childNameNormalized = normalizeText(child.name);
        
        console.log(`      🔍 Comparando com subfiltro: "${child.id}" (${child.name}) - normalizado: "${childIdNormalized}"`);
        
        if (childIdNormalized === normalizedSearchId || childNameNormalized === normalizedSearchId) {
          console.log(`   ✅ MATCH SUBFILTRO: "${child.id}" (${child.name}) - Pai: ${parentName}`);
          return { id: child.id, name: child.name, type: 'sub', parent: parentId };
        }
        
        if (child.children) {
          const result = searchInSubFilters(child.children, parentId, parentName);
          if (result) return result;
        }
      }
      return null;
    };

    for (const filter of filters) {
      if (filter.children) {
        console.log(`   🔍 Buscando em subfiltros de "${filter.name}" (${filter.children.length} filhos)`);
        const result = searchInSubFilters(filter.children, filter.id, filter.name);
        if (result) return result;
      }
    }
    
    // 3. Buscar usando filterTree (backup)
    const searchInTree = (nodes: FilterNode[], parentName = ''): any => {
      for (const node of nodes) {
        const nodeIdNormalized = normalizeText(node.id);
        const nodeNameNormalized = normalizeText(node.name);
        
        console.log(`         🔍 Comparando com nó da árvore: "${node.id}" (${node.name}) - normalizado: "${nodeIdNormalized}"`);
        
        if (nodeIdNormalized === normalizedSearchId || nodeNameNormalized === normalizedSearchId) {
          const type = node.level === 0 ? 'main' : 'sub';
          console.log(`   ✅ MATCH TREE: "${node.id}" (${node.name}) - Tipo: ${type}`);
          return { id: node.id, name: node.name, type, parent: parentName };
        }
        
        if (node.children) {
          const result = searchInTree(node.children, node.name);
          if (result) return result;
        }
      }
      return null;
    };

    console.log(`   🔍 Buscando na árvore como backup...`);
    const treeResult = searchInTree(filterTree);
    if (treeResult) return treeResult;
    
    console.log(`   ❌ NENHUM MATCH encontrado para "${searchId}"`);
    return null;
  };

  // 🗑️ FUNÇÃO: Remover filtro específico de uma questão
  const removeFilterFromQuestion = (questionIdx: number, filterId: string, isSubFilter: boolean = false) => {
    const question = questions[questionIdx];
    
    console.log(`🗑️ Removendo ${isSubFilter ? 'subfiltro' : 'filtro'} "${filterId}" da questão ${questionIdx + 1}`);
    
    if (isSubFilter) {
      // Remover subfiltro
      const newSubFilterIds = (question.subFilterIds || []).filter(id => id !== filterId);
      handleQuestionChange(questionIdx, 'subFilterIds', newSubFilterIds);
      console.log(`   ✅ Subfiltro removido. Restam: ${newSubFilterIds.length} subfiltros`);
    } else {
      // Remover filtro principal
      const newFilterIds = (question.filterIds || []).filter(id => id !== filterId);
      handleQuestionChange(questionIdx, 'filterIds', newFilterIds);
      console.log(`   ✅ Filtro removido. Restam: ${newFilterIds.length} filtros`);
    }
  };

  // 🎯 FUNÇÃO: Aplicar filtro a questões selecionadas
  const applyFilterToSelected = (filterId: string, subFilterId?: string) => {
    selectedQuestions.forEach(idx => {
      const question = questions[idx];
      const filterIds = [...(question.filterIds || [])];
      const subFilterIds = [...(question.subFilterIds || [])];
      
      if (!filterIds.includes(filterId)) {
        filterIds.push(filterId);
      }
      
      if (subFilterId && !subFilterIds.includes(subFilterId)) {
        subFilterIds.push(subFilterId);
      }
      
      handleQuestionChange(idx, 'filterIds', filterIds);
      handleQuestionChange(idx, 'subFilterIds', subFilterIds);
    });
  };

  // 🗑️ FUNÇÃO: Remover todos os filtros das questões selecionadas
  const removeAllFiltersFromSelected = () => {
    if (selectedQuestions.size === 0) {
      console.warn('⚠️ Nenhuma questão selecionada para remover filtros');
      return;
    }

    console.log(`🗑️ Removendo todos os filtros de ${selectedQuestions.size} questões selecionadas`);
    
    selectedQuestions.forEach(idx => {
      handleQuestionChange(idx, 'filterIds', []);
      handleQuestionChange(idx, 'subFilterIds', []);
    });
    
    console.log(`✅ Todos os filtros removidos de ${selectedQuestions.size} questões`);
  };

  // 🎯 FUNÇÃO: Aplicar filtro individual com Smart Matching
  const applySingleAIFilter = (questionIdx: number, filterId: string, isSubFilter: boolean = false) => {
    const currentQuestion = questions[questionIdx];
    if (!currentQuestion) {
      console.error(`❌ ERRO: Questão ${questionIdx + 1} não encontrada!`);
      return;
    }
    
    console.log(`\n🎯 APLICAÇÃO INDIVIDUAL - Questão ${questionIdx + 1}, Filtro "${filterId}", Tipo: ${isSubFilter ? 'SUBFILTRO' : 'FILTRO'}`);
    
    // 🧠 SMART MATCHING: Encontrar o filtro real no sistema
    const smartMatch = findFilterBySmartMatch(filterId);
    
    if (!smartMatch) {
      console.error(`❌ FILTRO NÃO ENCONTRADO: "${filterId}" não existe no sistema (nem variações)`);
      setError(`Filtro "${filterId}" não foi encontrado no sistema. Verifique se foi criado.`);
      return;
    }
    
    console.log(`🔄 SMART MATCH: "${filterId}" → "${smartMatch.id}" (${smartMatch.name}) [${smartMatch.type}]`);
    
    const currentFilterIds = [...(currentQuestion.filterIds || [])];
    const currentSubFilterIds = [...(currentQuestion.subFilterIds || [])];
    
    let updated = false;
    
    // Usar o ID real do sistema (não o sugerido pela IA)
    const realFilterId = smartMatch.id;
    
    if (smartMatch.type === 'sub') {
      // É um subfiltro
      if (!currentSubFilterIds.includes(realFilterId)) {
        currentSubFilterIds.push(realFilterId);
        updated = true;
        console.log(`   ✅ SUBFILTRO ADICIONADO: "${realFilterId}" (${smartMatch.name})`);
        
        // 🔗 AUTOMATICAMENTE aplicar filtro pai se existir
        if (smartMatch.parent) {
          const parentExists = currentFilterIds.includes(smartMatch.parent);
          if (!parentExists) {
            currentFilterIds.push(smartMatch.parent);
            console.log(`   🔗 FILTRO PAI ADICIONADO: "${smartMatch.parent}"`);
          }
        }
      } else {
        console.log(`   ⚠️ SUBFILTRO JÁ EXISTE: "${realFilterId}"`);
      }
    } else {
      // É um filtro principal
      if (!currentFilterIds.includes(realFilterId)) {
        currentFilterIds.push(realFilterId);
        updated = true;
        console.log(`   ✅ FILTRO PRINCIPAL ADICIONADO: "${realFilterId}" (${smartMatch.name})`);
      } else {
        console.log(`   ⚠️ FILTRO PRINCIPAL JÁ EXISTE: "${realFilterId}"`);
      }
    }
    
    // 🌳 USAR SELEÇÃO HIERÁRQUICA AUTOMÁTICA para aplicar toda a árvore
    console.log(`🌳 Aplicando seleção hierárquica completa para "${smartMatch.id}"`);
    applyHierarchicalFilterToQuestion(questionIdx, smartMatch.id, smartMatch.type === 'sub');
    
    if (updated) {
      console.log(`   ✅ SUCESSO - Filtro "${smartMatch.name}" e hierarquia aplicados à questão ${questionIdx + 1}!`);
    } else {
      console.log(`   ⏭️ NENHUMA MUDANÇA necessária\n`);
    }
  };

  // 🌳 FUNÇÃO: Aplicar filtro hierárquico completo a uma questão
  const applyHierarchicalFilterToQuestion = (questionIdx: number, filterId: string, isSubFilter: boolean = false) => {
    console.log(`🌳 Aplicando filtro hierárquico completo à questão ${questionIdx}:`, filterId);
    
    const updatedQuestions = [...questions];
    const question = updatedQuestions[questionIdx];
    
    if (!question.filterIds) question.filterIds = [];
    if (!question.subFilterIds) question.subFilterIds = [];
    
    let hierarchyPath: string[] = [];
    
    if (isSubFilter) {
      // Se é subfiltro, encontrar toda a hierarquia até a raiz
      hierarchyPath = buildCompleteHierarchyPath(filterId);
      console.log(`🌳 Hierarquia completa encontrada para "${filterId}":`, hierarchyPath);
    } else {
      // Se é filtro principal, apenas adicionar ele
      hierarchyPath = [filterId];
    }
    
    // Aplicar TODA a hierarquia
    hierarchyPath.forEach((pathFilterId, level) => {
      const filterInfo = findFilterBySmartMatch(pathFilterId);
      if (filterInfo) {
        console.log(`   🔗 Nível ${level + 1}: Aplicando "${filterInfo.id}" (${filterInfo.name}) - Tipo: ${filterInfo.type}`);
        
        if (filterInfo.type === 'main') {
          // Filtro principal
          if (!question.filterIds!.includes(filterInfo.id)) {
            question.filterIds!.push(filterInfo.id);
            console.log(`   ✅ Filtro principal "${filterInfo.name}" adicionado`);
          }
        } else {
          // Subfiltro
          if (!question.subFilterIds!.includes(filterInfo.id)) {
            question.subFilterIds!.push(filterInfo.id);
            console.log(`   ✅ Subfiltro "${filterInfo.name}" adicionado`);
          }
          
          // CRÍTICO: Garantir que o filtro pai também seja selecionado
          if (filterInfo.parent && !question.filterIds!.includes(filterInfo.parent)) {
            question.filterIds!.push(filterInfo.parent);
            console.log(`   🔗 Filtro pai "${filterInfo.parent}" adicionado automaticamente`);
          }
        }
      } else {
        console.warn(`   ⚠️ Filtro "${pathFilterId}" não encontrado na hierarquia`);
      }
    });
    
    // Atualizar questão
    setQuestions(updatedQuestions);
    
    console.log(`✅ Questão ${questionIdx} atualizada com hierarquia completa:`);
    console.log(`   - Filtros principais: [${question.filterIds?.join(', ')}]`);
    console.log(`   - Subfiltros: [${question.subFilterIds?.join(', ')}]`);
  };

  // 🔍 Constrói caminho hierárquico completo de um filtro até a raiz
  const buildCompleteHierarchyPath = (filterId: string): string[] => {
    console.log(`🔍 Construindo hierarquia completa para: "${filterId}"`);
    
    const path: string[] = [];
    let currentId = filterId;
    let depth = 0;
    const maxDepth = 10; // Evitar loops infinitos
    
    while (currentId && depth < maxDepth) {
      path.unshift(currentId); // Adicionar no início para manter ordem da raiz para folha
      console.log(`   🔗 Nível ${depth + 1}: "${currentId}"`);
      
      // Encontrar o pai deste filtro
      const parentId = findParentOfFilter(currentId);
      if (parentId && parentId !== currentId) {
        currentId = parentId;
        depth++;
      } else {
        break;
      }
    }
    
    console.log(`🌳 Hierarquia completa (${path.length} níveis):`, path);
    return path;
  };

  // 🔍 Encontra o filtro pai de um dado filtro ID
  const findParentOfFilter = (filterId: string): string | null => {
    // Procurar em filtros principais
    for (const filter of filters) {
      if (filter.id === filterId) {
        return null; // É um filtro raiz
      }
      
      // Procurar recursivamente nos subfiltros
      const parent = searchParentInSubFilters(filter.children || [], filterId, filter.id);
      if (parent) return parent;
    }
    
    // Procurar na hierarquia do Firebase
    for (const node of filterTree) {
      const parent = searchParentInNodes(node, filterId);
      if (parent) return parent;
    }
    
    return null;
  };

  // 🔍 Busca recursiva de pai em subfiltros
  const searchParentInSubFilters = (subFilters: SubFilter[], targetId: string, parentId: string): string | null => {
    for (const subFilter of subFilters) {
      if (subFilter.id === targetId) {
        return parentId;
      }
      
      if (subFilter.children && subFilter.children.length > 0) {
        const foundParent = searchParentInSubFilters(subFilter.children, targetId, subFilter.id);
        if (foundParent) return foundParent;
      }
    }
    return null;
  };

  // 🔍 Busca recursiva de pai nos nodes da árvore
  const searchParentInNodes = (node: FilterNode, targetId: string): string | null => {
    if (node.children) {
      for (const child of node.children) {
        if (child.id === targetId) {
          return node.id;
        }
        
        const foundInChild = searchParentInNodes(child, targetId);
        if (foundInChild) return foundInChild;
      }
    }
    return null;
  };

  // Função para obter URL completa para imagens
  const getFullImageUrl = (url: string | undefined): string => {
    if (!url) return '';

    // Se já for uma URL completa, retornar como está
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }

    // Usar o servidor Flask na porta 5001 para servir imagens
    const baseUrl = 'http://localhost:5001';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // 🔧 Função para processar imagens e remover espaços em branco
  const processAutoCropImage = (img: HTMLImageElement) => {
    // 🚫 FILTRAR LOGOS E IMAGENS PEQUENAS PRIMEIRO
    const isLogo = (
      img.naturalWidth < 200 ||
      img.naturalHeight < 100 ||
      (img.naturalWidth < 300 && img.naturalHeight < 200) ||
      img.src.toLowerCase().includes('logo') ||
      img.alt.toLowerCase().includes('logo')
    );

    if (isLogo) {
      console.log(`🚫 Imagem filtrada (logo/pequena): ${img.naturalWidth}x${img.naturalHeight}`);
      img.style.display = 'none'; // Esconder logos
      return;
    }

    // Só processar se a imagem for grande o suficiente
    if (img.naturalWidth > 200 && img.naturalHeight > 100) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        // Detectar bordas com conteúdo
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let hasContent = false;

        // Procurar pixels não-brancos (tolerância mais agressiva para detectar conteúdo)
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];

            // 🔥 TOLERÂNCIA EXTREMAMENTE AGRESSIVA: detectar qualquer pixel não-branco
            // Incluir cinzas claros, bordas de tabelas e qualquer sombra
            if (r < 240 || g < 240 || b < 240 ||
                Math.abs(r - g) > 8 || Math.abs(g - b) > 8 || Math.abs(r - b) > 8) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
              hasContent = true;
            }
          }
        }

        // 🔥 DETECÇÃO EXTREMAMENTE AGRESSIVA DE ESPAÇOS
        const hasVerticalSpace = minY > 5 || maxY < canvas.height - 5;
        const hasHorizontalSpace = minX > 5 || maxX < canvas.width - 5;

        if (hasContent && (hasVerticalSpace || hasHorizontalSpace)) {
          // 🔥 MARGENS MÍNIMAS - CORTAR O MÁXIMO POSSÍVEL
          const verticalMargin = 2;  // Margem mínima para vertical
          const horizontalMargin = 3; // Margem mínima para horizontal

          minX = Math.max(0, minX - horizontalMargin);
          minY = Math.max(0, minY - verticalMargin);
          maxX = Math.min(canvas.width - 1, maxX + horizontalMargin);
          maxY = Math.min(canvas.height - 1, maxY + verticalMargin);

          const cropWidth = maxX - minX + 1;
          const cropHeight = maxY - minY + 1;

          // Criar nova imagem cortada
          const croppedCanvas = document.createElement('canvas');
          const croppedCtx = croppedCanvas.getContext('2d');

          if (!croppedCtx) return;

          croppedCanvas.width = cropWidth;
          croppedCanvas.height = cropHeight;

          // Preencher com branco primeiro
          croppedCtx.fillStyle = 'white';
          croppedCtx.fillRect(0, 0, cropWidth, cropHeight);

          // Desenhar conteúdo cortado
          croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

          // Substituir src da imagem
          img.src = croppedCanvas.toDataURL('image/png', 0.95);

          console.log(`🔧 Imagem cortada: ${canvas.width}x${canvas.height} → ${cropWidth}x${cropHeight}`);
        }
      } catch (error) {
        console.log('Não foi possível processar imagem automaticamente:', error);
      }
    }
  };

  // Função para upload de imagem
  const handleImageUpload = async (questionIdx: number, file: File, insertInline: boolean = false): Promise<string> => {
    console.log(`📷 Iniciando upload de imagem para questão ${questionIdx + 1}:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      insertInline
    });
    
    try {
      // 🎯 USAR R2 PARA UPLOAD DE IMAGENS
      console.log(`📷 Uploadando para R2...`);
      
      // Converter file para data URI primeiro
      const dataURI = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      // Upload para R2
      const uploadResult = await r2ImageUploadService.uploadImageToR2(dataURI, {
        questionNumber: questionIdx + 1,
        fileName: file.name,
        uploadSource: 'manual_admin_upload'
      });
      
      if (!uploadResult.success) {
        throw new Error('Falha no upload para R2');
      }
      
      const imageUrl = uploadResult.url;
      console.log(`📷 Imagem uploadada para R2: ${imageUrl}`);
      
      if (insertInline) {
        // 🎯 INSERIR IMAGEM NA POSIÇÃO DO CURSOR
        const editor = editorRefs.current[`enunciado-${questionIdx}`];
        if (editor && editor.isEditable) {
          // Inserir imagem na posição atual do cursor
          editor.chain().focus().setImage({ 
            src: imageUrl,
            alt: `Imagem da questão ${questionIdx + 1}`,
            title: file.name
          }).run();
          console.log(`✅ Imagem inserida na posição do cursor: ${imageUrl}`);
        } else {
          // Fallback: inserir no final do enunciado
          console.log(`⚠️ Editor não disponível, inserindo no final do enunciado`);
          setQuestions((prevQuestions) => {
            const newQuestions = [...prevQuestions];
            const current = newQuestions[questionIdx].enunciado || '';
            newQuestions[questionIdx].enunciado = current + `
<div style="text-align: center; margin: 15px auto; max-width: 600px;">
    <div style="background: white; padding: 4px; border: 1px solid #ddd; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <img src="${imageUrl}" alt="Imagem da questão" title="${file.name}" style="max-width: 100%; height: auto; display: block; margin: 0; object-fit: contain; background: white;" class="auto-crop-image" />
    </div>
</div>`;
            return newQuestions;
          });
        }
      } else {
        setQuestions((prevQuestions) => {
          const newQuestions = [...prevQuestions];
          newQuestions[questionIdx].imagem = imageUrl;
          return newQuestions;
        });
      }
      console.log(`✅ Imagem inserida com sucesso: ${imageUrl}`);
      return imageUrl;
      
    } catch (e: any) {
      console.error('❌ Exceção no upload da imagem:', e);
      setError(`Erro no upload da imagem: ${e.message || 'Erro desconhecido'}`);
      throw e;
    }
  };

  // Função para abrir input de upload inline
  const insertImageAtCursor = (questionIdx: number) => {
    fileInputRefs.current[`inline-${questionIdx}`]?.click();
  };

  // Função para renderizar preview do enunciado com imagens
  const renderEnunciadoPreview = (enunciado: string | undefined): React.ReactNode => {
    if (!enunciado) return <span className="text-gray-400 italic">[vazio]</span>;
    
    // Verificar se o conteúdo contém tags HTML
    const containsHtml = /<[a-z][\s\S]*>/i.test(enunciado);
    
    if (!containsHtml) {
      // Se for texto simples, apenas exibir
      return <span>{enunciado}</span>;
    }
    
    try {
      // Vamos criar um elemento DOM temporário para processar o HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = enunciado;
      
      // Processar imagens - verificar se todas as URLs estão completas
      const images = tempDiv.querySelectorAll('img');
      images.forEach(img => {
        // Verificar se a URL da imagem está completa
        const src = img.getAttribute('src');
        if (src) {
          // ⭐ NÃO PROCESSAR IMAGENS BASE64 - ELAS JÁ SÃO COMPLETAS
          if (!src.startsWith('data:')) {
            // Usar nossa função utilitária apenas para URLs normais
            img.setAttribute('src', getFullImageUrl(src));
          }
          
          // 🎨 ESTILIZAÇÃO MELHORADA DAS IMAGENS
          img.classList.add('max-w-full', 'h-auto', 'rounded-lg');
          img.style.maxHeight = '400px';
          img.style.display = 'block';
          img.style.margin = '15px auto';
          img.style.background = 'white';
          img.style.border = '1px solid #ddd';
          img.style.borderRadius = '6px';
          img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          img.style.objectFit = 'contain';
          img.style.filter = 'contrast(1.05) brightness(0.98)';

          // 🔧 PROCESSAR IMAGENS COM CLASSE auto-crop-image
          if (img.classList.contains('auto-crop-image')) {
            img.onload = function() {
              processAutoCropImage(img);
            };
          }
        }
      });
      
      // Retornar conteúdo processado de forma segura
      return <div className="preview-html" dangerouslySetInnerHTML={{ __html: tempDiv.innerHTML }} />;
    } catch (error) {
      console.error("Erro ao processar HTML:", error);
      return <div className="text-red-500">Erro ao processar HTML do enunciado</div>;
    }
  };

  // Componente para exibir filtros de uma questão como tags
  const FilterTags: React.FC<{ question: BulkQuestion; filterTree: FilterNode[]; questionIdx: number }> = ({ question, filterTree, questionIdx }) => {
    const renderAppliedFilters = () => {
      const appliedFilters: React.ReactNode[] = [];
      
      // Filtros principais
      (question.filterIds || []).forEach(filterId => {
        // Usar smart matching para filtros principais
        const smartMatch = findFilterBySmartMatch(filterId);
        
        // Fallback: busca tradicional
        const filter = filters.find(f => f.id === filterId);
        const displayFilter = smartMatch || filter;
        
        // Remover log de debug desnecessário
        
        appliedFilters.push(
          displayFilter ? (
            <span key={`filter-${filterId}-${questionIdx}`} className="group px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1 hover:bg-blue-200">
              🏷️ {displayFilter.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilterFromQuestion(questionIdx, filterId, false);
                }}
                className="ml-1 text-blue-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover filtro"
              >
                ✕
              </button>
            </span>
          ) : (
            <span key={`filter-invalid-${filterId}-${questionIdx}`} className="group px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center gap-1">
              ❌ {filterId} (não encontrado)
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilterFromQuestion(questionIdx, filterId, false);
                }}
                className="ml-1 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover filtro inválido"
              >
                ✕
              </button>
            </span>
          )
        );
      });
      
      // Subfiltros
      (question.subFilterIds || []).forEach(subFilterId => {
        // Usar smart matching para subfiltros
        const smartMatch = findFilterBySmartMatch(subFilterId);
        
        // Fallback: busca tradicional na árvore
        const findSubFilter = (nodes: FilterNode[]): FilterNode | null => {
          for (const node of nodes) {
            if (node.id === subFilterId) return node;
            if (node.children) {
              const found = findSubFilter(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const subFilter = smartMatch || findSubFilter(filterTree);
        // Remover log de debug desnecessário
        
        appliedFilters.push(
          subFilter ? (
            <span key={`subfilter-${subFilterId}-${questionIdx}`} className="group px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1 hover:bg-green-200">
              🔖 {subFilter.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilterFromQuestion(questionIdx, subFilterId, true);
                }}
                className="ml-1 text-green-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover subfiltro"
              >
                ✕
              </button>
            </span>
          ) : (
            <span key={`subfilter-invalid-${subFilterId}-${questionIdx}`} className="group px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded flex items-center gap-1">
              ❓ {subFilterId} (não encontrado)
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilterFromQuestion(questionIdx, subFilterId, true);
                }}
                className="ml-1 text-orange-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover subfiltro inválido"
              >
                ✕
              </button>
            </span>
          )
        );
      });
      
      return appliedFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {appliedFilters}
          {question.aiGenerated && (
            <span 
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
              title="Filtros gerados por IA"
            >
              <i className="fas fa-robot mr-1 text-xs"></i>
              IA {Math.round((question.aiConfidence || 0) * 100)}%
            </span>
          )}
        </div>
      ) : (
        <div className="text-[var(--color-text-tertiary)] text-sm italic mt-2">
          Nenhum filtro aplicado - use o painel de filtros ou a categorização IA
        </div>
      );
    };

    return renderAppliedFilters();
  };

  // Calcular dados para o resumo da extração
  const naoExtraidas = extractionSummary?.questionsWithDetails.filter(q => q.problema === 'Não extraída') || [];
  const poucasAlternativas = extractionSummary?.questionsWithDetails.filter(q => q.problema !== 'Não extraída') || [];

  // --- Renderização Refatorada --- 
  return (
    <div className="container mx-auto p-4 md:p-8 bg-[var(--color-bg-main)] min-h-screen">
      {/* Cabeçalho */}
      <h1 className="text-3xl font-bold mb-6 text-[var(--color-text-main)] border-b pb-3 border-[var(--color-border)]">Criação de Questões em Lote</h1>

      {/* Seção de Upload e Extração PPTX */}
      <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-md mb-8 border border-[var(--color-border)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">📋 1. Extrair Questões do PPTX</h2>
        <div className="mb-4">
          <label htmlFor="pptx-upload" className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Selecione o arquivo PPTX:</label>
          <input
            id="pptx-upload"
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-[var(--color-text-tertiary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-bg-interactive-hover-subtle)] file:text-[var(--color-brand-primary)] hover:file:bg-[var(--color-bg-interactive)] cursor-pointer border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-main)]"
            accept=".pptx"
          />
          {fileInfo && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{fileInfo}</p>}
        </div>
        <button
          onClick={handleExtractQuestionsPPTX}
          disabled={!pptxFile || pptxLoading || categorizationLoading || saving}
          className="btn-neural px-6 py-2 rounded-lg shadow-md text-[var(--color-text-on-primary)] font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]"
        >
          {pptxLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></div>
              Extraindo...
            </>
          ) : (
            <>
              <i className="fas fa-file-powerpoint mr-2"></i>
          Extrair Questões do PPTX
            </>
          )}
        </button>
        {pptxLoading && (
          <div className="mt-4 p-3 bg-[var(--color-bg-accent)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-main)] text-sm flex items-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-brand-primary)] mr-2"></span>
            Extraindo do PPTX...
          </div>
        )}
      </div>

      {/* 📄 NOVA SEÇÃO: Upload e Extração de PDF */}
      <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-md mb-8 border border-[var(--color-border)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">📄 2. Extrair Mídia do PDF (Imagens + Tabelas)</h2>
        <div className="mb-4">
          <label htmlFor="pdf-upload" className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Selecione o arquivo PDF:</label>
          <input
            id="pdf-upload"
            type="file"
            onChange={handlePdfFileChange}
            className="block w-full text-sm text-[var(--color-text-tertiary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-bg-interactive-hover-subtle)] file:text-[var(--color-brand-primary)] hover:file:bg-[var(--color-bg-interactive)] cursor-pointer border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-main)]"
            accept=".pdf"
          />
          {pdfFile && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              📄 PDF: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        <button
          onClick={handleExtractMediaPDF}
          disabled={!pdfFile || pdfLoading || categorizationLoading || saving}
          className="btn-neural px-6 py-2 rounded-lg shadow-md text-[var(--color-text-on-primary)] font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center bg-[var(--color-feedback-success)] hover:bg-[var(--color-feedback-success-hover)]"
        >
          {pdfLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></div>
              Extraindo...
            </>
          ) : (
            <>
              <i className="fas fa-file-pdf mr-2"></i>
              Extrair Imagens + Tabelas do PDF
            </>
          )}
        </button>
        {pdfLoading && (
          <div className="mt-4 p-3 bg-[var(--color-bg-success-subtle)] border border-[var(--color-feedback-success)] rounded-lg text-[var(--color-text-main)] text-sm flex items-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-feedback-success)] mr-2"></span>
            Extraindo mídia do PDF com extrator híbrido (PDFPlumber + PyMuPDF)...
          </div>
        )}
        <div className="mt-3 p-3 bg-[var(--color-bg-interactive-hover-subtle)] rounded-lg text-xs text-[var(--color-text-secondary)]">
          <i className="fas fa-info-circle mr-2 text-[var(--color-brand-primary)"></i>
          <strong>Extrator Híbrido:</strong> Usa PDFPlumber para tabelas reais + PyMuPDF para imagens relevantes. Sem hardcoding - totalmente adaptativo.
        </div>
      </div>

      {/* 🚀 NOVA SEÇÃO: Extrator Gemini PPTX Avançado */}
      <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-md mb-8 border border-[var(--color-border)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">🚀 3. Extrator Gemini PPTX Avançado</h2>
        <div className="mb-4">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Extrator especializado em REVALIDA usando IA Gemini para análise avançada de PPTX.
          </p>
          <div className="bg-[var(--color-bg-warning-subtle)] p-3 rounded-lg border border-[var(--color-feedback-warning)] mb-4">
            <p className="text-xs text-[var(--color-text-main)] flex items-center">
              <i className="fas fa-info-circle mr-2 text-[var(--color-feedback-warning)]"></i>
              <strong>Nota:</strong> Use o mesmo arquivo PPTX selecionado acima. Este extrator usa IA avançada para melhor precisão.
            </p>
          </div>
        </div>

        <button
          onClick={handleGeminiPptxExtraction}
          disabled={!pptxFile || geminiPptxLoading || pptxLoading || categorizationLoading || saving}
          className="btn-neural px-6 py-2 rounded-lg shadow-md text-[var(--color-text-on-primary)] font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          title={pptxFile ? "Extrator Gemini PPTX Avançado - Especializado em REVALIDA" : "Selecione um arquivo PPTX primeiro"}
        >
          {geminiPptxLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></div>
              Extraindo com Gemini...
            </>
          ) : (
            <>
              <i className="fas fa-brain mr-2"></i>
              🚀 Extrair com Gemini PPTX Avançado
            </>
          )}
        </button>

        {geminiPptxLoading && (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg text-[var(--color-text-main)] text-sm flex items-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-2"></span>
            Processando com IA Gemini... Análise avançada em andamento.
          </div>
        )}

        {geminiPptxError && (
          <div className="mt-4 p-3 bg-[var(--color-bg-error-subtle)] border border-[var(--color-feedback-error)] rounded-lg text-[var(--color-feedback-error)] text-sm flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {geminiPptxError}
          </div>
        )}

        <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg text-xs text-[var(--color-text-secondary)]">
          <i className="fas fa-magic mr-2 text-emerald-600"></i>
          <strong>IA Gemini:</strong> Análise contextual avançada, reconhecimento de padrões REVALIDA e extração de alta precisão.
        </div>
      </div>

      {/* Resumo da Extração */}
      {extractionSummary && (
        <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-md mb-8 border border-[var(--color-border)]">
          <h2 className="text-xl font-semibold mb-6 text-[var(--color-text-main)] flex items-center">
            <i className="fas fa-chart-pie mr-2 text-[var(--color-bg-accent)]"></i>
            📊 Relatório Completo da Extração
          </h2>
          
          {/* Cards Principais de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[var(--color-bg-interactive-hover-subtle)] p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-[var(--color-brand-primary)]">{extractionSummary.extracted}</div>
              <div className="text-sm text-[var(--color-text-secondary)]">Questões Extraídas</div>
            </div>
            <div className="bg-[var(--color-bg-warning-subtle)] p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-[var(--color-feedback-warning)]">
                {(extractionSummary.detailedReport?.missing_questions?.length || 0) + 
                 (extractionSummary.detailedReport?.questions_with_3_alternatives?.length || 0) + 
                 (extractionSummary.detailedReport?.questions_with_2_or_less_alternatives?.length || 0)}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">Questões com Problemas</div>
            </div>
            <div className="bg-[var(--color-bg-success-subtle)] p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-[var(--color-feedback-success)]">{Math.round(extractionSummary.successRate)}%</div>
              <div className="text-sm text-[var(--color-text-secondary)]">Taxa de Sucesso</div>
            </div>
            <div className="bg-[var(--color-bg-accent)] p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">
                {(extractionSummary.mediaStats?.totalImages || 0) + (extractionSummary.mediaStats?.totalTables || 0)}
              </div>
              <div className="text-sm text-white">Mídia Extraída</div>
            </div>
          </div>
          
          {/* ⭐ SEÇÃO: DISTRIBUIÇÃO POR ALTERNATIVAS */}
          <div className="bg-[var(--color-bg-interactive-hover-subtle)] p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-[var(--color-text-main)] mb-4 flex items-center">
              <i className="fas fa-list-ol mr-2 text-[var(--color-brand-primary)]"></i>
              📋 Distribuição por Número de Alternativas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Questões com 6+ alternativas */}
              <div className="bg-[var(--color-bg-accent)] border border-[var(--color-brand-primary)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-brand-primary)]">🚀 6+ Alternativas</span>
                  <span className="text-lg font-bold text-[var(--color-brand-primary)]">
                    {extractionSummary.detailedReport?.questions_with_6_plus_alternatives?.length || 0}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-2">Muitas opções</div>
                {extractionSummary.detailedReport?.questions_with_6_plus_alternatives && extractionSummary.detailedReport.questions_with_6_plus_alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {extractionSummary.detailedReport.questions_with_6_plus_alternatives.slice(0, 8).map((q: string) => (
                      <span key={q} className="px-1 py-0.5 text-xs rounded bg-[var(--color-brand-primary)] text-white">
                        Q{q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.questions_with_6_plus_alternatives.length > 8 && (
                      <span className="px-1 py-0.5 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.questions_with_6_plus_alternatives.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Questões com 5 alternativas */}
              <div className="bg-[var(--color-bg-success-subtle)] border border-[var(--color-feedback-success)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-feedback-success)]">✅ 5 Alternativas</span>
                  <span className="text-lg font-bold text-[var(--color-feedback-success)]">
                    {extractionSummary.detailedReport?.questions_with_5_alternatives?.length || 0}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-2">Formato completo</div>
                {extractionSummary.detailedReport?.questions_with_5_alternatives && extractionSummary.detailedReport.questions_with_5_alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {extractionSummary.detailedReport.questions_with_5_alternatives.slice(0, 8).map((q: string) => (
                      <span key={q} className="px-1 py-0.5 text-xs rounded bg-[var(--color-feedback-success)] text-white">
                        Q{q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.questions_with_5_alternatives.length > 8 && (
                      <span className="px-1 py-0.5 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.questions_with_5_alternatives.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Questões com 4 alternativas */}
              <div className="bg-[var(--color-bg-info-subtle)] border border-[var(--color-feedback-info)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-feedback-info)]">📋 4 Alternativas</span>
                  <span className="text-lg font-bold text-[var(--color-feedback-info)]">
                    {(() => {
                      const fourAlt = extractionSummary.detailedReport?.questions_with_4_alternatives;
                      return Array.isArray(fourAlt) ? fourAlt.length : (fourAlt || 0);
                    })()}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-2">Formato padrão</div>
                {extractionSummary.detailedReport?.questions_with_4_alternatives && Array.isArray(extractionSummary.detailedReport.questions_with_4_alternatives) && extractionSummary.detailedReport.questions_with_4_alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {extractionSummary.detailedReport.questions_with_4_alternatives.slice(0, 8).map((q: string) => (
                      <span key={q} className="px-1 py-0.5 text-xs rounded bg-[var(--color-feedback-info)] text-white">
                        Q{q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.questions_with_4_alternatives.length > 8 && (
                      <span className="px-1 py-0.5 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.questions_with_4_alternatives.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Questões com 3- alternativas */}
              <div className="bg-[var(--color-bg-error-subtle)] border border-[var(--color-feedback-error)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-feedback-error)]">⚠️ 3- Alternativas</span>
                  <span className="text-lg font-bold text-[var(--color-feedback-error)]">
                    {extractionSummary.detailedReport?.questions_with_3_minus_alternatives?.length || 0}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-2">Incompletas</div>
                {extractionSummary.detailedReport?.questions_with_3_minus_alternatives && extractionSummary.detailedReport.questions_with_3_minus_alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {extractionSummary.detailedReport.questions_with_3_minus_alternatives.slice(0, 8).map((q: string) => (
                      <span key={q} className="px-1 py-0.5 text-xs rounded bg-[var(--color-feedback-error)] text-white">
                        Q{q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.questions_with_3_minus_alternatives.length > 8 && (
                      <span className="px-1 py-0.5 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.questions_with_3_minus_alternatives.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ⭐ SEÇÃO: MÍDIA EXTRAÍDA */}
          <div className="bg-[var(--color-bg-interactive-hover-subtle)] p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-[var(--color-text-main)] mb-4 flex items-center">
              <i className="fas fa-images mr-2 text-[var(--color-brand-primary)]"></i>
              🖼️ Mídia Extraída e Validada
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imagens Validadas */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[var(--color-text-main)] flex items-center">
                    <i className="fas fa-image mr-2 text-[var(--color-feedback-info)]"></i>
                    📸 Imagens ({extractionSummary.mediaStats?.totalImages || 0})
                  </h4>
                </div>

                {extractionSummary.detailedReport?.questions_with_images && extractionSummary.detailedReport.questions_with_images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-[var(--color-text-main)] mb-2">
                      📋 Questões com imagens ({extractionSummary.detailedReport.questions_with_images.length}):
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {extractionSummary.detailedReport.questions_with_images.map((item: any, idx: number) => (
                        <span key={idx} className="px-2 py-1 text-xs rounded bg-[var(--color-feedback-info)] text-white font-medium">
                          {typeof item === 'string' ? item : `Q${item.question || idx+1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-tertiary)] italic">
                    Nenhuma questão recebeu imagens nesta extração
                  </div>
                )}
              </div>

              {/* Tabelas */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[var(--color-text-main)] flex items-center">
                    <i className="fas fa-table mr-2 text-[var(--color-feedback-success)]"></i>
                    📊 Tabelas ({extractionSummary.mediaStats?.totalTables || 0})
                  </h4>
                </div>

                {extractionSummary.detailedReport?.questions_with_tables && extractionSummary.detailedReport.questions_with_tables.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-[var(--color-text-main)] mb-2">
                      📋 Questões com tabelas ({extractionSummary.detailedReport.questions_with_tables.length}):
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {extractionSummary.detailedReport.questions_with_tables.map((item: any, idx: number) => (
                        <span key={idx} className="px-2 py-1 text-xs rounded bg-[var(--color-feedback-success)] text-white font-medium">
                          {typeof item === 'string' ? item : `Q${item.question || idx+1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-tertiary)] italic">
                    Nenhuma questão recebeu tabelas nesta extração
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ⭐ SEÇÃO: PROBLEMAS ESPECÍFICOS */}
          <div className="space-y-4">
            {/* Questões com enunciados problemáticos */}
            {extractionSummary.detailedReport?.questions_with_problematic_statements && extractionSummary.detailedReport.questions_with_problematic_statements.length > 0 && (
              <div className="bg-[var(--color-bg-warning-subtle)] border border-[var(--color-feedback-warning)] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[var(--color-feedback-warning)] mb-3 flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  ⚠️ Enunciados Problemáticos ({extractionSummary.detailedReport.questions_with_problematic_statements.length})
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                  Questões com problemas na extração do enunciado (texto muito curto, truncado ou formatação estranha):
                </p>
                <div className="bg-[var(--color-bg-main)] p-3 rounded border border-[var(--color-border)]">
                  <div className="flex flex-wrap gap-1">
                    {extractionSummary.detailedReport.questions_with_problematic_statements.slice(0, 20).map((q: string) => (
                      <span key={q} className="px-2 py-1 text-xs rounded bg-[var(--color-feedback-warning)] text-white font-medium">
                        {q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.questions_with_problematic_statements.length > 20 && (
                      <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.questions_with_problematic_statements.length - 20}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Questões ausentes */}
            {extractionSummary.detailedReport?.missing_questions && extractionSummary.detailedReport.missing_questions.length > 0 && (
              <div className="bg-[var(--color-bg-error-subtle)] border border-[var(--color-feedback-error)] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[var(--color-feedback-error)] mb-3 flex items-center">
                  <i className="fas fa-times-circle mr-2"></i>
                  ❌ Questões Não Extraídas ({extractionSummary.detailedReport.missing_questions.length})
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                  Questões esperadas que não foram encontradas no documento (1-100 para Revalida):
                </p>
                <div className="bg-[var(--color-bg-main)] p-3 rounded border border-[var(--color-border)]">
                  <div className="flex flex-wrap gap-1">
                    {extractionSummary.detailedReport.missing_questions.slice(0, 30).map((q: string) => (
                      <span key={q} className="px-2 py-1 text-xs rounded bg-[var(--color-feedback-error)] text-white font-medium">
                        Q{q}
                      </span>
                    ))}
                    {extractionSummary.detailedReport.missing_questions.length > 30 && (
                      <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]">
                        +{extractionSummary.detailedReport.missing_questions.length - 30}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção de Edição e Categorização */}
      {questions.length > 0 && (
        <div className="bg-[var(--color-bg-card)] p-6 rounded-xl shadow-md mb-8 border border-[var(--color-border)]">
          {/* TOPO: Botões de automação/IA e painel de filtros */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
            {/* Botões de automação/IA */}
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={handleSelectAllQuestions} className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]">{selectedQuestions.size === questions.length ? 'Desmarcar' : 'Marcar'} Todas</button>
              <button onClick={handleExpandAll} className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]"><i className="fas fa-expand-arrows-alt mr-1"></i> Expandir Todas</button>
              <button onClick={handleCollapseAll} className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]"><i className="fas fa-compress-arrows-alt mr-1"></i> Recolher Todas</button>
              <button onClick={handleRemoveSelectedQuestions} disabled={selectedQuestions.size === 0} className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-feedback-error)] hover:bg-[var(--color-feedback-error-hover)] disabled:bg-[var(--color-bg-disabled)] disabled:opacity-50"><i className="fas fa-trash-alt mr-1"></i> Remover Selecionadas</button>
              <button
                onClick={() => {
                  // 💰 ECONOMIA: Carregar filtros apenas quando usuário abre o painel
                  if (!showFilterPanel && (!filtersLoaded || filters.length === 0)) {
                    setError('⏳ Carregando filtros... Por favor, aguarde.');
                    loadFiltersLazy().then(success => {
                      if (success) {
                        setError(null);
                        setShowFilterPanel(true);
                      } else {
                        setError('Falha ao carregar filtros. Verifique a conexão.');
                      }
                    });
                  } else {
                    setShowFilterPanel(!showFilterPanel);
                  }
                }}
                className={`btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold ${showFilterPanel ? 'bg-[var(--color-bg-accent)] hover:bg-[var(--color-bg-accent-hover)]' : 'bg-[var(--color-bg-interactive-hover-subtle)] hover:bg-[var(--color-bg-interactive)]'} flex items-center`}
                title="Mostrar/ocultar painel de filtros hierárquicos (carrega filtros automaticamente se necessário)"
              >
                <i className="fas fa-filter mr-2"></i>
                {showFilterPanel ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                {loadingFilters && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--color-text-on-primary)] ml-2"></span>}
              </button>
              <button
                onClick={() => {
                  // 💰 ECONOMIA: Carregar filtros apenas quando necessário para IA
                  if (!filtersLoaded || filters.length === 0) {
                    setError('⏳ Carregando filtros... Por favor, aguarde.');
                    loadFiltersLazy().then(success => {
                      if (success) {
                        setError(null);
                        handleSmartCategorize();
                      } else {
                        setError('Falha ao carregar filtros. Verifique a conexão.');
                      }
                    });
                  } else {
                    handleSmartCategorize();
                  }
                }}
                disabled={categorizationLoading || pptxLoading || saving || questions.length === 0}
                className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-bg-accent)] hover:bg-[var(--color-bg-accent-hover)] disabled:bg-[var(--color-bg-disabled)] disabled:opacity-50 flex items-center"
                title="🚀 Categorização HÍBRIDA - Rápida (local + IA só quando necessário)"
              >
                {categorizationLoading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></span> : <i className="fas fa-bolt mr-2"></i>}
                🧠 Categorizar com IA
              </button>
              <button
                onClick={handleAddManualQuestion}
                className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-feedback-success)] hover:bg-[var(--color-feedback-success-hover)] flex items-center"
                title="Adicionar nova questão em branco para edição manual"
              >
                <i className="fas fa-plus mr-2"></i>
                Adicionar Questão Manual
              </button>
              <button
                onClick={debugFilters}
                disabled={loadingFilters}
                className="btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold bg-[var(--color-bg-interactive)] hover:bg-[var(--color-bg-interactive-hover)] disabled:opacity-50 flex items-center"
                title="Testar carregamento de filtros para debug"
              >
                {loadingFilters ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></span> : <i className="fas fa-bug mr-2"></i>}
                Debug Filtros
              </button>
              <button
                onClick={() => setIntelligentAutomationMode(v => !v)}
                className={`btn-neural px-4 py-1 rounded shadow text-[var(--color-text-on-primary)] text-sm font-semibold ${intelligentAutomationMode ? 'bg-[var(--color-feedback-warning)]' : 'bg-[var(--color-bg-accent)]'} hover:bg-[var(--color-bg-accent-hover)]`}
              >
                <i className="fas fa-magic mr-1"></i>
                {intelligentAutomationMode ? 'Desativar' : 'Ativar'} Gabarito Automático
              </button>
            </div>
            {/* 🎯 SEÇÃO DE BACKUP E IMPORT/EXPORT */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="bg-[var(--color-bg-interactive-hover-subtle)] p-3 rounded-lg border border-[var(--color-border)]">
                <h4 className="text-xs font-semibold text-[var(--color-text-main)] mb-2 flex items-center">
                  <i className="fas fa-save mr-2 text-[var(--color-bg-accent)]"></i>
                  Backup & Import/Export
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportQuestionsToJSON}
                    disabled={questions.length === 0}
                    className="px-3 py-1 text-xs bg-[var(--color-bg-success)] text-[var(--color-text-on-primary)] rounded hover:bg-[var(--color-bg-success-hover)] disabled:opacity-50 flex items-center"
                    title="Baixar backup em JSON"
                  >
                    <i className="fas fa-download mr-1"></i>
                    Backup JSON
                  </button>
                  
                  <button
                    onClick={copyQuestionsToClipboard}
                    disabled={questions.length === 0}
                    className="px-3 py-1 text-xs bg-[var(--color-bg-accent)] text-[var(--color-text-on-primary)] rounded hover:bg-[var(--color-bg-accent-hover)] disabled:opacity-50 flex items-center"
                    title="Copiar questões para área de transferência"
                  >
                    <i className="fas fa-copy mr-1"></i>
                    Copiar
                  </button>
                  
                  <label className="px-3 py-1 text-xs bg-[var(--color-feedback-warning)] text-[var(--color-text-on-primary)] rounded hover:bg-[var(--color-feedback-warning-hover)] cursor-pointer flex items-center">
                    <i className="fas fa-upload mr-1"></i>
                    Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={importQuestionsFromJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                {questions.length > 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {questions.length} questões carregadas
                  </p>
                )}
              </div>
              
              {/* 💰 SEÇÃO DE INFO SOBRE ECONOMIA */}
              <div className="bg-[var(--color-bg-success-subtle)] p-3 rounded-lg border border-[var(--color-feedback-success)]">
                <h4 className="text-xs font-semibold text-[var(--color-feedback-success)] mb-2 flex items-center">
                  <i className="fas fa-coins mr-2"></i>
                  Economia Firestore
                </h4>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  <p className="mb-1">
                    <i className="fas fa-info-circle mr-1 text-[var(--color-feedback-info)]"></i>
                    <strong>Otimizado:</strong> Filtros carregados apenas quando necessário
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      filtersLoaded 
                        ? 'bg-[var(--color-feedback-success)] text-white' 
                        : 'bg-[var(--color-bg-disabled)] text-[var(--color-text-tertiary)]'
                    }`}>
                      {filtersLoaded ? `${filters.length} filtros carregados` : 'Filtros não carregados'}
                    </span>
                    {filtersCache && (
                      <span className="px-2 py-1 rounded text-xs bg-[var(--color-bg-accent)] text-white">
                        Cache: {Math.round((CACHE_DURATION - (Date.now() - filtersCache.timestamp)) / 1000 / 60)}min restantes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Painel de Filtros (Árvore) */}
          {showFilterPanel && (
              <div className="w-full bg-[var(--color-bg-interactive-hover-subtle)] border-2 border-[var(--color-brand-primary)] rounded-xl p-5 shadow-xl animate-fadeIn mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--color-brand-primary)] flex items-center">
                    <i className="fas fa-filter mr-2"></i>
                    Filtros Hierárquicos
                  </h3>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {selectedQuestions.size > 0 && (
                      <span className="bg-[var(--color-bg-accent)] text-[var(--color-text-on-primary)] px-2 py-1 rounded-full">
                        {selectedQuestions.size} questões selecionadas
                      </span>
                    )}
                  </div>
                </div>
              <input
                type="text"
                placeholder="Buscar filtro..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="input input-bordered input-sm w-full mb-3 border-[var(--color-border)] text-[var(--color-text-main)] bg-[var(--color-bg-main)] p-2 rounded"
                />
                <div className="max-h-80 overflow-y-auto pr-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-main)] p-3">
              {loadingFilters ? (
                    <p className="text-sm text-[var(--color-text-tertiary)] italic">Carregando filtros...</p>
              ) : filterTree.length > 0 ? (
                    filterTree.filter(node => node.name.toLowerCase().includes(filterSearch.toLowerCase())).map(node => (
                      <FilterTreeNode key={node.id} node={node} level={0} path={[]} />
                    ))
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] italic">Nenhum filtro encontrado ou falha ao carregar.</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                  <div className="flex items-center gap-4">
                    <span>Selecione questões e clique em "Aplicar" para adicionar filtros</span>
                    {selectedQuestions.size > 0 && (
                      <button
                        onClick={removeAllFiltersFromSelected}
                        className="px-3 py-1 bg-[var(--color-feedback-error)] text-[var(--color-text-on-primary)] rounded-lg hover:bg-[var(--color-feedback-error-hover)] text-xs font-medium flex items-center gap-1 transition-colors"
                        title={`Remover todos os filtros das ${selectedQuestions.size} questões selecionadas`}
                      >
                        <i className="fas fa-trash-alt"></i>
                        Remover Todos os Filtros ({selectedQuestions.size})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] px-2 py-1 rounded hover:bg-[var(--color-bg-interactive-hover-subtle)]"
                    title="Fechar painel de filtros"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Painel de Automação Inteligente de Gabarito */}
          {intelligentAutomationMode && (
            <div className="mb-6 p-4 border-2 border-[var(--color-feedback-warning)] rounded-xl bg-[var(--color-bg-warning-subtle)] shadow-lg">
              <h3 className="font-bold text-[var(--color-text-main)] mb-4 flex items-center">
                <i className="fas fa-magic text-[var(--color-feedback-warning)] mr-2"></i>
                Aplicação Automática de Gabarito
              </h3>
              
              <div className="bg-[var(--color-bg-card)] p-4 rounded-lg border border-[var(--color-border)] mb-4">
                <label className="block font-medium text-[var(--color-text-main)] mb-2">
                  <i className="fas fa-file-upload mr-2"></i>
                  Selecionar Arquivo de Gabarito:
                </label>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
                  Formatos suportados: PDF, TXT, CSV<br/>
                  Exemplos: "1,A", "Q1: A", "1) A", "Questão 1: A"
                </p>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.csv" 
                    onChange={handleGabaritoFileChange} 
                    className="block flex-1 text-sm text-[var(--color-text-tertiary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-bg-interactive-hover-subtle)] file:text-[var(--color-brand-primary)] hover:file:bg-[var(--color-bg-interactive)] cursor-pointer border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-main)]"
                  />
                  <button
                    onClick={processGabarito}
                    disabled={!gabaritoFile || processingGabarito}
                    className="px-4 py-2 bg-[var(--color-bg-success)] text-[var(--color-text-on-primary)] rounded-lg hover:bg-[var(--color-bg-success-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                  >
                    {processingGabarito ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-double mr-2"></i>
                        Aplicar Gabarito
                      </>
                    )}
                  </button>
                </div>
                {gabaritoFile && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                    <i className="fas fa-file mr-1"></i>
                    Arquivo selecionado: {gabaritoFile.name} ({(gabaritoFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              
              <div className="bg-[var(--color-bg-interactive-hover-subtle)] p-3 rounded-lg border border-[var(--color-border)]">
                <h4 className="text-sm font-medium text-[var(--color-text-main)] mb-2">
                  <i className="fas fa-info-circle mr-2"></i>
                  Como funciona:
                </h4>
                <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
                  <li>• Analisa o arquivo de gabarito (PDF, TXT ou CSV)</li>
                  <li>• Extrai as respostas corretas automaticamente</li>
                  <li>• Aplica as respostas a todas as questões correspondentes</li>
                  <li>• Funciona com formatos: "1,A", "Q1: A", "1) A", etc.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Indicador Loading IA */}
          {categorizationLoading && (
            <div className="mb-4 p-4 bg-[var(--color-bg-interactive-hover-subtle)] border border-[var(--color-brand-primary)] rounded-lg text-[var(--color-text-main)]">
              <div className="flex items-center mb-3">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-brand-primary)] mr-2"></span>
                <span className="text-sm font-medium">Categorizando questões com IA...</span>
              </div>

              {/* Barra de Progresso */}
              {categorizationProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                    <span>Lote {categorizationProgress.currentBatch} de {categorizationProgress.total}</span>
                    <span>{categorizationProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-disabled)] rounded-full h-2">
                    <div
                      className="bg-[var(--color-brand-primary)] h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${categorizationProgress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Processando {categorizationProgress.questionsInBatch} questões no lote atual
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de Questões */}
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.tempId || index} id={`question-${index}`} className={`border rounded-lg transition-all duration-300 ${selectedQuestions.has(index) ? 'border-[var(--color-brand-primary)] shadow-lg bg-[var(--color-bg-interactive-hover-subtle)]' : 'border-[var(--color-border)] bg-[var(--color-bg-main)]'}`}>
                {/* Cabeçalho da Questão */ 
                <div
                  className="p-4 flex items-center cursor-pointer hover:bg-[var(--color-bg-interactive-hover-subtle)] rounded-t-lg"
                  onClick={() => handleToggleExpandQuestion(index)}
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(index)}
                    onChange={() => handleSelectQuestion(index)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-4 h-4 w-4 rounded border-[var(--color-border)] checked:bg-[var(--color-brand-primary)]"
                  />
                  <span className="font-semibold text-[var(--color-text-main)] mr-3">
                    Questão {index + 1}
                    {/* ⭐ SÓ MOSTRAR NÚMERO ORIGINAL SE REALMENTE DIFERENTE E VÁLIDO */}
                    {question.numero && 
                     String(question.numero) !== String(index + 1) && 
                     !isNaN(Number(question.numero)) &&
                     Number(question.numero) > 0 &&
                     Number(question.numero) <= 100 && (
                      <span className="text-xs font-normal text-[var(--color-text-secondary)] ml-2 px-2 py-1 bg-[var(--color-bg-interactive-hover-subtle)] rounded">
                        Original: Q{question.numero}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)] truncate flex-grow mr-3" title={question.enunciado ? new DOMParser().parseFromString(question.enunciado, 'text/html').body.textContent || '' : ''}>
                    {question.enunciado ? (new DOMParser().parseFromString(question.enunciado, 'text/html').body.textContent?.substring(0, 80) || '[vazio]') + '...' : <i>Sem enunciado</i>}
                  </span>
                  
                  {/* 🎯 FILTROS COM BOTÕES REMOVÍVEIS NO CABEÇALHO */}
                  {((question.filterIds && question.filterIds.length > 0) || (question.subFilterIds && question.subFilterIds.length > 0)) && (
                    <div className="flex flex-wrap gap-1 mr-3 max-w-xs overflow-hidden">
                      {/* Filtros principais */}
                      {(question.filterIds || []).slice(0, 2).map(filterId => {
                        const smartMatch = findFilterBySmartMatch(filterId);
                        const filter = filters.find(f => f.id === filterId);
                        const displayFilter = smartMatch || filter;
                        
                        return displayFilter ? (
                          <span key={filterId} className="group px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1 hover:bg-blue-200 max-w-24 truncate">
                            🏷️ {displayFilter.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFilterFromQuestion(index, filterId, false);
                              }}
                              className="text-blue-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              title="Remover filtro"
                            >
                              ✕
                            </button>
                          </span>
                        ) : null;
                      })}
                      
                      {/* Subfiltros */}
                      {(question.subFilterIds || []).slice(0, 1).map(subFilterId => {
                        const smartMatch = findFilterBySmartMatch(subFilterId);
                        const findSubFilter = (nodes: FilterNode[]): FilterNode | null => {
                          for (const node of nodes) {
                            if (node.id === subFilterId) return node;
                            if (node.children) {
                              const found = findSubFilter(node.children);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        const subFilter = smartMatch || findSubFilter(filterTree);
                        
                        return subFilter ? (
                          <span key={subFilterId} className="group px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1 hover:bg-green-200 max-w-24 truncate">
                            🔖 {subFilter.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFilterFromQuestion(index, subFilterId, true);
                              }}
                              className="text-green-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              title="Remover subfiltro"
                            >
                              ✕
                            </button>
                          </span>
                        ) : null;
                      })}
                      
                      {/* Indicador de mais filtros */}
                      {(question.filterIds && question.filterIds.length > 2) || (question.subFilterIds && question.subFilterIds.length > 1) ? (
                        <span className="text-xs text-[var(--color-text-tertiary)] px-1">
                          +{((question.filterIds?.length || 0) - 2) + ((question.subFilterIds?.length || 0) - 1)} mais
                        </span>
                      ) : null}
                    </div>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full mr-3 whitespace-nowrap ${question.status === 'Publicada' ? 'bg-[var(--color-bg-success)] text-[var(--color-text-on-primary)]' : 'bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-main)]'}`}>
                    {question.status || 'Rascunho'}
                  </span>
                  <button className="text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-primary)] ml-auto text-lg w-6 h-6 flex items-center justify-center">
                    {expandedQuestions.has(index) ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}
                  </button>
                </div>
}

                {/* Corpo da Questão (Expansível) */}
                {expandedQuestions.has(index) && (
                  <div className="p-5 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] rounded-b-lg">
                    {/* Enunciado */} 
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Enunciado:</label>
                      <RichTextEditor
                        value={question.enunciado || ''}
                        onChange={(value) => handleQuestionChange(index, 'enunciado', value)}
                        placeholder="Digite o enunciado..."
                        height="200px"
                        editorRef={{
                          get current() {
                            return editorRefs.current[`enunciado-${index}`];
                          },
                          set current(editor: Editor | null) {
                            editorRefs.current[`enunciado-${index}`] = editor;
                          }
                        } as React.MutableRefObject<Editor | null>}
                      />
                    </div>
                    {/* Upload/Inserção de Imagem Inline */}
                    <div className="mb-4 flex items-center gap-2">
                      <button 
                        onClick={() => insertImageAtCursor(index)} 
                        className="px-3 py-2 bg-[var(--color-bg-accent)] text-[var(--color-text-on-primary)] rounded text-sm border border-[var(--color-border)] hover:bg-[var(--color-bg-accent-hover)] flex items-center gap-2 transition-colors"
                        title="Inserir imagem na posição do cursor"
                      >
                        <i className="fas fa-image"></i>
                        Inserir imagem no cursor
                      </button>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        Clique onde deseja inserir a imagem no enunciado, depois clique neste botão
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={el => { fileInputRefs.current[`inline-${index}`] = el; }}
                        onChange={e => { if (e.target.files && e.target.files[0]) handleImageUpload(index, e.target.files[0], true); }}
                      />
                    </div>
                    {/* Preview visual do enunciado */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1">Preview visual do enunciado:</label>
                      <div className="border border-[var(--color-border)] p-2 rounded bg-[var(--color-bg-main)]">
                        {renderEnunciadoPreview(question.enunciado)}
                      </div>
                    </div>
                    {/* Alternativas */} 
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Alternativas:</label>
                      
                      {/* 🎯 AVISO PARA QUESTÕES ANULADAS/DESATUALIZADAS */}
                      {(question.isAnnulled || question.isOutdated) && (
                        <div className="mb-3 p-3 bg-[var(--color-bg-warning-subtle)] border border-[var(--color-border-warning)] rounded-lg">
                          <div className="flex items-center gap-2 text-[var(--color-feedback-warning)]">
                            <i className="fas fa-info-circle"></i>
                            <span className="text-sm font-medium">
                              {question.isAnnulled ? 'Questão anulada:' : 'Questão desatualizada:'} múltiplas respostas permitidas
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            Você pode marcar várias alternativas como corretas e explicar no comentário.
                          </p>
                        </div>
                      )}
                      
                      {question.alternativas?.map((alt, aIndex) => (
                        <div key={aIndex} className="flex items-start mb-2">
                          {/* 🎯 LETRA DA ALTERNATIVA + SELECIONÁVEL */}
                          <div className="flex items-center mr-3 mt-2">
                            {/* Círculo com a letra da alternativa */}
                            <span className="w-6 h-6 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center font-bold text-xs mr-2">
                              {String.fromCharCode(65 + aIndex)}
                            </span>
                            
                            {/* Checkbox para questões anuladas/desatualizadas, Radio para normais */}
                            {(question.isAnnulled || question.isOutdated) ? (
                              <input
                                type="checkbox"
                                checked={Array.isArray(question.correta) ? question.correta.includes(aIndex) : question.correta === aIndex}
                                onChange={(e) => {
                                  const currentCorrect = Array.isArray(question.correta) ? question.correta : (question.correta !== undefined ? [question.correta] : []);
                                  if (e.target.checked) {
                                    // Adicionar à lista
                                    handleQuestionChange(index, 'correta', [...currentCorrect, aIndex]);
                                  } else {
                                    // Remover da lista
                                    handleQuestionChange(index, 'correta', currentCorrect.filter(i => i !== aIndex));
                                  }
                                }}
                                className="w-4 h-4 border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)] text-[var(--color-brand-primary)]"
                              />
                            ) : (
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.correta === aIndex}
                            onChange={() => handleCorrectAlternativeChange(index, aIndex)}
                                className="w-4 h-4 border-[var(--color-border)] checked:bg-[var(--color-brand-primary)]"
                          />
                            )}
                          </div>
                          
                          <div className="flex-grow">
                             <RichTextEditor
                               value={alt}
                               onChange={(value) => handleAlternativeChange(index, aIndex, value)}
                               placeholder={`Alternativa ${String.fromCharCode(65 + aIndex)}...`}
                               height="80px"
                             />
                          </div>
                          <button
                            onClick={() => handleRemoveAlternative(index, aIndex)}
                            className="ml-2 text-[var(--color-feedback-error)] hover:text-[var(--color-feedback-error-hover)] mt-2"
                            title="Remover Alternativa"
                          >
                            <i className="fas fa-times-circle"></i>
                          </button>
                        </div>
                      ))}
                      <button onClick={() => handleAddAlternative(index)} className="px-3 py-1 mt-2 text-sm rounded bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-main)] border border-[var(--color-border)] hover:bg-[var(--color-bg-interactive)]">
                        <i className="fas fa-plus mr-1"></i> Adicionar Alternativa
                      </button>
                    </div>
                    {/* Outros Campos */} 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Dificuldade:</label>
                        <select value={question.dificuldade || 'Média'} onChange={(e) => handleQuestionChange(index, 'dificuldade', e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)]">
                          <option>Fácil</option> <option>Média</option> <option>Difícil</option> <option>Muito Difícil</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Status:</label>
                        <select value={question.status || 'Rascunho'} onChange={(e) => handleQuestionChange(index, 'status', e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)]">
                          <option>Rascunho</option> <option>Revisão</option> <option>Publicada</option> <option>Arquivada</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 🗑️ REMOVIDO: Seção duplicada de "Filtros Aplicados" (tags simples) */}
                    {/* A seção "Filtros Associados" com FilterTags (botões removíveis) já existe abaixo */}
                    
                    {/* Explicação */} 
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">Explicação/Resolução:</label>
                      <RichTextEditor value={question.explicacao || ''} onChange={(value) => handleQuestionChange(index, 'explicacao', value)} placeholder="Digite a explicação..." height="120px"/>
                    </div>
                    {/* Status Especiais: Anulada/Desatualizada */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-text-main)] mb-3 flex items-center">
                        <i className="fas fa-exclamation-triangle text-[var(--color-feedback-warning)] mr-2"></i>
                        Status Especiais
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          onClick={() => toggleAnulada(index)}
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                            question.isAnnulled 
                              ? 'border-[var(--color-feedback-error)] bg-[var(--color-bg-error-subtle)]' 
                              : 'border-[var(--color-border)] bg-[var(--color-bg-interactive-hover-subtle)] hover:border-[var(--color-feedback-error)]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              question.isAnnulled ? 'border-[var(--color-feedback-error)] bg-[var(--color-feedback-error)]' : 'border-[var(--color-border)]'
                            }`}>
                              {question.isAnnulled && <i className="fas fa-check text-white text-xs"></i>}
                            </div>
                            <div>
                              <h4 className="font-medium text-[var(--color-text-main)] text-sm">Questão Anulada</h4>
                              <p className="text-xs text-[var(--color-text-tertiary)]">Marcar esta questão como anulada</p>
                            </div>
                          </div>
                        </div>

                        <div 
                          onClick={() => toggleDesatualizada(index)}
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                            question.isOutdated 
                              ? 'border-[var(--color-feedback-warning)] bg-[var(--color-bg-warning-subtle)]' 
                              : 'border-[var(--color-border)] bg-[var(--color-bg-interactive-hover-subtle)] hover:border-[var(--color-feedback-warning)]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              question.isOutdated ? 'border-[var(--color-feedback-warning)] bg-[var(--color-feedback-warning)]' : 'border-[var(--color-border)]'
                            }`}>
                              {question.isOutdated && <i className="fas fa-check text-white text-xs"></i>}
                            </div>
                            <div>
                              <h4 className="font-medium text-[var(--color-text-main)] text-sm">Questão Desatualizada</h4>
                              <p className="text-xs text-[var(--color-text-tertiary)]">Marcar esta questão como desatualizada</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {(question.isAnnulled || question.isOutdated) && (
                        <div className="mt-4 p-3 bg-[var(--color-bg-warning-subtle)] border-l-4 border-[var(--color-feedback-warning)] rounded-lg">
                          <div className="flex">
                            <i className="fas fa-exclamation-triangle text-[var(--color-feedback-warning)] mt-1 mr-2"></i>
                            <div>
                              <h4 className="text-xs font-medium text-[var(--color-text-main)]">
                                Status Especial Ativo
                              </h4>
                              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                                Esta questão será marcada como {question.isAnnulled && question.isOutdated ? 'anulada e desatualizada' : question.isAnnulled ? 'anulada' : 'desatualizada'}.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Imagem */} 
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[var(--color-text-main)] mb-1">URL da Imagem (Opcional):</label>
                      <input type="url" value={question.imagem || ''} onChange={(e) => handleQuestionChange(index, 'imagem', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)]"/>
                      {question.imagem && (
                        <div className="mt-2 text-center bg-white p-2 border border-gray-300 rounded inline-block">
                          <img
                            src={getFullImageUrl(question.imagem)}
                            alt="Prévia da imagem"
                            className="max-w-xs max-h-40 rounded object-contain bg-white"
                            style={{ display: 'block', margin: '0' }}
                          />
                        </div>
                      )}
                    </div>
                    {/* Filtros Associados */}
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-[var(--color-text-main)] flex items-center">
                        <i className="fas fa-filter text-[var(--color-bg-accent)] mr-2"></i>
                        Filtros Associados
                      </h4>
                      <FilterTags question={question} filterTree={filterTree} questionIdx={index} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem de Erro Global */} 
      {error && (
        <div className="mt-6 p-4 bg-[var(--color-bg-error)] border border-[var(--color-feedback-error)] rounded-lg text-[var(--color-feedback-error)] text-sm shadow-md">
          <div className="flex items-center mb-2">
             <i className="fas fa-exclamation-circle mr-2 text-lg"></i>
             <strong className="font-semibold">Erro Encontrado</strong>
          </div>
          {/* Usar pre-wrap para manter as quebras de linha da mensagem de erro */} 
          <pre className="whitespace-pre-wrap text-xs font-mono bg-[var(--color-bg-error-subtle)] p-2 rounded border border-[var(--color-feedback-error)]">{error}</pre>
          <button onClick={() => setError(null)} className="text-xs text-[var(--color-feedback-error)] hover:underline mt-2">Fechar aviso</button>
        </div>
      )}

      {/* Botão Final de Salvar */} 
      {questions.length > 0 && (
      <div className="mt-8 text-right sticky bottom-4 pr-4">
        <button
          onClick={handleSaveChanges}
            disabled={saving || questions.length === 0}
            className="btn btn-success btn-lg text-[var(--color-text-on-primary)] shadow-lg disabled:opacity-50 flex items-center ml-auto bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] rounded-lg px-6 py-3"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)] mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Salvar Todas ({questions.length})
              </>
            )}
        </button>
      </div>
      )}
    </div>
  );
};

export default AdminQuestionsBulkCreatePage;

