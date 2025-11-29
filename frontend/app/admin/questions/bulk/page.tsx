'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { medbraveAIService } from '@/services/medbraveAIService';
import { getAllFilters } from '@/services/admin/filterService';
import type { Filter as FilterType, SubFilter as SubFilterType } from '@/types/admin/filter';
import { scraperService } from '@/services/scraperService';
// useScraperWebSocket removido - usando useJobProgress via JobProgressDisplay
import { UrlConfigPanel } from '@/components/admin/scraper/UrlConfigPanel';
import { r2ImageUploadService } from '@/services/r2ImageUploadService';
import { categorizationService, CategorizationResult, CategorizationProgress } from '@/services/categorizationService';
import { CategorizationButton } from '@/components/admin/categorization/CategorizationButton';
import { CategorizationProgressModal } from '@/components/admin/categorization/CategorizationProgressModal';
import { CategorizationResultsViewer } from '@/components/admin/categorization/CategorizationResultsViewer';
import Checkbox from '@/components/ui/Checkbox';
import { JobProgressDisplay } from '@/components/admin/scraper/JobProgressDisplay';
import { FilterTreePanel } from '@/components/admin/filters/FilterTreePanel';
import { FilterTags } from '@/components/admin/filters/FilterTags';
import { DraftsList } from '@/components/admin/scraper/DraftsList';
import { DraftsManager } from '@/components/admin/scraper/DraftsManager';
import { CommentWarningAlert } from '@/components/admin/scraper/CommentWarningAlert';
import { useToast } from '@/lib/contexts/ToastContext';
import dynamic from 'next/dynamic';

// Importar RichTextEditor dinamicamente
const RichTextEditor = dynamic(
  () => import('@/components/admin/ui/RichTextEditor'),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-64 rounded-lg"></div> }
);

// ==================== INTERFACES ====================
interface BulkQuestion {
  id?: string;
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta?: number | number[]; // 🎯 PERMITIR MÚLTIPLAS RESPOSTAS CORRETAS
  dificuldade?: string;
  status?: string;
  tags?: string[];
  filterIds?: string[];
  subFilterIds?: string[];
  professorComment?: string;
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

type Filter = FilterType & { children?: SubFilter[] };
type SubFilter = SubFilterType & { children?: SubFilter[] };

// ==================== COMPONENTE PRINCIPAL ====================
const BulkCreateQuestionsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // ==================== ESTADOS PRINCIPAIS ====================
  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<BulkQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  // ==================== ESTADOS DE LOADING ====================
  const [pptxLoading, setPptxLoading] = useState(false);
  const [categorizationLoading, setCategorizationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // ==================== ESTADOS DE FILTROS ====================
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filtersCache, setFiltersCache] = useState<{ data: Filter[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // ==================== ESTADOS DE UI ====================
  const [error, setError] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // ==================== ESTADOS DE CATEGORIZAÇÃO ====================
  const [showCategorizationProgress, setShowCategorizationProgress] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState<CategorizationProgress | null>(null);
  const [categorizationResults, setCategorizationResults] = useState<CategorizationResult[]>([]);
  const [showCategorizationResults, setShowCategorizationResults] = useState(false);
  const [categorizationJobId, setCategorizationJobId] = useState<string | null>(null);

  // ==================== ESTADOS DE BATCH ====================
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  // ==================== ESTADOS DE FILTROS MANUAIS ====================
  const [filterNames, setFilterNames] = useState<Map<string, string>>(new Map());

  // ==================== ESTADOS DE FILTRO E BUSCA ====================
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ==================== ESTADOS DE DRAFT ====================
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftMetadata, setDraftMetadata] = useState<{
    commentsGenerated?: number;
    commentsFailed?: number;
    missingCommentQuestions?: string[];
    totalQuestions?: number;
    examName?: string;
    url?: string;
    categorizedQuestions?: number;
  } | null>(null);

  // ==================== FUNÇÃO HELPER: CALCULAR METADADOS DE COMENTÁRIOS ====================
  const calculateCommentMetadata = (questions: BulkQuestion[]) => {
    const questionsWithComments = questions.filter(q =>
      q.professorComment && q.professorComment.trim().length > 0
    ).length;
    const questionsWithoutComments = questions.length - questionsWithComments;
    const missingCommentQuestions = questions
      .filter(q => !q.professorComment || q.professorComment.trim().length === 0)
      .map(q => q.numero || 'Sem número');

    return {
      commentsGenerated: questionsWithComments,
      commentsFailed: questionsWithoutComments,
      missingCommentQuestions,
      totalQuestions: questions.length,
    };
  };

  // ✅ Recalcular metadados sempre que as questões mudarem (exceto quando vem de draft)
  useEffect(() => {
    if (questions.length > 0 && !loadingDraft) {
      const metadata = calculateCommentMetadata(questions);
      // Preservar campos existentes (examName, url, categorizedQuestions)
      setDraftMetadata(prev => ({
        ...prev,
        ...metadata,
      }));
    }
  }, [questions, loadingDraft]);

  // ==================== ESTADOS DE PROVA OFICIAL ====================
  const [saveAsOfficialExam, setSaveAsOfficialExam] = useState(false);
  const [officialExamData, setOfficialExamData] = useState({
    title: '',
    universityId: '', // ID do subfiltro de universidade da tabela sub_filters
    examTypeFilterId: '', // ID do filtro de tipo de prova (Revalida, Residência Médica, R3, etc)
    tags: [] as string[],
    // Campos adicionais
    isPublished: false,
    examType: '',
    examYear: undefined as number | undefined,
    examName: '',
    description: '',
    instructions: '',
    timeLimitMinutes: 240, // 4 horas padrão
  });

  // Questões filtradas (memoizado para performance)
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Filtro de busca
      const matchesSearch = searchTerm === '' ||
        q.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.enunciado.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'with-gabarito' && q.correta !== undefined) ||
        (filterStatus === 'without-gabarito' && q.correta === undefined) ||
        (filterStatus === 'categorized' && (q.filterIds?.length || 0) > 0) ||
        (filterStatus === 'not-categorized' && (q.filterIds?.length || 0) === 0);

      return matchesSearch && matchesStatus;
    });
  }, [questions, searchTerm, filterStatus]);

  // ==================== ESTADOS DE RESUMO ====================
  const [extractionSummary, setExtractionSummary] = useState<{
    total: number;
    extracted: number;
    missing: string[];
    extractedNumbers: string[];
    problematic: Array<{ numero: string; reason: string }>;
    successRate: number;
    mediaStats?: {
      totalImages?: number;
      totalTables?: number;
    };
  } | null>(null);

  // ==================== ESTADOS DO SCRAPER ====================
  // Modo de extração: 'pptx' | 'scraper-manual' | 'scraper-batch' | 'manage-drafts'
  const [extractionMode, setExtractionMode] = useState<'pptx' | 'scraper-manual' | 'scraper-batch' | 'manage-drafts'>('pptx');

  // Scraper Manual
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperExtracting, setScraperExtracting] = useState(false);
  const [scraperProgress, setScraperProgress] = useState<{
    status: string;
    currentQuestion: number;
    totalQuestions: number;
    message: string;
    questionsExtracted: number;
    questionsWithErrors: number;
    questionsWithImages: number;
    extractedQuestions: Array<{ numero: string; hasImage: boolean; hasError: boolean }>;
  } | null>(null);

  // Scraper Batch
  const [batchUrls, setBatchUrls] = useState('');
  const [batchUrlsArray, setBatchUrlsArray] = useState<string[]>([]);
  const [batchConfigs, setBatchConfigs] = useState<Record<string, {
    saveAsOfficial: boolean;
    officialExamData?: any;
  }>>({});
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    currentUrl?: string;
  } | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Array<{
    jobId: string;
    createdAt: string;
    totalUrls: number;
    status: string;
  }>>([]);

  // Scraper Source Selection
  const [scraperSource, setScraperSource] = useState<'url' | 'alternative'>('url');
  const [examSources, setExamSources] = useState<Array<{
    id: string;
    source_index: number;
    label: string;
    source_value: string;
  }>>([]);
  const [selectedExamSources, setSelectedExamSources] = useState<string[]>([]);
  const [examSourcesLoading, setExamSourcesLoading] = useState(false);
  const [examSourceSearch, setExamSourceSearch] = useState('');

  // ==================== ESTADOS DE PROCESSAMENTO DE IMAGENS R2 ====================
  const [imageProcessingProgress, setImageProcessingProgress] = useState<{
    current: number;
    total: number;
    currentQuestion: number;
    totalQuestions: number;
  } | null>(null);

  // WebSocket removido - usando JobProgressDisplay com useJobProgress agora

  // ==================== REFS ====================
  const editorRefs = useRef<{ [key: string]: any }>({});

  // ==================== BUSCAR JOBS ATIVOS AO CARREGAR ====================
  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const result = await scraperService.listJobs({
          status: 'processing',
          limit: 100
        });
        const processingJobs = result.jobs.filter((j: any) =>
          j.status === 'processing' || j.status === 'pending'
        );
        setActiveJobs(processingJobs);
        console.log(`📋 Found ${processingJobs.length} active jobs`);
      } catch (error) {
        console.error('Error fetching active jobs:', error);
      }
    };

    fetchActiveJobs();
  }, []);

  // ==================== CARREGAR EXAM SOURCES ====================
  useEffect(() => {
    const fetchExamSources = async () => {
      if (scraperSource !== 'alternative') return;

      setExamSourcesLoading(true);
      try {
        const token = getAuthToken();
        const response = await fetch('/api/admin/scraper/exam-sources', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setExamSources(result.data);
          console.log(`✅ Loaded ${result.data.length} exam sources`);
          console.log(`📊 UFG sources:`, result.data.filter((s: any) => s.label.toLowerCase().includes('ufg')).length);
        }
      } catch (error) {
        console.error('Error fetching exam sources:', error);
        setError('Erro ao carregar fontes de exames');
      } finally {
        setExamSourcesLoading(false);
      }
    };

    fetchExamSources();
  }, [scraperSource]);

  // ==================== CARREGAR DRAFT DA URL ====================
  useEffect(() => {
    const draftIdParam = searchParams?.get('draftId');
    if (draftIdParam && draftIdParam !== draftId) {
      setDraftId(draftIdParam);
      loadDraftData(draftIdParam);
    }
  }, [searchParams]);

  // Função para carregar dados do draft
  const loadDraftData = async (id: string) => {
    setLoadingDraft(true);
    setError(null);

    try {
      const { draftService } = await import('@/services/draftService');
      const draft = await draftService.getDraft(id);

      console.log(`📋 Draft carregado:`, {
        questionsCount: draft.questions?.length,
        categorizationResultsCount: draft.categorization_results?.length,
        firstQuestion: draft.questions?.[0],
        title: draft.title,
        url: draft.url,
        metadata: draft.metadata,
      });

      // ✅ Salvar metadados de comentários para exibir alertas
      // O campo 'url' do draft contém o nome completo da prova selecionada no dropdown
      const titleToUse = draft.url || draft.title || (draft.metadata as any).examName;
      console.log(`📝 Título que será usado: "${titleToUse}"`);
      
      setDraftMetadata({
        commentsGenerated: draft.metadata.commentsGenerated,
        commentsFailed: draft.metadata.commentsFailed,
        missingCommentQuestions: draft.metadata.missingCommentQuestions,
        totalQuestions: draft.metadata.totalQuestions,
        examName: titleToUse,
        url: draft.metadata.url || draft.url,
        categorizedQuestions: draft.metadata.categorizedQuestions,
      });

      // Popular questões (já vêm com filterIds e subFilterIds do backend)
      setQuestions(draft.questions || []);

      // Popular resultados de categorização para referência (opcional)
      if (draft.categorization_results && draft.categorization_results.length > 0) {
        const results = draft.categorization_results;
        setCategorizationResults(results);

        // ✅ POPULAR filterNames Map com os nomes dos filtros (para mostrar chips)
        setFilterNames(prev => {
          const updated = new Map(prev);

          results.forEach((result: any, idx: number) => {
            console.log(`[DEBUG] Processing categorization result ${idx}:`, {
              status: result.status,
              filtersCount: result.suggestedFilters?.length,
              subfiltersCount: result.suggestedSubfilters?.length,
              firstFilter: result.suggestedFilters?.[0],
              firstSubfilter: result.suggestedSubfilters?.[0],
            });

            // Adicionar nomes dos filtros (independente do status)
            result.suggestedFilters?.forEach((f: any) => {
              if (f.filterId && f.filterName) {
                console.log(`[DEBUG] Adding filter: ${f.filterId} -> ${f.filterName}`);
                updated.set(f.filterId, f.filterName);
              }
            });

            // Adicionar nomes dos subfiltros (independente do status)
            result.suggestedSubfilters?.forEach((sf: any) => {
              if (sf.subfilterId && sf.subfilterName) {
                console.log(`[DEBUG] Adding subfilter: ${sf.subfilterId} -> ${sf.subfilterName}`);
                updated.set(sf.subfilterId, sf.subfilterName);
              }
            });
          });

          console.log(`✅ ${updated.size} nomes de filtros carregados no Map`);
          console.log(`[DEBUG] filterNames Map contents:`, Array.from(updated.entries()));
          return updated;
        });

          console.log(`✅ ${results.length} resultados de categorização carregados`);
      }

      // Verificar se questões têm filtros
      const questionsWithFilters = draft.questions?.filter((q: any) =>
        q.filterIds && q.filterIds.length > 0
      ).length || 0;

      console.log(`✅ Draft ${id} carregado: ${questionsWithFilters}/${draft.questions?.length} questões com filtros`);

      // DEBUG: Mostrar detalhes das primeiras 3 questões
      console.log('[DEBUG] First 3 questions details:');
      draft.questions?.slice(0, 3).forEach((q: any, idx: number) => {
        console.log(`[DEBUG] Question ${idx + 1} (${q.numero}):`, {
          hasFilterIds: !!q.filterIds,
          filterIds: q.filterIds,
          hasSubFilterIds: !!q.subFilterIds,
          subFilterIds: q.subFilterIds,
          filterIdsLength: q.filterIds?.length || 0,
          subFilterIdsLength: q.subFilterIds?.length || 0,
        });
      });
    } catch (error) {
      console.error('❌ Erro ao carregar draft:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar draft');
    } finally {
      setLoadingDraft(false);
    }
  };

  // Desabilitar scroll suave para evitar jumps ao expandir/recolher
  useEffect(() => {
    const html = document.documentElement;
    const originalScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    return () => {
      html.style.scrollBehavior = originalScrollBehavior;
    };
  }, []);

  // ==================== BACKGROUND PROCESSING - LOCALSTORAGE ====================

  // Carregar jobs salvos do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem('scraper-batch-jobs');
    if (saved) {
      try {
        const jobs = JSON.parse(saved);
        setSavedJobs(jobs);
        console.log(`📋 ${jobs.length} jobs salvos carregados do localStorage`);
      } catch (e) {
        console.error('❌ Erro ao carregar jobs salvos:', e);
        localStorage.removeItem('scraper-batch-jobs');
      }
    }
  }, []);

  // Salvar job no localStorage
  const saveJobToStorage = (jobId: string, totalUrls: number) => {
    const newJob = {
      jobId,
      createdAt: new Date().toISOString(),
      totalUrls,
      status: 'processing',
    };

    const updated = [...savedJobs, newJob];
    setSavedJobs(updated);
    localStorage.setItem('scraper-batch-jobs', JSON.stringify(updated));
    console.log(`💾 Job ${jobId} salvo no localStorage`);
  };

  // Remover job do localStorage
  const removeJobFromStorage = (jobId: string) => {
    const updated = savedJobs.filter(job => job.jobId !== jobId);
    setSavedJobs(updated);
    localStorage.setItem('scraper-batch-jobs', JSON.stringify(updated));
    console.log(`🗑️ Job ${jobId} removido do localStorage`);
  };

  // Retomar job salvo
  const resumeJob = async (jobId: string) => {
    try {
      console.log(`🔄 Retomando job ${jobId}...`);
      const status = await scraperService.getJobStatus(jobId);
      setCurrentJobId(jobId);

      if (status.status === 'processing') {
        setBatchProcessing(true);
        setBatchProgress({
          total: status.progress.total,
          completed: status.progress.completed,
          failed: status.progress.failed,
          percentage: status.progress.percentage,
          currentUrl: status.currentUrl,
        });
        console.log(`✅ Job retomado: ${status.progress.completed}/${status.progress.total} URLs processadas`);
      } else if (status.status === 'completed' || status.status === 'failed') {
        setBatchProcessing(false);
        setBatchResults(status.results);
        removeJobFromStorage(jobId);
        console.log(`✅ Job ${jobId} já foi completado`);
      } else {
        setBatchProcessing(false);
        console.log(`⚠️ Job ${jobId} está em status: ${status.status}`);
      }
    } catch (err: any) {
      console.error('❌ Erro ao retomar job:', err);
      setError(`Erro ao retomar job: ${err.message}`);
      removeJobFromStorage(jobId);
    }
  };

  // Atualizar status do job no localStorage quando completar
  useEffect(() => {
    if (currentJobId && !batchProcessing && batchResults.length > 0) {
      // Job completado, remover do localStorage
      removeJobFromStorage(currentJobId);
    }
  }, [currentJobId, batchProcessing, batchResults]);

  // ==================== ATALHOS DE TECLADO ====================
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + S = Salvar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (questions.length > 0 && !saving) {
          handleSaveChanges();
        }
      }
      // Ctrl/Cmd + A = Selecionar todas
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (questions.length > 0) {
          handleSelectAllQuestions();
        }
      }
      // Ctrl/Cmd + E = Expandir todas
      else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (questions.length > 0) {
          handleExpandAll();
        }
      }
      // Ctrl/Cmd + Shift + E = Recolher todas
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        if (questions.length > 0) {
          handleCollapseAll();
        }
      }
      // Escape = Limpar seleção
      else if (e.key === 'Escape') {
        if (selectedQuestions.size > 0) {
          setSelectedQuestions(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [questions, saving, selectedQuestions]);

  // ==================== FUNÇÕES DE LAZY LOADING DE FILTROS ====================

  // 💰 ECONOMIA: Carregar filtros apenas quando necessário (LAZY LOADING)
  const loadFiltersLazy = async (forceReload: boolean = false): Promise<boolean> => {
    // Verificar cache primeiro
    const now = Date.now();
    if (!forceReload && filtersCache && (now - filtersCache.timestamp) < CACHE_DURATION) {
      console.log('💰 ECONOMIA: Usando filtros do cache local (sem requisição ao banco)');
      setFilters(filtersCache.data);
      setFiltersLoaded(true);

      // ✅ VALIDAÇÃO: Verificar se os dados do cache são válidos
      if (!filtersCache.data || filtersCache.data.length === 0) {
        console.warn('⚠️ Cache inválido: dados vazios, forçando reload');
        return await loadFiltersLazy(true); // Forçar reload se cache está inválido
      }

      // Popular filterNames do cache também
      const namesMap = new Map<string, string>();
      const populateNames = (items: any[]) => {
        items.forEach(item => {
          if (item.id && item.name) {
            namesMap.set(item.id, item.name);
          }
          if (item.children && Array.isArray(item.children)) {
            populateNames(item.children);
          }
          if (item.subfilters && Array.isArray(item.subfilters)) {
            populateNames(item.subfilters);
          }
        });
      };
      populateNames(filtersCache.data);
      setFilterNames(namesMap);

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
      console.log(`💰 FAZENDO REQUISIÇÃO AO BANCO: ${forceReload ? 'forçada' : 'primeira vez'}`);
      const allFilters = await getAllFilters();

      // ✅ VALIDAÇÃO ROBUSTA: Verificar se os dados são válidos e úteis
      if (Array.isArray(allFilters) && allFilters.length > 0) {
        // Verificar se os filtros têm estrutura mínima esperada
        const validFilters = allFilters.filter(f => f && f.id && f.name);

        if (validFilters.length === 0) {
          console.error('❌ Nenhum filtro válido encontrado (sem id ou name)');
          setFilters([]);
          setFiltersLoaded(true);
          setError('Filtros carregados não têm estrutura válida.');
          return false;
        }

        setFilters(validFilters);
        setFiltersLoaded(true);

        // Atualizar cache
        setFiltersCache({
          data: validFilters,
          timestamp: now
        });

        // Popular filterNames com todos os filtros e subfiltros
        const namesMap = new Map<string, string>();
        const populateNames = (items: any[]) => {
          items.forEach(item => {
            if (item.id && item.name) {
              namesMap.set(item.id, item.name);
            }
            // Recursivamente adicionar subfiltros
            if (item.children && Array.isArray(item.children)) {
              populateNames(item.children);
            }
            if (item.subfilters && Array.isArray(item.subfilters)) {
              populateNames(item.subfilters);
            }
          });
        };
        populateNames(validFilters);
        setFilterNames(namesMap);
        console.log(`✅ NOMES CARREGADOS: ${namesMap.size} nomes de filtros/subfiltros mapeados`);

        console.log(`✅ FILTROS CARREGADOS: ${validFilters.length} filtros principais carregados e salvos no cache`);

        return true;
      } else {
        console.error("❌ Dados de filtros inválidos recebidos:", {
          isArray: Array.isArray(allFilters),
          length: allFilters?.length,
          type: typeof allFilters
        });
        setFilters([]);
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
      return false;
    } finally {
      setLoadingFilters(false);
    }
  };

  // ==================== HANDLERS DE ARQUIVO ====================

  // Handler para mudança de arquivo PPTX
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pptx')) {
        setError('Formato inválido. Selecione um arquivo PPTX.');
        setPptxFile(null);
        return;
      }
      setPptxFile(file);
      setError(null);
      setQuestions([]);
      setSelectedQuestions(new Set());
      setExpandedQuestions(new Set());
    }
  };

  // ==================== FUNÇÃO DE EXTRAÇÃO PPTX ====================

  const handleExtractQuestionsPPTX = async () => {
    if (!pptxFile) {
      setError('Selecione um arquivo PPTX.');
      return;
    }

    setPptxLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setExpandedQuestions(new Set());

    try {
      console.log('🚀 Iniciando extração PPTX...');
      const result = await medbraveAIService.extractQuestionsFromFile(pptxFile);

      if (result && result.questions && Array.isArray(result.questions)) {
        const formattedQuestions = result.questions.map((q: any, index: number) => ({
          numero: q.numero || `Q${index + 1}`,
          enunciado: q.enunciado || '',
          alternativas: q.alternativas || [],
          correta: q.correta,
          dificuldade: q.dificuldade || 'Média',
          tags: q.tags || [],
          filterIds: q.filterIds || [],
          subFilterIds: q.subFilterIds || [],
          professorComment: q.professorComment || q.explicacao || '',
          imagem: q.imagem || undefined,
          tempId: `temp-pptx-${Date.now()}-${index}`,
          aiGenerated: false,
          isAnnulled: q.isAnnulled || q.is_annulled || false, // ✅ Ler do JSON
          isOutdated: false, // Sempre false - marcação manual
          status: 'Publicada',
        }));

        setQuestions(formattedQuestions);
        console.log(`✅ ${formattedQuestions.length} questões extraídas`);

        // ✅ Calcular metadados de comentários
        const metadata = calculateCommentMetadata(formattedQuestions);
        setDraftMetadata(metadata);
        console.log(`📝 Comentários: ${metadata.commentsGenerated}/${metadata.totalQuestions}`);

        // Calcular resumo da extração
        const extractedNumbers = formattedQuestions.map((q: any) => {
          const numeroStr = String(q.numero || '').replace(/\D/g, '');
          return numeroStr;
        }).filter((num: string) => num);

        const expectedTotal = 100; // Assumindo que esperamos 100 questões
        const allExpectedNumbers = Array.from({ length: expectedTotal }, (_, i) => (i + 1).toString());
        const missingNumbers = allExpectedNumbers.filter(num => !extractedNumbers.includes(num));

        const questionsWithFewAlternatives = formattedQuestions
          .filter((q: any) => q.alternativas && q.alternativas.length < 4)
          .map((q: any) => String(q.numero || '').replace(/\D/g, ''))
          .filter((num: string) => num);

        setExtractionSummary({
          total: expectedTotal,
          extracted: formattedQuestions.length,
          missing: missingNumbers,
          extractedNumbers: extractedNumbers,
          problematic: questionsWithFewAlternatives,
          successRate: ((formattedQuestions.length - questionsWithFewAlternatives.length) / expectedTotal) * 100,
        });

        // Auto-expandir primeiras questões
        setExpandedQuestions(new Set(formattedQuestions.slice(0, 3).map((_: any, idx: number) => idx)));
      } else {
        setError('Falha ao extrair questões do PPTX.');
      }
    } catch (err: any) {
      console.error('❌ Erro na extração PPTX:', err);
      setError(`Erro: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setPptxLoading(false);
    }
  };

  // ==================== FUNÇÕES DE EXTRAÇÃO SCRAPER ====================

  // Extração Manual via Scraper
  const handleExtractFromScraper = async () => {
    if (!scraperUrl || scraperUrl.trim() === '') {
      setError('Digite uma URL válida.');
      return;
    }

    setScraperExtracting(true);
    setError(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setExpandedQuestions(new Set());
    setScraperProgress({
      status: 'Iniciando...',
      currentQuestion: 0,
      totalQuestions: 0,
      message: 'Validando URL...',
      questionsExtracted: 0,
      questionsWithErrors: 0,
      questionsWithImages: 0,
      extractedQuestions: [],
    });

    try {
      console.log('🚀 Iniciando extração via scraper:', scraperUrl);

      // Usar extração com SSE para feedback em tempo real
      const result = await scraperService.extractFromUrlWithProgress(
        scraperUrl,
        {
          timeout: 300,
          downloadImages: true,
        },
        (progress) => {
          // Atualizar progresso em tempo real
          setScraperProgress(prev => {
            const newProgress = {
              status: progress.status || 'Extraindo...',
              currentQuestion: progress.currentQuestion || prev?.currentQuestion || 0,
              totalQuestions: progress.totalQuestions || prev?.totalQuestions || 0,
              message: progress.message || 'Processando...',
              questionsExtracted: progress.currentQuestion || prev?.questionsExtracted || 0,
              questionsWithErrors: prev?.questionsWithErrors || 0,
              questionsWithImages: prev?.questionsWithImages || 0,
              extractedQuestions: prev?.extractedQuestions || [],
            };

            // Se encontrou imagem em uma questão específica
            if (progress.status === 'image_found' && progress.questionWithImage) {
              const questionNumber = progress.questionWithImage;
              newProgress.questionsWithImages = (prev?.questionsWithImages || 0) + 1;
              newProgress.extractedQuestions = [
                ...(prev?.extractedQuestions || []),
                { numero: `Q${questionNumber}`, hasImage: true, hasError: false }
              ];
            }

            // Se o status é 'downloading_images', atualizar contador total
            if (progress.status === 'downloading_images') {
              if (progress.imagesCount !== undefined) {
                newProgress.questionsWithImages = progress.imagesCount;
              } else {
                const match = progress.message?.match(/(\d+) imagens/);
                if (match) {
                  newProgress.questionsWithImages = parseInt(match[1]);
                }
              }
            }

            return newProgress;
          });
        }
      );

      // Verificar se o resultado é válido
      if (!result) {
        throw new Error('Resultado da extração está vazio (null/undefined)');
      }

      // O resultado vem em result.questions
      const questions = result.questions;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error('Nenhuma questão foi extraída. Verifique se a URL está correta e se a página contém questões.');
      }

      const extractedCount = questions.length;

      // Contar questões com imagens e erros REAIS
      const questionsWithImages = questions.filter((q: any) => {
        const hasImage = q.imagem || (q.image_urls && q.image_urls.length > 0);
        console.log(`[Contador] Questão ${q.numero}: imagem=${q.imagem}, image_urls=${q.image_urls}, hasImage=${hasImage}`);
        return hasImage;
      }).length;

      const questionsWithErrors = questions.filter((q: any) =>
        !q.enunciado ||
        !q.alternativas ||
        q.alternativas.length < 2 ||
        q.correta === undefined
      ).length;

      console.log(`[Contador Final] Imagens: ${questionsWithImages}, Erros: ${questionsWithErrors}`);

      setScraperProgress(prev => ({
        status: 'Concluído',
        currentQuestion: extractedCount,
        totalQuestions: prev?.totalQuestions || extractedCount,
        message: `✅ ${extractedCount} questões extraídas com sucesso!`,
        questionsExtracted: extractedCount,
        questionsWithErrors: questionsWithErrors,
        questionsWithImages: questionsWithImages,
        extractedQuestions: prev?.extractedQuestions || [],
      }));

      if (questions && Array.isArray(questions)) {
        // 🎯 LIMITE DE TESTE: Apenas 20 questões para testes rápidos
        const limitedQuestions = questions.slice(0, 20);
        console.log(`⚠️ LIMITE DE TESTE ATIVO: ${limitedQuestions.length}/${questions.length} questões`);

        // Converter questões do scraper para formato BulkQuestion
        const formattedQuestions = limitedQuestions.map((q: any, index: number) => ({
          numero: q.numero || `Q${index + 1}`,
          enunciado: q.enunciado || '',
          alternativas: q.alternativas || [],
          correta: q.correta,
          dificuldade: q.dificuldade || 'Média',
          tags: [...(q.tags || []), 'scraper'],
          filterIds: q.filterIds || [],
          subFilterIds: q.subFilterIds || [],
          professorComment: q.professorComment || q.explicacao || '',
          imagem: q.imagem || undefined,
          tempId: `temp-scraper-${Date.now()}-${index}`,
          aiGenerated: false,
          isAnnulled: q.isAnnulled || q.is_annulled || false, // ✅ Ler do JSON
          isOutdated: false, // Sempre false - marcação manual
          status: 'Publicada',
        }));

        setQuestions(formattedQuestions);
        console.log(`✅ ${formattedQuestions.length} questões extraídas via scraper`);

        // ✅ Calcular metadados de comentários
        const metadata = calculateCommentMetadata(formattedQuestions);
        setDraftMetadata(metadata);
        console.log(`📝 Comentários: ${metadata.commentsGenerated}/${metadata.totalQuestions}`);

        // Calcular resumo da extração
        const extractedNumbers = formattedQuestions.map((q: any) => {
          const numeroStr = String(q.numero || '').replace(/\D/g, '');
          return numeroStr;
        }).filter((num: string) => num);

        setExtractionSummary({
          total: result.metadata.totalQuestions,
          extracted: result.stats.questionsExtracted,
          missing: [],
          extractedNumbers: extractedNumbers,
          problematic: formattedQuestions
            .filter((q: any) => !q.enunciado || !q.alternativas || q.alternativas.length < 2 || q.correta === undefined)
            .map((q: any) => {
              const reasons = [];
              if (!q.enunciado) reasons.push('sem enunciado');
              if (!q.alternativas || q.alternativas.length < 2) reasons.push('poucas alternativas');
              if (q.correta === undefined) reasons.push('sem gabarito');
              return {
                numero: String(q.numero || ''),
                reason: reasons.join(', ')
              };
            }),
          successRate: (result.stats.questionsWithAnswers / result.stats.questionsExtracted) * 100,
          mediaStats: {
            totalImages: result.stats.imagesFound,
          },
        });

        // Auto-expandir primeiras questões
        setExpandedQuestions(new Set(formattedQuestions.slice(0, 3).map((_: any, idx: number) => idx)));

        setScraperProgress(prev => ({
          status: 'Concluído',
          currentQuestion: formattedQuestions.length,
          totalQuestions: formattedQuestions.length,
          message: `${formattedQuestions.length} questões extraídas com sucesso!`,
          questionsExtracted: formattedQuestions.length,
          questionsWithErrors: prev?.questionsWithErrors || 0,
          questionsWithImages: prev?.questionsWithImages || 0,
          extractedQuestions: prev?.extractedQuestions || [],
        }));
      } else {
        setError('Falha ao extrair questões via scraper.');
      }
    } catch (err: any) {
      console.error('❌ Erro na extração via scraper:', err);

      let errorMessage = 'Erro desconhecido';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'TIMEOUT') {
        errorMessage = 'Tempo limite excedido. A página pode estar muito lenta ou inacessível.';
      } else if (err.code === 'NO_QUESTIONS_FOUND') {
        errorMessage = 'Nenhuma questão encontrada na página.';
      }

      setError(`❌ Erro na extração: ${errorMessage}`);
      setScraperProgress(prev => ({
        status: 'Erro',
        currentQuestion: prev?.currentQuestion || 0,
        totalQuestions: prev?.totalQuestions || 0,
        message: `❌ ${errorMessage}`,
        questionsExtracted: prev?.questionsExtracted || 0,
        questionsWithErrors: (prev?.questionsWithErrors || 0) + 1,
        questionsWithImages: prev?.questionsWithImages || 0,
        extractedQuestions: prev?.extractedQuestions || [],
      }));

      // Limpar progresso após 5 segundos
      setTimeout(() => setScraperProgress(null), 5000);
    } finally {
      setScraperExtracting(false);
    }
  };

  // Batch Processing via Scraper
  const handleSubmitBatch = async () => {
    setBatchProcessing(true);
    setError(null);

    try {
      let result: any;

      if (scraperSource === 'alternative') {
        // Alternative source (exam sources)
        if (selectedExamSources.length === 0) {
          setError('Selecione pelo menos uma prova.');
          setBatchProcessing(false);
          return;
        }

        console.log(`🚀 Iniciando batch processing de ${selectedExamSources.length} exam sources`);

        setBatchProgress({
          total: selectedExamSources.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        });

        // Call alternative endpoint
        const token = getAuthToken();
        const response = await fetch('/api/admin/scraper/extract-from-sources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourceValues: selectedExamSources,
            configs: batchConfigs,
            options: {
              delayBetweenUrls: 2000,
              maxRetries: 3,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        result = await response.json();
        if (!result.success) {
          throw new Error(result.error?.message || 'Erro ao criar job');
        }

        result = result.data;

      } else {
        // URL source (original)
        const urls = batchUrls
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        if (urls.length === 0) {
          setError('Digite pelo menos uma URL.');
          setBatchProcessing(false);
          return;
        }

        // Validar URLs
        const invalidUrls = urls.filter(url => {
          try {
            new URL(url);
            return false;
          } catch {
            return true;
          }
        });

        if (invalidUrls.length > 0) {
          setError(`URLs inválidas encontradas: ${invalidUrls.join(', ')}`);
          setBatchProcessing(false);
          return;
        }

        console.log(`🚀 Iniciando batch processing de ${urls.length} URLs`);

        setBatchProgress({
          total: urls.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        });

        // Create batch job first
        result = await scraperService.createBatchJob(urls, batchConfigs, {
          delayBetweenUrls: 2000,
          maxRetries: 3,
        });
      }

      setCurrentJobId(result.jobId);
      console.log(`✅ Job criado: ${result.jobId}`);

      // Progresso será monitorado via WebSocket automaticamente
      // O componente JobProgressDisplay já está conectado

    } catch (err: any) {
      console.error('❌ Erro ao criar batch job:', err);
      setError(`Erro: ${err.message || 'Erro desconhecido'}`);
      setBatchProcessing(false);
    }
  };

  // Função SSE removida - usando WebSocket agora via JobProgressDisplay

  // Get auth token helper
  const getAuthToken = (): string | null => {
    const supabaseKey = Object.keys(localStorage).find(
      key => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseKey) {
      const authData = localStorage.getItem(supabaseKey);
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.access_token;
      }
    }
    return null;
  };

  // EMERGENCY: Cancel ALL active jobs
  const handleCancelAllJobs = async () => {
    if (!window.confirm(`⚠️ ATENÇÃO: Isso vai cancelar TODOS os ${activeJobs.length} jobs ativos. Tem certeza?`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/scraper/jobs/cancel-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.data.cancelledCount} jobs cancelados com sucesso!`);
        // Refresh active jobs list
        const jobsResult = await scraperService.listJobs({
          status: 'processing',
          limit: 100
        });
        const processingJobs = jobsResult.jobs.filter((j: any) =>
          j.status === 'processing' || j.status === 'pending'
        );
        setActiveJobs(processingJobs);
        setBatchProcessing(false);
        setCurrentJobId(null);
      } else {
        toast.error(`Erro ao cancelar jobs: ${JSON.stringify(result.error)}`);
      }
    } catch (error) {
      console.error('Error cancelling jobs:', error);
      toast.error(`Erro ao cancelar jobs: ${error}`);
    }
  };

  // Cancelar batch job
  const handleCancelBatch = async () => {
    if (!currentJobId) return;

    if (!window.confirm('Tem certeza que deseja cancelar o processamento em lote?')) {
      return;
    }

    try {
      await scraperService.cancelJob(currentJobId);
      setBatchProcessing(false);
      setCurrentJobId(null);
      toast.success('Job cancelado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao cancelar job:', err);
      setError(`Erro ao cancelar: ${err.message}`);
    }
  };

  // Exportar questões faltantes do batch
  const handleExportMissingQuestions = () => {
    const missingData = batchResults
      .filter(r => r.missingQuestions && r.missingQuestions.length > 0)
      .map(r => ({
        url: r.url,
        missing: r.missingQuestions,
      }));

    if (missingData.length === 0) {
      toast.info('Nenhuma questão faltante para exportar.');
      return;
    }

    // Gerar CSV
    let csv = 'URL,Questões Faltantes\n';
    missingData.forEach(item => {
      csv += `"${item.url}","${item.missing.join(', ')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questoes-faltantes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`CSV exportado com questões faltantes de ${missingData.length} URLs!`);
  };

  // ==================== FUNÇÕES DE EXPORT/IMPORT ====================

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
      a.download = `questoes-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup salvo com ${questions.length} questões!`);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      setError('Erro ao exportar backup.');
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
            `⚠️ Isso substituirá todas as questões atuais!`
          );

          if (confirmImport) {
            setQuestions(importedData.questions);
            setExtractionSummary(importedData.extractionSummary || null);
            setSelectedQuestions(new Set());
            setExpandedQuestions(new Set());
            toast.success(`${importedData.questions.length} questões importadas!`);
          }
        } else {
          throw new Error('Formato inválido.');
        }
      } catch (error) {
        console.error('❌ Erro ao importar:', error);
        setError('Erro ao importar questões.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ==================== HANDLERS DE SELEÇÃO ====================

  const handleSelectQuestion = (index: number) => {
    setSelectedQuestions((prev) => {
      const newSelected = new Set(prev);
      newSelected.has(index) ? newSelected.delete(index) : newSelected.add(index);
      return newSelected;
    });
  };

  const handleSelectAllQuestions = () => {
    setSelectedQuestions(prev =>
      prev.size === questions.length ? new Set() : new Set(questions.map((_, index) => index))
    );
  };

  const handleToggleExpandQuestion = (index: number, event?: React.MouseEvent) => {
    // Prevenir comportamento padrão
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Desabilitar scroll restoration do navegador temporariamente
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Salvar posição atual do scroll
    const scrollPosition = window.scrollY;

    setExpandedQuestions((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.has(index) ? newExpanded.delete(index) : newExpanded.add(index);
      return newExpanded;
    });

    // Forçar manutenção da posição em múltiplos momentos
    const maintainPosition = () => {
      window.scrollTo({ top: scrollPosition, left: 0, behavior: 'instant' });
    };

    maintainPosition();
    requestAnimationFrame(maintainPosition);
    setTimeout(maintainPosition, 0);
    setTimeout(maintainPosition, 10);
    setTimeout(maintainPosition, 50);
    setTimeout(maintainPosition, 100);

    // Reabilitar scroll restoration após 200ms
    setTimeout(() => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    }, 200);
  };

  // ==================== SISTEMA DE GABARITO ====================

  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [processingGabarito, setProcessingGabarito] = useState(false);

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

    if (questions.length === 0) {
      setError('Extraia questões do PPTX primeiro antes de aplicar o gabarito.');
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

      // Aplicar gabarito às questões
      let questoesAtualizadas = 0;
      let questoesNaoEncontradas: string[] = [];
      let questoesSemResposta: string[] = [];

      const questoesAtualizadasTemp = questions.map(q => {
        const numeroQuestao = String(q.numero || '').replace(/\D/g, '');
        const respostaCorreta = respostas[numeroQuestao];

        if (respostaCorreta) {
          console.log(`📋 Aplicando gabarito questão ${numeroQuestao}: ${respostaCorreta}`);

          // Mapear letra para índice (A=0, B=1, C=2, D=3, E=4, F=5)
          const letraParaIndice: { [key: string]: number } = {
            'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5
          };

          const indiceCorreto = letraParaIndice[respostaCorreta];

          if (indiceCorreto !== undefined && indiceCorreto < q.alternativas.length) {
            console.log(`✅ Questão ${numeroQuestao}: definindo alternativa ${indiceCorreto} (${respostaCorreta}) como correta`);
            questoesAtualizadas++;
            return { ...q, correta: indiceCorreto };
          } else {
            console.warn(`⚠️ Questão ${numeroQuestao}: índice inválido para resposta ${respostaCorreta}`);
            questoesNaoEncontradas.push(`Q${numeroQuestao} (${respostaCorreta} - índice inválido)`);
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

      console.log(`✅ Gabarito aplicado! Relatório:\n${relatorio}`);
      toast.success(relatorio);

    } catch (err: any) {
      console.error('❌ Erro ao processar gabarito:', err);
      setError(`Erro ao processar gabarito: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setProcessingGabarito(false);
    }
  };

  // ==================== CATEGORIZAÇÃO IA ====================

  // Função utilitária para converter BulkQuestion para ExtractedQuestion
  const bulkToExtracted = (q: BulkQuestion): any => ({
    question: q.enunciado,
    alternatives: q.alternativas,
    correctAnswer: typeof q.correta === 'number' && q.alternativas[q.correta] ? q.alternativas[q.correta] : '',
    explanation: q.professorComment || '',
    specialty: q.tags && q.tags[0] ? q.tags[0] : '',
    difficulty: (q.dificuldade as any) || 'intermediária',
    topics: q.tags || [],
    references: [],
    estimatedTime: 0,
    bloomLevel: 'compreensão',
    tempId: q.tempId,
    originalId: q.tempId
  });

  // 🚀 Categorização Inteligente OTIMIZADA - Lotes de 3 questões
  const handleSmartCategorize = async () => {
    if (!questions.length) {
      setError('Nenhuma questão disponível para categorizar');
      return;
    }

    setCategorizationLoading(true);
    setError(null);

    try {
      // 🔄 Garantir que os filtros estão carregados
      let currentFilters = filters;

      // 🎯 VERIFICAR CACHE PRIMEIRO
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

        // Aguardar React atualizar o estado
        await new Promise(resolve => setTimeout(resolve, 100));

        // Usar filtros do cache direto
        if (filtersCache && filtersCache.data.length > 0) {
          currentFilters = filtersCache.data;
          console.log(`✅ Usando filtros do cache: ${currentFilters.length} filtros`);
        } else {
          currentFilters = filters;
        }
      }

      if (!currentFilters.length) {
        throw new Error('Deve fornecer filtros disponíveis do banco de dados');
      }

      console.log(`✅ FILTROS PRONTOS: ${currentFilters.length} filtros carregados`);
      console.log(`🧠 Iniciando categorização de ${questions.length} questões em lotes de 5...`);

      // 📦 Dividir em lotes de 5 questões (otimizado para Qwen3 com YaRN)
      const OPTIMAL_BATCH_SIZE = 5;
      const batches = [];

      for (let i = 0; i < questions.length; i += OPTIMAL_BATCH_SIZE) {
        batches.push(questions.slice(i, i + OPTIMAL_BATCH_SIZE));
      }

      console.log(`📊 Processando ${batches.length} lotes de até ${OPTIMAL_BATCH_SIZE} questões`);

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
          totalQuestions: questions.length,
          processedQuestions: batchIndex * batch.length,
          successCount: 0,
          failureCount: 0,
          ambiguousCount: 0,
          currentBatch: batchNumber,
          totalBatches: batches.length,
          estimatedTimeRemaining: 0,
          percentage: progressPercent,
        });

        const batchStartTime = Date.now();

        try {
          // DEBUG: Log batch being sent
          console.log(`📤 Sending batch to backend:`, {
            batchSize: batch.length,
            firstQuestion: {
              id: batch[0].tempId || batch[0].numero,
              tempId: batch[0].tempId,
              numero: batch[0].numero,
              enunciado: batch[0].enunciado?.substring(0, 50),
              alternativas: batch[0].alternativas?.length,
            }
          });

          // 🚀 Usar novo serviço de categorização com Gemini
          const jobResult = await categorizationService.startCategorization(batch, {
            batchSize: batch.length,
            includeExplanations: true,
            confidenceThreshold: 60,
          });

          console.log(`📋 Job iniciado: ${jobResult.jobId}`);

          // Aguardar resultados via WebSocket
          const results = await new Promise<CategorizationResult[]>((resolve, reject) => {
            // Criar conexão WebSocket temporária para este job
            const { io } = require('socket.io-client');
            const isDev = process.env.NODE_ENV === 'development';
            const backendUrl = isDev 
              ? 'http://localhost:5000' 
              : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://medbraveapp-production.up.railway.app');
            const socket = io(backendUrl, {
              path: '/socket.io/jobs',
              transports: ['websocket', 'polling'],
            });

            socket.on('connect', () => {
              console.log('🔌 WebSocket conectado para categorização');
              socket.emit('subscribe:job', jobResult.jobId);
            });

            socket.on('job:progress', (event: any) => {
              console.log(`📊 Progresso: ${event.message}`);
              if (event.progress) {
                setCategorizationProgress(prev => ({
                  ...prev!,
                  processedQuestions: event.progress.current,
                  percentage: event.progress.percentage,
                }));
              }
            });

            socket.on('job:complete', () => {
              console.log('✅ Categorização completa');
              socket.disconnect();
              // Buscar resultados do backend
              fetch(`${backendUrl}/api/categorization/results/${jobResult.jobId}`)
                .then(res => res.json())
                .then(data => resolve(data.results))
                .catch(reject);
            });

            socket.on('job:error', (event: any) => {
              console.error('❌ Erro na categorização:', event.message);
              socket.disconnect();
              reject(new Error(event.message));
            });

            // Timeout de 5 minutos
            setTimeout(() => {
              socket.disconnect();
              reject(new Error('Timeout: categorização demorou mais de 5 minutos'));
            }, 5 * 60 * 1000);
          });

          const batchDuration = Date.now() - batchStartTime;
          console.log(`⏱️ Lote ${batchNumber} processado em ${(batchDuration / 1000).toFixed(1)}s`);

          // Aplicar categorizações do lote
          results.forEach((categorized) => {
            const questionIndex = updatedQuestions.findIndex(
              q => q.tempId === categorized.questionId || q.numero === categorized.questionId
            );
            if (questionIndex !== -1) {
              updatedQuestions[questionIndex] = {
                ...updatedQuestions[questionIndex],
                filterIds: categorized.suggestedFilters?.map((f) => f.filterId) || [],
                subFilterIds: categorized.suggestedSubfilters?.map((sf) => sf.subfilterId) || [],
                tags: [...(updatedQuestions[questionIndex].tags || []), 'ai-categorized'],
              };
              totalCategorized++;
            }
          });

          console.log(`✅ Lote ${batchNumber} processado com sucesso`);

        } catch (batchError) {
          console.error(`❌ Erro no lote ${batchNumber}:`, batchError);
        }

        // ⏱️ Delay entre lotes
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 🎯 Atualizar estado final
      setQuestions(updatedQuestions);

      console.log(`🎉 Categorização concluída: ${totalCategorized}/${questions.length} questões`);
      toast.success(`Categorização concluída!\n\n${totalCategorized} de ${questions.length} questões foram categorizadas com sucesso.`);

    } catch (error) {
      console.error('❌ Erro na categorização:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido na categorização');
    } finally {
      setCategorizationLoading(false);
      setCategorizationProgress(null);
    }
  };

  // ==================== VALIDAÇÃO ROBUSTA ====================

  interface ValidationError {
    questionIndex: number;
    questionNumber: string;
    errors: string[];
  }

  const validateQuestions = (): { isValid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];

    questions.forEach((q, index) => {
      const questionErrors: string[] = [];

      // Validar enunciado
      if (!q.enunciado || q.enunciado === '<p></p>' || q.enunciado.trim() === '') {
        questionErrors.push('Enunciado vazio');
      }

      // Validar alternativas
      if (!q.alternativas || q.alternativas.length < 2) {
        questionErrors.push('Mínimo 2 alternativas');
      } else if (q.alternativas.length > 6) {
        questionErrors.push('Máximo 6 alternativas');
      }

      // Validar alternativas vazias
      if (q.alternativas && q.alternativas.some(alt => !alt || alt.trim() === '')) {
        questionErrors.push('Alternativa vazia detectada');
      }

      // Validar resposta correta (permitir undefined se questão for anulada)
      const isAnnulled = (q as any).isAnnulled || (q as any).is_annulled || false;
      if (q.correta === undefined && !isAnnulled) {
        questionErrors.push('Resposta correta não definida (marque como anulada se não houver gabarito)');
      } else if (typeof q.correta === 'number' && (q.correta < 0 || q.correta >= q.alternativas.length)) {
        questionErrors.push('Índice de resposta correta inválido');
      }

      if (questionErrors.length > 0) {
        errors.push({
          questionIndex: index,
          questionNumber: q.numero,
          errors: questionErrors
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // ==================== FUNÇÕES DE PROCESSAMENTO DE IMAGENS R2 ====================

  // Mensagens de erro específicas
  const ERROR_MESSAGES = {
    CIRCUIT_BREAKER: 'Sistema de upload temporariamente indisponível. Aguarde e tente novamente.',
    INVALID_DATA_URI: 'Imagem inválida detectada. Verifique o formato da imagem.',
    UPLOAD_FAILED: 'Falha no upload da imagem após múltiplas tentativas.',
    NO_AUTH: 'Autenticação necessária para fazer upload de imagens.',
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
    QUESTION_PROCESSING_FAILED: (numero: string) =>
      `Falha ao processar imagens da questão ${numero}. Verifique as imagens e tente novamente.`,
  };

  /**
   * Processa todas as imagens das questões para R2 antes de salvar
   * @param questions - Array de questões com possíveis data URIs
   * @returns Array de questões com URLs do R2
   */
  const processImagesBeforeSave = async (
    questions: BulkQuestion[]
  ): Promise<BulkQuestion[]> => {
    // Verificar circuit breaker antes de começar
    try {
      r2ImageUploadService.checkCircuitBreaker();
    } catch (error: any) {
      throw new Error(ERROR_MESSAGES.CIRCUIT_BREAKER);
    }

    const processedQuestions: BulkQuestion[] = [];
    let totalImages = 0;
    let processedImages = 0;

    // Gerar nome da pasta baseado na prova
    let examFolder = 'questions/images';
    if (saveAsOfficialExam && officialExamData.examName && officialExamData.examYear) {
      // Normalizar nome: remover caracteres especiais, converter para lowercase, substituir espaços por hífens
      const normalizedName = officialExamData.examName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens duplicados
        .trim();

      examFolder = `questions/${normalizedName}-${officialExamData.examYear}`;
      console.log(`📁 Pasta da prova: ${examFolder}`);
    }

    // Contar total de imagens
    for (const q of questions) {
      if (q.enunciado && q.enunciado.includes('data:image/')) {
        const matches = q.enunciado.match(/data:image\/[^"]+/g);
        totalImages += matches?.length || 0;
      }
      if (q.imagem && q.imagem.startsWith('data:image/')) {
        totalImages++;
      }
    }

    console.log(`🖼️ Total de imagens a processar: ${totalImages}`);

    // Processar cada questão
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let processedQuestion = { ...q };

      try {
        // Processar imagens no enunciado (HTML)
        if (q.enunciado && q.enunciado.includes('data:image/')) {
          console.log(`📝 Processando imagens no enunciado da questão ${q.numero}...`);

          const result = await r2ImageUploadService.processQuestionHTML(
            q.enunciado,
            (q.numero || null) as any,
            examFolder as any
          );

          processedQuestion.enunciado = result.html;
          processedImages += result.totalProcessed || 0;

          console.log(`✅ Q${q.numero}: ${result.totalProcessed || 0}/${result.totalFound || 0} imagens processadas no enunciado`);

          // Atualizar progresso
          setImageProcessingProgress({
            current: processedImages,
            total: totalImages,
            currentQuestion: i + 1,
            totalQuestions: questions.length,
          });
        }

        // Processar imagem standalone
        if (q.imagem && q.imagem.startsWith('data:image/')) {
          console.log(`🖼️ Processando imagem standalone da questão ${q.numero}...`);

          // Gerar nome do arquivo: q01, q02, etc.
          const questionNumberPadded = q.numero.toString().padStart(2, '0');
          const customFilename = `q${questionNumberPadded}`;

          const uploadResult = await r2ImageUploadService.uploadImageToR2(
            q.imagem,
            {
              questionNumber: q.numero,
              source: 'question_field',
              customFolder: examFolder,
              customFilename: customFilename,
            }
          );

          processedQuestion.imagem = uploadResult.url;
          processedImages++;

          console.log(`✅ Q${q.numero}: Imagem standalone processada como ${customFilename}`);

          setImageProcessingProgress({
            current: processedImages,
            total: totalImages,
            currentQuestion: i + 1,
            totalQuestions: questions.length,
          });
        }

        processedQuestions.push(processedQuestion);
      } catch (error: any) {
        console.error(`❌ Erro ao processar imagens da questão ${q.numero}:`, error);
        throw new Error(
          `Falha ao processar imagens da questão ${q.numero}: ${error.message}`
        );
      }
    }

    console.log(`✅ Processamento concluído: ${processedImages}/${totalImages} imagens enviadas para R2`);
    return processedQuestions;
  };

  // ==================== FUNÇÕES DE SALVAMENTO ====================

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSavePreview, setShowSavePreview] = useState(false);

  // Validação do formulário de prova oficial
  const validateOfficialExamForm = (): string[] => {
    const errors: string[] = [];

    if (!officialExamData.title || officialExamData.title.trim().length < 3) {
      errors.push('Título da prova deve ter no mínimo 3 caracteres');
    }

    if (!officialExamData.universityId || officialExamData.universityId.trim().length < 2) {
      errors.push('Instituição é obrigatória');
    }

    if (!officialExamData.examTypeFilterId || officialExamData.examTypeFilterId.trim().length < 2) {
      errors.push('Tipo de prova é obrigatório');
    }

    return errors;
  };

  // Função de Salvar questões no banco
  const handleSaveChanges = async () => {
    if (questions.length === 0) {
      setError('Nenhuma questão para salvar.');
      return;
    }

    // Validação robusta
    const validation = validateQuestions();

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowValidationModal(true);
      setError(`${validation.errors.length} questões com problemas. Clique para ver detalhes.`);
      return;
    }

    // Validar formulário de prova oficial se estiver ativado
    if (saveAsOfficialExam) {
      const officialExamErrors = validateOfficialExamForm();
      if (officialExamErrors.length > 0) {
        setError(`Erros no formulário de prova oficial:\n${officialExamErrors.join('\n')}`);
        return;
      }
    }

    setValidationErrors([]);
    setShowValidationModal(false);

    // Mostrar preview antes de salvar
    setShowSavePreview(true);
  };

  const confirmAndSave = async () => {
    setShowSavePreview(false);
    setSaving(true);
    setError(null);
    setImageProcessingProgress(null);

    try {
      console.log(`💾 Salvando ${questions.length} questões...`);

      // NOVO: Processar imagens antes de salvar
      let questionsToSave = questions;

      // Verificar se há imagens para processar
      const hasImages = questions.some(q =>
        (q.enunciado && q.enunciado.includes('data:image/')) ||
        (q.imagem && q.imagem.startsWith('data:image/'))
      );

      if (hasImages) {
        console.log('🖼️ Processando imagens para R2...');
        try {
          questionsToSave = await processImagesBeforeSave(questions);
          console.log('✅ Imagens processadas com sucesso!');
        } catch (imageError: any) {
          console.error('❌ Erro ao processar imagens:', imageError);
          setError(`Falha ao processar imagens: ${imageError.message}`);
          setSaving(false);
          setImageProcessingProgress(null);
          return;
        }
      } else {
        console.log('ℹ️ Nenhuma imagem para processar');
      }

      // Limpar progresso de imagens
      setImageProcessingProgress(null);

      // Mapear status de português para inglês
      const mapStatusToEnglish = (status: string): string => {
        const statusMap: Record<string, string> = {
          'Publicada': 'PUBLISHED',
          'Rascunho': 'DRAFT',
          'Arquivada': 'ARCHIVED',
        };
        return statusMap[status] || 'PUBLISHED';
      };

      // Preparar questões para o backend
      const questionsForBackend = questionsToSave.map((q) => ({
        statement: q.enunciado,
        alternatives: q.alternativas.map((alt, idx) => ({
          text: alt,
          isCorrect: Array.isArray(q.correta) ? q.correta.includes(idx) : q.correta === idx,
          explanation: '',
          order: idx
        })),
        difficulty: q.dificuldade || 'MEDIUM',
        status: mapStatusToEnglish(q.status || 'Publicada'),
        tags: q.tags || [],
        filterIds: q.filterIds || [],
        subFilterIds: q.subFilterIds || [],
        professorComment: q.professorComment || '',
        isAnnulled: q.isAnnulled || false,
        isOutdated: q.isOutdated || false,
      }));

      let response;
      let result;

      // Obter token de autenticação
      let token = '';
      const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (supabaseKey) {
        const authData = localStorage.getItem(supabaseKey);
        if (authData) {
          const parsed = JSON.parse(authData);
          token = parsed.access_token;
        }
      }

      // Se salvar como prova oficial, usar endpoint específico
      if (saveAsOfficialExam) {
        console.log('📋 Salvando como prova oficial...');

        const payload = {
          questions: questionsForBackend,
          officialExam: {
            title: officialExamData.title,
            universityId: officialExamData.universityId || undefined,
            examTypeFilterId: officialExamData.examTypeFilterId || undefined,
            tags: officialExamData.tags || [],
            // Campos adicionais
            isPublished: officialExamData.isPublished,
            examType: officialExamData.examType || undefined,
            examYear: officialExamData.examYear || undefined,
            examName: officialExamData.examName || officialExamData.title,
            description: officialExamData.description || undefined,
            instructions: officialExamData.instructions || undefined,
            timeLimitMinutes: officialExamData.timeLimitMinutes || 240,
          },
        };

        response = await fetch('/api/official-exams/bulk-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          result = await response.json();
          const successCount = result.data.questions.length;
          const examTitle = result.data.officialExam.title;
          toast.success(`${successCount} questões salvas com sucesso!\n📋 Prova oficial "${examTitle}" criada!`);
        }
      } else {
        // Salvar apenas questões
        response = await fetch('/api/questions/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ questions: questionsForBackend }),
        });

        if (response.ok) {
          result = await response.json();
          const successCount = result.created || questions.length;
          toast.success(`${successCount} questões salvas com sucesso!`);
        }
      }

      if (response && response.ok) {
        // ✅ NÃO deletar draft automaticamente - usuário pode querer manter
        // O draft expira automaticamente após 30 dias
        if (draftId) {
          console.log(`ℹ️ Draft ${draftId} mantido (expira automaticamente em 30 dias)`);
          // Se quiser deletar manualmente, use o botão "Deletar" no DraftsManager
        }

        // Limpar questões após salvar
        setQuestions([]);
        setSelectedQuestions(new Set());
        setExpandedQuestions(new Set());
        setExtractionSummary(null);
        setPptxFile(null);
        setGabaritoFile(null);
        setSaveAsOfficialExam(false);
        setOfficialExamData({
          title: '',
          universityId: '',
          examTypeFilterId: '',
          tags: [],
          isPublished: false,
          examType: '',
          examYear: undefined,
          examName: '',
          description: '',
          instructions: '',
          timeLimitMinutes: 240,
        });
        setDraftId(null);
        setDraftMetadata(null); // ✅ Limpar metadados do draft

        console.log(`✅ Salvamento concluído`);
      } else {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('❌ Erro ao salvar:', err);
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
      setImageProcessingProgress(null);
    }
  };

  // ==================== HANDLERS DE QUESTÕES ====================

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

  const handleCorrectAlternativeChange = (qIndex: number, aIndex: number) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[qIndex]) {
        newQuestions[qIndex] = { ...newQuestions[qIndex], correta: aIndex };
      }
      return newQuestions;
    });
  };

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

  const handleRemoveAlternative = (qIndex: number, aIndex: number) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      const alternativas = newQuestions[qIndex].alternativas || [];
      if (alternativas.length > 2) {
        const newAlternatives = alternativas.filter((_, i) => i !== aIndex);
        let novaCorreta = newQuestions[qIndex].correta;
        if (novaCorreta === aIndex) novaCorreta = undefined;
        else if (typeof novaCorreta === 'number' && novaCorreta > aIndex) novaCorreta--;
        newQuestions[qIndex] = { ...newQuestions[qIndex], alternativas: newAlternatives, correta: novaCorreta };
      }
      return newQuestions;
    });
  };

  const handleRemoveSelectedQuestions = () => {
    if (selectedQuestions.size === 0) return;
    if (window.confirm(`Tem certeza que deseja remover ${selectedQuestions.size} questão(ões) selecionada(s)?`)) {
      setQuestions((prev) => prev.filter((_, index) => !selectedQuestions.has(index)));
      setSelectedQuestions(new Set());
      setExpandedQuestions(new Set());
    }
  };

  const handleExpandAll = () => {
    setExpandedQuestions(new Set(questions.map((_, index) => index)));
  };

  const handleCollapseAll = () => {
    setExpandedQuestions(new Set());
  };

  // ==================== NOVA CATEGORIZAÇÃO COM IA ====================

  const handleCategorizationStart = async () => {
    try {
      setError(null);
      setShowCategorizationProgress(true);
      setCategorizationLoading(true);

      // Get question IDs to categorize
      const questionsToProcess = selectedQuestions.size > 0
        ? questions.filter((_, idx) => selectedQuestions.has(idx))
        : questions.filter(q => !q.filterIds || q.filterIds.length === 0);

      if (questionsToProcess.length === 0) {
        setError('Nenhuma questão para categorizar');
        setShowCategorizationProgress(false);
        setCategorizationLoading(false);
        return;
      }

      console.log('📤 Enviando questões para categorização:', questionsToProcess.map(q => ({
        tempId: q.tempId,
        numero: q.numero,
        enunciado: q.enunciado?.substring(0, 50)
      })));

      // Verificar se todas têm tempId
      const semTempId = questionsToProcess.filter(q => !q.tempId);
      if (semTempId.length > 0) {
        console.error('❌ Questões sem tempId:', semTempId.map(q => q.numero));
        setError(`${semTempId.length} questões não têm tempId. Recarregue a página.`);
        setShowCategorizationProgress(false);
        setCategorizationLoading(false);
        return;
      }

      // Start categorization job with full questions (not just IDs)
      const result = await categorizationService.startCategorization(questionsToProcess, {
        batchSize: 5, // Process 5 questions at a time (optimized for Qwen3 with YaRN)
        includeExplanations: true,
        confidenceThreshold: 60,
      });

      setCategorizationJobId(result.jobId);
      // Progresso será monitorado via WebSocket usando useJobProgress hook
    } catch (error) {
      console.error('Error starting categorization:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setShowCategorizationProgress(false);
      setCategorizationLoading(false);
    }
  };

  const handleCategorizationComplete = (results: CategorizationResult[]) => {
    setCategorizationResults(results);
    setShowCategorizationResults(true);
  };

  const handleAcceptCategorization = async (result: CategorizationResult) => {
    try {
      // Validate before sending
      if (!result.questionId) {
        throw new Error('questionId is missing from result');
      }

      if (!result.suggestedFilters && !result.suggestedSubfilters) {
        throw new Error('No filters or subfilters in result');
      }

      console.log('📤 Sending categorization:', {
        questionId: result.questionId,
        filtersCount: result.suggestedFilters?.length || 0,
        subfiltersCount: result.suggestedSubfilters?.length || 0,
      });

      // Find the question in local state (can match by id, tempId, or numero)
      const question = questions.find(q => {
        const qId = q.tempId || q.numero;
        return qId === result.questionId || q.numero === result.questionId || q.numero === result.questionNumber;
      });

      if (!question) {
        console.error('❌ Question not found. Looking for:', result.questionId, 'or', result.questionNumber);
        console.error('Available questions:', questions.map(q => ({ id: q.tempId || q.numero, tempId: q.tempId, numero: q.numero })));
        throw new Error(`Question not found with ID: ${result.questionId} or number: ${result.questionNumber}`);
      }

      console.log('✅ Found question:', { id: question.tempId || question.numero, tempId: question.tempId, numero: question.numero });

      // Update filterNames Map with names from categorization result
      setFilterNames(prev => {
        const updated = new Map(prev);
        result.suggestedFilters.forEach(f => {
          if (f.filterId && f.filterName) {
            updated.set(f.filterId, f.filterName);
          }
        });
        result.suggestedSubfilters.forEach(sf => {
          if (sf.subfilterId && sf.subfilterName) {
            updated.set(sf.subfilterId, sf.subfilterName);
          }
        });
        return updated;
      });

      // For draft questions (no id), just update local state
      // For saved questions (has id), call API to persist
      if (question.id) {
        // Question is saved in database, apply via API
        await categorizationService.applyCategorization(question.id, result);
      } else {
        // Question is draft, just update local state
        console.log('📝 Question is draft, updating local state only');
      }

      // Update local question state (match by id, tempId, or numero)
      setQuestions(prev => prev.map(q => {
        const qId = q.id || q.tempId || q.numero;
        const matches = qId === result.questionId || q.numero === result.questionId || q.numero === result.questionNumber;

        if (matches) {
          return {
            ...q,
            filterIds: result.suggestedFilters.map(f => f.filterId),
            subFilterIds: result.suggestedSubfilters.map(sf => sf.subfilterId),
          };
        }
        return q;
      }));

      // Remove from results
      setCategorizationResults(prev => prev.filter(r => r.questionId !== result.questionId));

      toast.success('Categorização aplicada com sucesso!');
    } catch (error) {
      console.error('❌ Error accepting categorization:', error);
      setError(error instanceof Error ? error.message : 'Erro ao aplicar categorização');
    }
  };

  const handleRejectCategorization = async (result: CategorizationResult) => {
    // Just remove from results
    setCategorizationResults(prev => prev.filter(r => r.questionId !== result.questionId));
  };

  const handleModifyCategorization = (result: CategorizationResult) => {
    // TODO: Open filter panel to manually select filters
    toast.info('Funcionalidade de modificação manual em desenvolvimento');
  };

  const handleCancelCategorization = () => {
    setShowCategorizationProgress(false);
    setCategorizationJobId(null);
    setCategorizationLoading(false);
  };

  const handleCloseCategorizationResults = () => {
    setShowCategorizationResults(false);
    setCategorizationResults([]);
  };

  // ==================== FILTROS MANUAIS ====================

  const handleAddFilterToSelected = (filterId: string, filterName: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (selectedQuestions.has(idx)) {
        const currentFilterIds = q.filterIds || [];
        if (!currentFilterIds.includes(filterId)) {
          return { ...q, filterIds: [...currentFilterIds, filterId] };
        }
      }
      return q;
    }));

    // Atualizar mapa de nomes
    setFilterNames(prev => new Map(prev).set(filterId, filterName));
  };

  const handleRemoveFilterFromSelected = (filterId: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (selectedQuestions.has(idx)) {
        return { ...q, filterIds: (q.filterIds || []).filter(id => id !== filterId) };
      }
      return q;
    }));
  };

  const handleAddSubFilterToSelected = (subFilterId: string, subFilterName: string, parentPath: string[]) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (selectedQuestions.has(idx)) {
        const currentSubFilterIds = q.subFilterIds || [];
        if (!currentSubFilterIds.includes(subFilterId)) {
          return { ...q, subFilterIds: [...currentSubFilterIds, subFilterId] };
        }
      }
      return q;
    }));

    // Atualizar mapa de nomes
    setFilterNames(prev => new Map(prev).set(subFilterId, subFilterName));
  };

  const handleRemoveSubFilterFromSelected = (subFilterId: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (selectedQuestions.has(idx)) {
        return { ...q, subFilterIds: (q.subFilterIds || []).filter(id => id !== subFilterId) };
      }
      return q;
    }));
  };

  const handleRemoveFilterFromQuestion = (questionIdx: number, filterId: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === questionIdx) {
        return { ...q, filterIds: (q.filterIds || []).filter(id => id !== filterId) };
      }
      return q;
    }));
  };

  const handleRemoveSubFilterFromQuestion = (questionIdx: number, subFilterId: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === questionIdx) {
        return { ...q, subFilterIds: (q.subFilterIds || []).filter(id => id !== subFilterId) };
      }
      return q;
    }));
  };

  // ✅ Funções para marcar questões como anuladas/desatualizadas
  const toggleAnulada = (questionIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === questionIdx) {
        return { ...q, isAnnulled: !q.isAnnulled };
      }
      return q;
    }));
  };

  const toggleDesatualizada = (questionIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === questionIdx) {
        return { ...q, isOutdated: !q.isOutdated };
      }
      return q;
    }));
  };

  // ==================== EDIÇÃO EM LOTE ====================

  const handleBulkEdit = (field: keyof BulkQuestion, value: any) => {
    setQuestions(prev => prev.map((q, idx) =>
      selectedQuestions.has(idx) ? { ...q, [field]: value } : q
    ));
    // Feedback visual
    alert(`✅ ${selectedQuestions.size} questões atualizadas!`);
  };

  // ==================== DEBOUNCE HOOK ====================

  const useDebouncedCallback = <T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ) => {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const callbackRef = useRef(callback);

    useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }, [delay]);
  };

  // ==================== HANDLERS MEMOIZADOS ====================

  const memoizedHandleQuestionChange = useCallback((index: number, field: keyof BulkQuestion, value: any) => {
    handleQuestionChange(index, field, value);
  }, []);

  // Debounced para edições de texto (300ms)
  const debouncedAlternativeChange = useDebouncedCallback((qIndex: number, aIndex: number, value: string) => {
    handleAlternativeChange(qIndex, aIndex, value);
  }, 300);

  const memoizedHandleAlternativeChange = useCallback((qIndex: number, aIndex: number, value: string) => {
    debouncedAlternativeChange(qIndex, aIndex, value);
  }, [debouncedAlternativeChange]);

  const memoizedHandleCorrectAlternativeChange = useCallback((qIndex: number, aIndex: number) => {
    handleCorrectAlternativeChange(qIndex, aIndex);
  }, []);

  const memoizedHandleAddAlternative = useCallback((qIndex: number) => {
    handleAddAlternative(qIndex);
  }, []);

  const memoizedHandleRemoveAlternative = useCallback((qIndex: number, aIndex: number) => {
    handleRemoveAlternative(qIndex, aIndex);
  }, []);

  const memoizedHandleSelectQuestion = useCallback((index: number) => {
    handleSelectQuestion(index);
  }, []);

  const memoizedHandleToggleExpandQuestion = useCallback((index: number, event?: React.MouseEvent) => {
    setExpandedQuestions((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  // ==================== COMPONENTES AUXILIARES ====================

  // Componente de Estatísticas de Extração
  const ExtractionStats: React.FC<{ summary: typeof extractionSummary }> = ({ summary }) => {
    if (!summary) return null;

    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark mb-8">
        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">analytics</span>
          📊 Resumo da Extração
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.extracted}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Extraídas</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{Math.round(summary.successRate)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Taxa de Sucesso</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.problematic.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Problemáticas</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.missing.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Faltando</div>
          </div>
        </div>

        {summary.problematic.length > 0 && (
          <details className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <summary className="cursor-pointer text-sm font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              Ver questões problemáticas ({summary.problematic.length})
            </summary>
            <div className="mt-3 space-y-2">
              {summary.problematic.map(item => (
                <div key={item.numero} className="flex items-start gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-800 rounded">
                  <span className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">
                    Q{item.numero}:
                  </span>
                  <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {summary.missing.length > 0 && summary.missing.length <= 20 && (
          <details className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              Ver questões não extraídas ({summary.missing.length})
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.missing.slice(0, 50).map(num => (
                <span key={num} className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded font-medium">
                  Q{num}
                </span>
              ))}
              {summary.missing.length > 50 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{summary.missing.length - 50} mais
                </span>
              )}
            </div>
          </details>
        )}
      </div>
    );
  };

  // ==================== RENDERIZAÇÃO DE QUESTÕES ====================

  // Componente para renderizar uma questão individual (MEMOIZADO)
  const QuestionCard = React.memo<{ question: BulkQuestion; index: number }>(({ question, index }) => {
    // Validação de segurança
    if (!question) {
      console.warn(`QuestionCard: question is undefined at index ${index}`);
      return null;
    }

    const isSelected = selectedQuestions.has(index);
    const isExpanded = expandedQuestions.has(index);

    return (
      <div
        data-question-index={index}
        key={question.tempId || index}
        className={`bg-surface-light dark:bg-surface-dark rounded-xl border-2 transition-all ${isSelected
          ? 'border-primary shadow-lg'
          : 'border-border-light dark:border-border-dark'
          }`}
      >
        {/* Question Header */}
        <div className="p-4 flex items-center justify-between border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={isSelected}
              onChange={() => memoizedHandleSelectQuestion(index)}
            />
            <span className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Questão {question.numero}
            </span>

            {/* Indicadores Visuais Melhorados */}
            {question.aiGenerated && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                IA
              </span>
            )}
            {question.correta !== undefined ? (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Gabarito
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                Sem Gabarito
              </span>
            )}
            {/* ✅ Badge de Questão Anulada */}
            {question.isAnnulled && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-xs">cancel</span>
                Anulada
              </span>
            )}
            {/* ✅ Badge de Questão Desatualizada */}
            {question.isOutdated && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-xs">schedule</span>
                Desatualizada
              </span>
            )}
            {question && (question.filterIds?.length || 0) === 0 && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">label_off</span>
                Sem Filtros
              </span>
            )}
            {question.alternativas.length < 4 && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                {question.alternativas.length} alt
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const y = window.scrollY;
              memoizedHandleToggleExpandQuestion(index, e);
              window.scrollTo(0, y);
            }}
            onMouseDown={(e) => e.preventDefault()}
            onFocus={(e) => e.preventDefault()}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
            {isExpanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>

        {/* Question Content (Expanded) */}
        {isExpanded && (
          <div className="p-6 space-y-6">
            {/* Enunciado */}
            <div>
              <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                Enunciado:
              </label>
              <RichTextEditor
                value={question.enunciado}
                onChange={(value) => memoizedHandleQuestionChange(index, 'enunciado', value)}
                placeholder="Digite o enunciado..."
                height="200px"
              />
            </div>

            {/* Alternativas */}
            <div>
              <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                Alternativas:
              </label>
              {/* ✅ Aviso para questões anuladas/desatualizadas */}
              {(question.isAnnulled || question.isOutdated) && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <span className="text-sm font-medium">
                      {question.isAnnulled ? 'Questão anulada:' : 'Questão desatualizada:'} múltiplas respostas permitidas
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {question.alternativas.map((alt, altIndex) => (
                  <div key={altIndex} className="flex items-center gap-3">
                    {/* ✅ Checkbox para anuladas/desatualizadas, Radio para normais */}
                    {(question.isAnnulled || question.isOutdated) ? (
                      <Checkbox
                        checked={Array.isArray(question.correta) ? question.correta.includes(altIndex) : question.correta === altIndex}
                        onChange={() => {
                          const currentCorrect = Array.isArray(question.correta) ? question.correta : (question.correta !== undefined ? [question.correta] : []);
                          const newCorrect = currentCorrect.includes(altIndex)
                            ? currentCorrect.filter(i => i !== altIndex)
                            : [...currentCorrect, altIndex];
                          memoizedHandleQuestionChange(index, 'correta', newCorrect);
                        }}
                      />
                    ) : (
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={question.correta === altIndex}
                        onChange={() => memoizedHandleCorrectAlternativeChange(index, altIndex)}
                        className="w-5 h-5 text-green-600 cursor-pointer"
                      />
                    )}
                    <span className="font-bold text-text-light-primary dark:text-text-dark-primary min-w-[24px]">
                      {String.fromCharCode(65 + altIndex)})
                    </span>
                    <input
                      type="text"
                      value={alt}
                      onChange={(e) => memoizedHandleAlternativeChange(index, altIndex, e.target.value)}
                      className="flex-1 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={`Alternativa ${String.fromCharCode(65 + altIndex)}`}
                    />
                    {question.alternativas.length > 2 && (
                      <button
                        onClick={() => memoizedHandleRemoveAlternative(index, altIndex)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Remover alternativa"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {question.alternativas.length < 6 && (
                <button
                  onClick={() => memoizedHandleAddAlternative(index)}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Adicionar Alternativa
                </button>
              )}
            </div>

            {/* ✅ Status Especiais: Anulada/Desatualizada */}
            <div>
              <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600">flag</span>
                Status Especiais:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Checkbox Anulada */}
                <div
                  onClick={() => toggleAnulada(index)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${question.isAnnulled
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-red-300'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${question.isAnnulled
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {question.isAnnulled && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-lg">cancel</span>
                        Questão Anulada
                      </div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                        Permite múltiplas respostas corretas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checkbox Desatualizada */}
                <div
                  onClick={() => toggleDesatualizada(index)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${question.isOutdated
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-orange-300'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${question.isOutdated
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {question.isOutdated && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-500 text-lg">schedule</span>
                        Questão Desatualizada
                      </div>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                        Protocolos/guidelines mudaram
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Aviso para questões anuladas/desatualizadas */}
              {(question.isAnnulled || question.isOutdated) && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2 text-yellow-800 dark:text-yellow-200">
                    <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                    <div className="text-sm">
                      <p className="font-medium">
                        {question.isAnnulled ? 'Questão anulada:' : 'Questão desatualizada:'} múltiplas respostas permitidas
                      </p>
                      <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">
                        Você pode marcar mais de uma alternativa como correta usando checkboxes ao invés de radio buttons.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Dificuldade:
                </label>
                <select
                  value={question.dificuldade || 'Média'}
                  onChange={(e) => memoizedHandleQuestionChange(index, 'dificuldade', e.target.value)}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Média">Média</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Status:
                </label>
                <select
                  value={question.status || 'Publicada'}
                  onChange={(e) => memoizedHandleQuestionChange(index, 'status', e.target.value)}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Publicada">Publicada</option>
                  <option value="Arquivada">Arquivada</option>
                </select>
              </div>
            </div>

            {/* Filtros Aplicados */}
            <div>
              <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                Filtros Aplicados:
              </label>
              <FilterTags
                filterIds={question.filterIds || []}
                subFilterIds={question.subFilterIds || []}
                filterNames={filterNames}
                onRemoveFilter={(filterId) => handleRemoveFilterFromQuestion(index, filterId)}
                onRemoveSubFilter={(subFilterId) => handleRemoveSubFilterFromQuestion(index, subFilterId)}
              />
            </div>

            {/* Comentário do Professor */}
            <div>
              <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">school</span>
                Comentário do Professor:
              </label>
              <RichTextEditor
                value={question.professorComment || ''}
                onChange={(value) => memoizedHandleQuestionChange(index, 'professorComment', value)}
                placeholder="Adicione um comentário explicativo sobre a questão..."
                height="150px"
              />
              {question.professorComment && (
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 italic flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  Este comentário pode ser modificado pela IA durante a categorização para evitar plágio.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Re-render apenas se a questão ou seleção/expansão mudou
    return (
      prevProps.question === nextProps.question &&
      prevProps.index === nextProps.index
    );
  });

  // ==================== RENDERIZAÇÃO TEMPORÁRIA ====================
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modal de Progresso de Processamento de Imagens */}
        {imageProcessingProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                🖼️ Processando Imagens para R2
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1 text-gray-700 dark:text-gray-300">
                    <span>Questão {imageProcessingProgress.currentQuestion} de {imageProcessingProgress.totalQuestions}</span>
                    <span>{imageProcessingProgress.current} / {imageProcessingProgress.total} imagens</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${imageProcessingProgress.total > 0 ? (imageProcessingProgress.current / imageProcessingProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fazendo upload das imagens para o Cloudflare R2...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Por favor, não feche esta página.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
                {draftId ? 'Revisão de Draft' : 'Criação em Massa de Questões'}
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">
                {draftId
                  ? `Revisando draft extraído e categorizado automaticamente`
                  : 'Extraia questões de arquivos PPTX ou PDF e edite em lote'}
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/questions')}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Voltar
            </button>
          </div>
        </div>

        {/* ✅ Alerta de Comentários Faltantes (quando vem de draft) */}
        {draftId && draftMetadata && (
          <CommentWarningAlert
            commentsGenerated={draftMetadata.commentsGenerated}
            commentsFailed={draftMetadata.commentsFailed}
            missingCommentQuestions={draftMetadata.missingCommentQuestions}
            totalQuestions={draftMetadata.totalQuestions || questions.length}
          />
        )}

        {/* Extraction Section with Tabs */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark mb-8">
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">upload_file</span>
            Métodos de Extração
          </h3>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border-light dark:border-border-dark">
            <button
              onClick={() => setExtractionMode('pptx')}
              className={`px-4 py-2 font-medium transition-all ${extractionMode === 'pptx'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }`}
            >
              📄 PPTX
            </button>
            <button
              onClick={() => setExtractionMode('scraper-manual')}
              className={`px-4 py-2 font-medium transition-all ${extractionMode === 'scraper-manual'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }`}
            >
              🔗 Scraper Manual
            </button>
            <button
              onClick={() => setExtractionMode('scraper-batch')}
              className={`px-4 py-2 font-medium transition-all ${extractionMode === 'scraper-batch'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }`}
            >
              ⚡ Scraper Batch
            </button>
            <button
              onClick={() => setExtractionMode('manage-drafts')}
              className={`px-4 py-2 font-medium transition-all ${extractionMode === 'manage-drafts'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }`}
            >
              📋 Gerenciar Rascunhos
            </button>
          </div>

          {/* PPTX Mode */}
          {extractionMode === 'pptx' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  Selecione o arquivo PPTX:
                </label>
                <input
                  type="file"
                  accept=".pptx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-text-light-secondary dark:text-text-dark-secondary
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                    file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 cursor-pointer
                    border border-border-light dark:border-border-dark rounded-lg
                    bg-background-light dark:bg-background-dark"
                />
                {pptxFile && (
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                    📄 {pptxFile.name} ({(pptxFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <button
                onClick={handleExtractQuestionsPPTX}
                disabled={!pptxFile || pptxLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pptxLoading ? (
                  'Extraindo questões...'
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Extrair Questões do PPTX
                  </>
                )}
              </button>
              {(pptxLoading || loadingDraft) && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
                  {loadingDraft ? 'Carregando draft...' : 'Processando arquivo PPTX... Isso pode levar alguns minutos.'}
                </div>
              )}
            </div>
          )}

          {/* Scraper Manual Mode */}
          {extractionMode === 'scraper-manual' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  URL da Prova:
                </label>
                <input
                  type="url"
                  value={scraperUrl}
                  onChange={(e) => setScraperUrl(e.target.value)}
                  placeholder="https://provaderesidencia.com.br/demo/..."
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                  Cole a URL completa da prova que deseja extrair
                </p>
              </div>
              <button
                onClick={handleExtractFromScraper}
                disabled={!scraperUrl || scraperExtracting}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scraperExtracting ? (
                  'Extraindo via scraper...'
                ) : (
                  <>
                    <span className="material-symbols-outlined">download</span>
                    Extrair Questões da URL
                  </>
                )}
              </button>
              {scraperProgress && (
                <div className="mt-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm">
                  {/* Header com status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {scraperProgress.status !== 'Concluído' && scraperProgress.status !== 'Erro' && (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">hourglass_empty</span>
                        </div>
                      )}
                      {scraperProgress.status === 'Concluído' && (
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                      )}
                      {scraperProgress.status === 'Erro' && (
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {scraperProgress.status}
                        </h3>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {scraperProgress.message}
                        </p>
                      </div>
                    </div>
                    {scraperProgress.totalQuestions > 0 && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {scraperProgress.currentQuestion}/{scraperProgress.totalQuestions}
                        </div>
                        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          questões
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barra de progresso */}
                  {scraperProgress.totalQuestions > 0 ? (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary-hover h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, (scraperProgress.currentQuestion / scraperProgress.totalQuestions) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        <span>{Math.round((scraperProgress.currentQuestion / scraperProgress.totalQuestions) * 100)}%</span>
                        <span>{scraperProgress.currentQuestion} de {scraperProgress.totalQuestions}</span>
                      </div>
                    </div>
                  ) : scraperProgress.status !== 'Concluído' && scraperProgress.status !== 'Erro' && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary-hover h-3 rounded-full animate-pulse w-full"></div>
                      </div>
                    </div>
                  )}

                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check_circle</span>
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">Extraídas</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {scraperProgress.questionsExtracted}
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-sm">image</span>
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Com Imagens</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {scraperProgress.questionsWithImages}
                      </div>
                      {scraperProgress.extractedQuestions.filter(q => q.hasImage).length > 0 && (
                        <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                          {scraperProgress.extractedQuestions
                            .filter(q => q.hasImage)
                            .map(q => q.numero)
                            .join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">error</span>
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">Com Erros</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {scraperProgress.questionsWithErrors}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scraper Batch Mode */}
          {extractionMode === 'scraper-batch' && (
            <div>
              {/* Source Selection Toggle */}
              <div className="mb-6 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg">
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                  Selecione a Fonte:
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setScraperSource('url');
                      setSelectedExamSources([]);
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${scraperSource === 'url'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border border-border-light dark:border-border-dark hover:border-primary'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">link</span>
                      <span>URLs Diretas</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      Cole links de provas
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setScraperSource('alternative');
                      setBatchUrls('');
                      setBatchUrlsArray([]);
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${scraperSource === 'alternative'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border border-border-light dark:border-border-dark hover:border-primary'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">school</span>
                      <span>Fonte Alternativa</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      Selecione provas do catálogo
                    </p>
                  </button>
                </div>
              </div>

              {/* Alternative Source Selection */}
              {scraperSource === 'alternative' && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
                    Selecione as Provas:
                  </label>

                  {/* Search Input */}
                  <div className="mb-3">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary">
                        search
                      </span>
                      <input
                        type="text"
                        value={examSourceSearch}
                        onChange={(e) => setExamSourceSearch(e.target.value)}
                        placeholder="Buscar por universidade, ano, tipo..."
                        className="w-full pl-10 pr-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Loading State */}
                  {examSourcesLoading && (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-text-light-secondary dark:text-text-dark-secondary">
                        Carregando provas...
                      </span>
                    </div>
                  )}

                  {/* Exam Sources List */}
                  {!examSourcesLoading && examSources.length > 0 && (
                    <div className="max-h-96 overflow-y-auto border border-border-light dark:border-border-dark rounded-lg">
                      {examSources
                        .filter(source =>
                          examSourceSearch === '' ||
                          source.label.toLowerCase().includes(examSourceSearch.toLowerCase())
                        )
                        .map((source) => (
                          <label
                            key={source.id}
                            className="flex items-start gap-3 p-3 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer border-b border-border-light dark:border-border-dark last:border-b-0"
                          >
                            <div className="mt-1">
                              <Checkbox
                                checked={selectedExamSources.includes(source.source_value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedExamSources([...selectedExamSources, source.source_value]);
                                  } else {
                                    setSelectedExamSources(selectedExamSources.filter(id => id !== source.source_value));
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                {source.label}
                              </div>
                              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                                Índice: {source.source_index}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}

                  {/* Selected Count */}
                  {selectedExamSources.length > 0 && (
                    <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {selectedExamSources.length} prova(s) selecionada(s)
                        </span>
                        <button
                          onClick={() => setSelectedExamSources([])}
                          className="text-xs text-primary hover:text-primary-hover underline"
                        >
                          Limpar seleção
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Saved Jobs */}
              {savedJobs.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">history</span>
                    Jobs em Andamento
                  </h4>
                  <div className="space-y-2">
                    {savedJobs.map((job) => (
                      <div key={job.jobId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-yellow-700 dark:text-yellow-300">
                            Job ID: {job.jobId.slice(0, 12)}...
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            {job.totalUrls} URLs • Iniciado em {new Date(job.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resumeJob(job.jobId)}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            Retomar
                          </button>
                          <button
                            onClick={() => removeJobFromStorage(job.jobId)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL Input - Only for URL source */}
              {scraperSource === 'url' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                    URLs das Provas (uma por linha):
                  </label>
                  <textarea
                    value={batchUrls}
                    onChange={(e) => {
                      setBatchUrls(e.target.value);
                      // Atualizar array de URLs
                      const urls = e.target.value.split('\n').map(u => u.trim()).filter(u => u.length > 0);
                      setBatchUrlsArray(urls);
                      // Inicializar configs para novas URLs
                      const newConfigs = { ...batchConfigs };
                      urls.forEach(url => {
                        if (!newConfigs[url]) {
                          newConfigs[url] = { saveAsOfficial: false };
                        }
                      });
                      setBatchConfigs(newConfigs);
                    }}
                    placeholder="https://provaderesidencia.com.br/demo/prova1&#10;https://provaderesidencia.com.br/demo/prova2&#10;https://provaderesidencia.com.br/demo/prova3"
                    rows={6}
                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                    {batchUrlsArray.length} URLs detectadas
                  </p>
                </div>
              )}

              {/* Configuração Individual por URL */}
              {batchUrlsArray.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Configurar URLs:
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {batchUrlsArray.map((url) => (
                      <UrlConfigPanel
                        key={url}
                        url={url}
                        config={batchConfigs[url] || { saveAsOfficial: false }}
                        onChange={(url, config) => {
                          setBatchConfigs({ ...batchConfigs, [url]: config });
                        }}
                        onRemove={(url) => {
                          const newUrls = batchUrlsArray.filter(u => u !== url);
                          setBatchUrlsArray(newUrls);
                          setBatchUrls(newUrls.join('\n'));
                          const newConfigs = { ...batchConfigs };
                          delete newConfigs[url];
                          setBatchConfigs(newConfigs);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* WebSocket Status - Removido, status agora é mostrado no JobProgressDisplay */}

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitBatch}
                  disabled={
                    batchProcessing ||
                    (scraperSource === 'url' && !batchUrls) ||
                    (scraperSource === 'alternative' && selectedExamSources.length === 0)
                  }
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {batchProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processando batch...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">rocket_launch</span>
                      Iniciar Processamento em Lote
                      {scraperSource === 'alternative' && selectedExamSources.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                          {selectedExamSources.length}
                        </span>
                      )}
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancelAllJobs}
                  disabled={activeJobs.length === 0 && !batchProcessing}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={`Cancelar ${activeJobs.length} job(s) ativo(s)`}
                >
                  <span className="material-symbols-outlined">cancel</span>
                  🚨 CANCELAR TODOS ({activeJobs.length})
                </button>
              </div>

              {/* Batch Progress via WebSocket - INLINE */}
              {currentJobId && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      📊 Progresso do Batch
                    </h3>
                    <button
                      onClick={handleCancelBatch}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ❌ Cancelar Job
                    </button>
                  </div>

                  <JobProgressDisplay
                    jobId={currentJobId}
                    onComplete={() => {
                      setBatchProcessing(false);
                      setCurrentJobId(null);
                    }}
                  />
                </div>
              )}

              {/* Drafts List */}
              {currentJobId && (
                <div className="mt-4">
                  <DraftsList jobId={currentJobId} />
                </div>
              )}

              {/* Batch Results */}
              {batchResults.length > 0 && !batchProcessing && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <h4 className="font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
                    📊 Resultados do Batch
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {batchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-sm ${result.status === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          }`}
                      >
                        <div className="font-medium truncate">{result.url}</div>
                        {result.status === 'success' ? (
                          <div className="text-xs">
                            ✅ {result.questionsExtracted} questões extraídas, {result.questionsSaved} salvas
                          </div>
                        ) : (
                          <div className="text-xs">❌ {result.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Drafts Mode */}
          {extractionMode === 'manage-drafts' && (
            <div>
              <DraftsManager
                onLoadDraft={(draftId) => {
                  // Load draft data into current page
                  loadDraftData(draftId);
                  // Switch back to appropriate extraction mode
                  setExtractionMode('scraper-batch');
                }}
              />
            </div>
          )}
        </div>

        {/* Resumo de Extração Visual */}
        {extractionSummary && questions.length > 0 && (
          <ExtractionStats summary={extractionSummary} />
        )}

        {/* Sistema de Gabarito */}
        {questions.length > 0 && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark mb-8">
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">fact_check</span>
              Aplicar Gabarito
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Faça upload de um arquivo TXT, CSV ou PDF contendo as respostas corretas para aplicar automaticamente às questões extraídas.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Selecione o arquivo de gabarito (TXT, CSV ou PDF):
              </label>
              <input
                type="file"
                accept=".txt,.csv,.pdf"
                onChange={handleGabaritoFileChange}
                className="block w-full text-sm text-text-light-secondary dark:text-text-dark-secondary
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                  file:text-sm file:font-semibold file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100 cursor-pointer
                  border border-border-light dark:border-border-dark rounded-lg
                  bg-background-light dark:bg-background-dark"
              />
              {gabaritoFile && (
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                  📄 {gabaritoFile.name} ({(gabaritoFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Formatos aceitos:</strong>
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-disc">
                <li>TXT/CSV: "1,A" ou "Q1: A" ou "1) A" ou "Questão 1: A"</li>
                <li>PDF: Gabarito será extraído automaticamente</li>
              </ul>
            </div>
            <button
              onClick={processGabarito}
              disabled={!gabaritoFile || processingGabarito}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingGabarito ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processando gabarito...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Aplicar Gabarito às Questões
                </>
              )}
            </button>
            {processingGabarito && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></span>
                Aplicando respostas corretas às questões...
              </div>
            )}
          </div>
        )}

        {/* Categorização IA */}
        {questions.length > 0 && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark mb-8">
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">psychology</span>
              Categorização Inteligente com IA
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Use inteligência artificial para categorizar automaticamente as questões com filtros e subfiltros do sistema.
            </p>

            {!filtersLoaded && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <span className="material-symbols-outlined">info</span>
                  Os filtros serão carregados automaticamente ao iniciar a categorização.
                </p>
              </div>
            )}

            {filtersLoaded && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  {filters.length} filtros carregados e prontos para categorização
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <CategorizationButton
                questions={questions}
                selectedQuestions={selectedQuestions}
                onCategorizationStart={handleCategorizationStart}
                onCategorizationComplete={handleCategorizationComplete}
                disabled={categorizationLoading || loadingFilters}
              />

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined">filter_alt</span>
                <span>{showFilterPanel ? 'Ocultar' : 'Mostrar'} Filtros</span>
                {selectedQuestions.size > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {selectedQuestions.size} selecionadas
                  </span>
                )}
              </button>
            </div>

            {categorizationProgress && (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Processando lote {categorizationProgress.currentBatch} de {categorizationProgress.totalBatches}
                  </span>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {categorizationProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-2 mb-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${categorizationProgress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {categorizationProgress.processedQuestions} de {categorizationProgress.totalQuestions} questões processadas
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Como funciona:</strong>
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-disc">
                <li>Análise inteligente do conteúdo de cada questão</li>
                <li>Sugestão automática de filtros e subfiltros relevantes</li>
                <li>Processamento em lotes de 3 questões para melhor performance</li>
                <li>Você pode revisar e ajustar as categorizações depois</li>
              </ul>
            </div>

            {/* Painel de Filtros Manuais */}
            {showFilterPanel && (
              <div className="mt-4">
                <FilterTreePanel
                  isOpen={showFilterPanel}
                  onClose={() => setShowFilterPanel(false)}
                  selectedFilterIds={
                    selectedQuestions.size > 0
                      ? Array.from(new Set(
                        questions
                          .filter((_, idx) => selectedQuestions.has(idx))
                          .flatMap(q => q.filterIds || [])
                      ))
                      : []
                  }
                  selectedSubFilterIds={
                    selectedQuestions.size > 0
                      ? Array.from(new Set(
                        questions
                          .filter((_, idx) => selectedQuestions.has(idx))
                          .flatMap(q => q.subFilterIds || [])
                      ))
                      : []
                  }
                  onAddFilter={handleAddFilterToSelected}
                  onRemoveFilter={handleRemoveFilterFromSelected}
                  onAddSubFilter={handleAddSubFilterToSelected}
                  onRemoveSubFilter={handleRemoveSubFilterFromSelected}
                />
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Draft Indicator */}
        {draftMetadata && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Voltar"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
              </button>
              <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {draftMetadata.examName || draftMetadata.url || 'Draft sem título'}
              </h1>
            </div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-12">
              {draftMetadata.totalQuestions} questões • Criado em {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        {/* Filtro e Busca */}
        {questions.length > 0 && (
          <div className="mb-4 bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por número ou conteúdo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todas ({questions.length})</option>
                <option value="with-gabarito">Com Gabarito ({questions.filter(q => q.correta !== undefined).length})</option>
                <option value="without-gabarito">Sem Gabarito ({questions.filter(q => q.correta === undefined).length})</option>
                <option value="categorized">Categorizadas ({questions.filter(q => (q.filterIds?.length || 0) > 0).length})</option>
                <option value="not-categorized">Não Categorizadas ({questions.filter(q => (q.filterIds?.length || 0) === 0).length})</option>
              </select>
            </div>
            {(searchTerm || filterStatus !== 'all') && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">
                  Mostrando {filteredQuestions.length} de {questions.length} questões
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        {questions.length > 0 && (
          <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-text-light-primary dark:text-text-dark-primary font-semibold">
                {filteredQuestions.length} questões | {selectedQuestions.size} selecionadas
              </span>
              <button
                onClick={handleSelectAllQuestions}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                {selectedQuestions.size === questions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>
              {selectedQuestions.size > 0 && (
                <button
                  onClick={handleRemoveSelectedQuestions}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Remover ({selectedQuestions.size})
                </button>
              )}
              <button
                onClick={handleExpandAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Expandir Todas
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Recolher Todas
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportQuestionsToJSON}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined">download</span>
                Exportar JSON
              </button>
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined">upload</span>
                Importar JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={importQuestionsFromJSON}
                  className="hidden"
                />
              </label>
            </div>

            {/* Seção de Prova Oficial */}
            {questions.length > 0 && (
              <div className="w-full mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Checkbox
                  checked={saveAsOfficialExam}
                  onChange={(e) => setSaveAsOfficialExam(e.target.checked)}
                  label="☑️ Salvar também como prova oficial completa"
                />

                {saveAsOfficialExam && (
                  <div className="space-y-3 pl-7">
                    {/* Título da Prova */}
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Título da Prova *
                      </label>
                      <input
                        type="text"
                        value={officialExamData.title}
                        onChange={(e) => setOfficialExamData({ ...officialExamData, title: e.target.value })}
                        placeholder="Ex: UFPE - PE - R1 2024"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este será o nome exibido para os alunos
                      </p>
                    </div>

                    {/* Instituição (Seletor Hierárquico) */}
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Instituição *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-gray-900 dark:text-gray-100">
                          {officialExamData.universityId || 'Selecione a universidade...'}
                        </span>
                        <span className="material-symbols-outlined text-gray-500">
                          {showFilterPanel ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Selecione o estado e depois a universidade (ex: PE {'>'} UFPE)
                      </p>
                    </div>

                    {/* Painel de Seleção de Instituição */}
                    {showFilterPanel && (
                      <FilterTreePanel
                        isOpen={showFilterPanel}
                        onClose={() => setShowFilterPanel(false)}
                        selectedFilterIds={[]}
                        selectedSubFilterIds={[]}
                        onAddFilter={(filterId, filterName) => {
                          // Não usar filtro pai, apenas subfiltros (universidades)
                          setShowFilterPanel(false);
                        }}
                        onRemoveFilter={() => { }}
                        onAddSubFilter={(subFilterId, subFilterName, parentPath) => {
                          // subFilterId é o ID da universidade na tabela sub_filters
                          setOfficialExamData({ ...officialExamData, universityId: subFilterId });
                          setShowFilterPanel(false);
                        }}
                        onRemoveSubFilter={() => { }}
                      />
                    )}

                    {/* Tipo de Prova */}
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Tipo de Prova *
                      </label>
                      <select
                        value={officialExamData.examTypeFilterId}
                        onChange={(e) => setOfficialExamData({ ...officialExamData, examTypeFilterId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Selecione o tipo...</option>
                        <option value="Revalida">Revalida</option>
                        <option value="Residência Médica">Residência Médica</option>
                        <option value="R3">R3</option>
                        <option value="Provas Irmãs ( Revalida)">Provas Irmãs ( Revalida)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Tipo de prova para filtros e organização
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="w-full flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleSaveChanges}
                disabled={saving || questions.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    Salvar Todas ({questions.length})
                  </>
                )}
              </button>
            </div>

            {/* Dica de Atalhos */}
            <div className="w-full mt-3 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">keyboard</span>
                <strong>Atalhos:</strong>
                <span className="hidden md:inline">
                  Ctrl+S (Salvar) | Ctrl+A (Selecionar) | Ctrl+E (Expandir) | Ctrl+Shift+E (Recolher) | Esc (Limpar seleção)
                </span>
                <span className="md:hidden">
                  Ctrl+S, Ctrl+A, Ctrl+E, Esc
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Edição em Lote */}
        {selectedQuestions.size > 0 && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="material-symbols-outlined">edit_note</span>
                Editar {selectedQuestions.size} questões selecionadas:
              </p>
              <button
                onClick={() => setSelectedQuestions(new Set())}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Cancelar seleção
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkEdit('dificuldade', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-text-light-primary dark:text-text-dark-primary text-sm"
              >
                <option value="">Alterar Dificuldade</option>
                <option value="Fácil">→ Fácil</option>
                <option value="Média">→ Média</option>
                <option value="Difícil">→ Difícil</option>
              </select>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkEdit('status', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-text-light-primary dark:text-text-dark-primary text-sm"
              >
                <option value="">Alterar Status</option>
                <option value="Rascunho">→ Rascunho</option>
                <option value="Publicada">→ Publicada</option>
                <option value="Arquivada">→ Arquivada</option>
              </select>
              <button
                onClick={() => {
                  if (window.confirm(`Limpar filtros de ${selectedQuestions.size} questões?`)) {
                    handleBulkEdit('filterIds', []);
                    handleBulkEdit('subFilterIds', []);
                  }
                }}
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-text-light-primary dark:text-text-dark-primary text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Questions List */}
        {questions.length > 0 && filteredQuestions.length > 0 && (
          <div className="space-y-4" style={{ scrollBehavior: 'auto' }}>
            {filteredQuestions.map((question, idx) => {
              if (!question) return null;
              const originalIndex = questions.findIndex(q => q?.tempId && q.tempId === question.tempId);
              const safeIndex = originalIndex !== -1 ? originalIndex : idx;
              return (
                <QuestionCard key={question.tempId || safeIndex} question={question} index={safeIndex} />
              );
            })}
          </div>
        )}

        {/* No Results State */}
        {questions.length > 0 && filteredQuestions.length === 0 && (
          <div className="text-center py-16 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-5xl mb-4">search_off</span>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhuma questão encontrada
            </h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Tente ajustar os filtros ou termo de busca
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* Modal de Preview Antes de Salvar */}
        {showSavePreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full">
              <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">preview</span>
                Confirmar Salvamento
              </h3>

              <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">📝 Total de questões:</span>
                  <strong className="text-lg text-text-light-primary dark:text-text-dark-primary">{questions.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">✅ Com gabarito:</span>
                  <strong className="text-lg text-green-600 dark:text-green-400">
                    {questions.filter(q => q.correta !== undefined).length}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">🏷️ Categorizadas:</span>
                  <strong className="text-lg text-blue-600 dark:text-blue-400">
                    {questions.filter(q => (q.filterIds?.length || 0) > 0).length}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">⚠️ Sem gabarito:</span>
                  <strong className="text-lg text-red-600 dark:text-red-400">
                    {questions.filter(q => q.correta === undefined).length}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">📋 Sem filtros:</span>
                  <strong className="text-lg text-yellow-600 dark:text-yellow-400">
                    {questions.filter(q => (q.filterIds?.length || 0) === 0).length}
                  </strong>
                </div>
              </div>

              {questions.filter(q => q.correta === undefined).length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <strong>Atenção:</strong> Algumas questões não têm gabarito definido.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSavePreview(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAndSave}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">save</span>
                  Confirmar e Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Erros de Validação */}
        {showValidationModal && validationErrors.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  ❌ {validationErrors.length} Questões com Problemas
                </h3>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {validationErrors.map((err, idx) => (
                  <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="font-bold text-red-700 dark:text-red-300 mb-1">
                      Questão {err.questionNumber}:
                    </div>
                    <ul className="text-sm text-red-600 dark:text-red-400 ml-4 list-disc">
                      {err.errors.map((error, errorIdx) => (
                        <li key={errorIdx}>{error}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        setShowValidationModal(false);
                        // Expandir e rolar até a questão com erro
                        const expandedSet = new Set(expandedQuestions);
                        expandedSet.add(err.questionIndex);
                        setExpandedQuestions(expandedSet);
                        setTimeout(() => {
                          const element = document.getElementById(`question-${err.questionIndex}`);
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                      className="mt-2 text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      Ir para questão
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    handleExpandAll();
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Expandir Todas para Corrigir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {questions.length === 0 && !pptxLoading && !loadingDraft && (
          <div className="text-center py-16">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-5xl">upload_file</span>
            </div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhuma questão carregada
            </h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
              Faça upload de um arquivo PPTX para começar
            </p>

          </div>
        )}
      </div>

      {/* Categorization Progress Modal com WebSocket */}
      {showCategorizationProgress && categorizationJobId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Categorizando Questões
                </h2>
                <button
                  onClick={handleCancelCategorization}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <JobProgressDisplay
                jobId={categorizationJobId}
                onComplete={() => {
                  setShowCategorizationProgress(false);
                  setCategorizationJobId(null);
                  setCategorizationLoading(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Categorization Results Modal */}
      {showCategorizationResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Resultados da Categorização
                </h2>
                <button
                  onClick={handleCloseCategorizationResults}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {categorizationResults.length} questão(ões) categorizada(s). Revise e aceite as sugestões.
              </p>
            </div>
            <div className="p-6">
              <CategorizationResultsViewer
                results={categorizationResults}
                onAccept={handleAcceptCategorization}
                onReject={handleRejectCategorization}
                onModify={handleModifyCategorization}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCreateQuestionsPage;
