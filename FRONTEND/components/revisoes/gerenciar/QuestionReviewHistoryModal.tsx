'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface QuestionReviewHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviewId: string;
    contentId: string;
    reviewType: 'QUESTION' | 'ERROR_NOTEBOOK';
}

interface ReviewHistoryEntry {
    id: string;
    reviewed_at: string;
    grade: number;
    elapsed_days: number;
    scheduled_days: number;
    state: number;
    stability: number;
    difficulty: number;
}

interface SubFilter {
    id: string;
    name: string;
    filter_id: string;
    parent_id?: string | null;
    level: number;
}

interface QuestionData {
    id: string;
    enunciado: string;
    alternativas: Array<{
        id: string;
        texto: string;
        correta: boolean;
    }>;
    sub_filter_ids?: string[];
    university?: string;
    year?: string;
    exam_name?: string;
    is_outdated?: boolean;
    is_annulled?: boolean;
    // Campos extras do caderno de erros
    user_note?: string;
    user_explanation?: string;
    key_points?: string[];
    alternative_comments?: Record<string, string>;
}

function QuestionReviewHistoryModal({
    isOpen,
    onClose,
    reviewId,
    contentId,
    reviewType
}: QuestionReviewHistoryModalProps) {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const [activeTab, setActiveTab] = useState<'question' | 'history' | 'stats'>('question');
    const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
    const [questionData, setQuestionData] = useState<QuestionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [, setExpandedEntries] = useState<Set<string>>(new Set());
    const [filterPaths, setFilterPaths] = useState<string[][]>([]);
    const [subFiltersMap, setSubFiltersMap] = useState<Map<string, SubFilter>>(new Map());

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
            loadData();
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
                setHistory([]);
                setQuestionData(null);
                setExpandedEntries(new Set());
                setActiveTab('question');
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadHistory(),
                loadQuestionData()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistory = async () => {
        if (!reviewId || reviewId === 'undefined') {
            console.error('[QuestionReviewHistoryModal] reviewId inválido:', reviewId);
            return;
        }

        try {
            const { supabase } = await import('@/config/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            const response = await fetch(`/api/unified-reviews/history/${reviewId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) throw new Error('Erro ao carregar histórico');

            const result = await response.json();
            const historyData = result.data?.history || result.history || [];
            setHistory(historyData);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    const loadQuestionData = async () => {
        if (!contentId || contentId === 'undefined') {
            console.error('[QuestionReviewHistoryModal] contentId inválido:', contentId);
            return;
        }

        try {
            console.log('[QuestionReviewHistoryModal] Carregando questão. contentId:', contentId, 'reviewType:', reviewType);

            let questionId = contentId;

            // Para CADERNO DE ERROS, o contentId é o ID da entrada, não da questão
            if (reviewType === 'ERROR_NOTEBOOK') {
                console.log('[QuestionReviewHistoryModal] É caderno de erros, buscando entrada...');
                const { errorNotebookService } = await import('@/services/errorNotebookService');

                // Buscar todas as entradas e filtrar pela que queremos
                const data = await errorNotebookService.getUserEntries({});
                console.log('[QuestionReviewHistoryModal] Total de entradas:', data.entries.length);

                const entry = data.entries.find((e: any) => e.id === contentId);
                console.log('[QuestionReviewHistoryModal] Entrada encontrada:', entry);

                if (!entry) {
                    console.error('[QuestionReviewHistoryModal] Entrada do caderno não encontrada');
                    return;
                }

                // Caderno de erros tem estrutura própria
                console.log('[QuestionReviewHistoryModal] Entry do caderno:', entry);

                // Usar question_statement como enunciado
                const enunciado = entry.question_statement || '';

                // Montar alternativas do question_data
                // Buscar a alternativa correta da questão original (igual à página de revisão)
                let correctAlternativeId = entry.correct_answer;

                if (entry.question_id) {
                    try {
                        const { getQuestionsByIds } = await import('@/lib/api/questions');
                        const questions = await getQuestionsByIds([entry.question_id]);
                        if (questions && questions.length > 0) {
                            // Priorizar correctAlternative da questão, fallback para entry.correct_answer
                            correctAlternativeId = questions[0].correctAlternative || entry.correct_answer;
                        }
                    } catch (error) {
                        console.error('[QuestionReviewHistoryModal] Erro ao buscar questão original:', error);
                    }
                }

                const alternativas = entry.question_data?.alternatives?.map((alt: any) => ({
                    id: alt.id,
                    texto: alt.text,
                    correta: alt.id === correctAlternativeId
                })) || [];

                // Buscar sub_filter_ids se tiver question_id
                let sub_filter_ids: string[] = [];

                if (entry.question_id) {
                    // Buscar a questão para pegar os sub_filter_ids
                    const { getQuestionsByIds } = await import('@/lib/api/questions');
                    const questions = await getQuestionsByIds([entry.question_id]);

                    if (questions && questions.length > 0 && questions[0].sub_filter_ids) {
                        sub_filter_ids = questions[0].sub_filter_ids;
                    }
                }

                setQuestionData({
                    id: entry.question_id || contentId,
                    enunciado: enunciado,
                    alternativas: alternativas,
                    sub_filter_ids: sub_filter_ids,
                    university: entry.question_data?.institution,
                    year: entry.question_data?.year?.toString(),
                    exam_name: entry.question_data?.institution && entry.question_data?.year
                        ? `${entry.question_data.institution} - ${entry.question_data.year}`
                        : 'Caderno de Erros',
                    is_outdated: (entry.question_data as any)?.is_outdated || false,
                    is_annulled: (entry.question_data as any)?.is_annulled || false,
                    // Dados extras do caderno de erros
                    user_note: entry.user_note,
                    user_explanation: entry.user_explanation,
                    key_points: entry.key_points,
                    alternative_comments: entry.alternative_comments,
                });
                return;
            }

            // Buscar questão usando a API
            const { getQuestionsByIds } = await import('@/lib/api/questions');
            const questions = await getQuestionsByIds([questionId]);

            console.log('[QuestionReviewHistoryModal] Questões recebidas:', questions);

            if (questions && questions.length > 0) {
                const question = questions[0];
                console.log('[QuestionReviewHistoryModal] Questão carregada:', question);

                // Converter para o formato esperado pelo modal
                setQuestionData({
                    id: question.id,
                    enunciado: question.text,
                    alternativas: question.alternatives.map(alt => ({
                        id: alt.id,
                        texto: alt.text,
                        correta: alt.id === question.correctAlternative
                    })),
                    sub_filter_ids: question.sub_filter_ids || [],
                    university: question.institution,
                    year: question.year?.toString(),
                    exam_name: `${question.institution} - ${question.year}`,
                    is_outdated: question.isOutdated || false,
                    is_annulled: question.isAnnulled || false,
                });
            } else {
                console.warn('[QuestionReviewHistoryModal] Nenhuma questão retornada para ID:', questionId);
            }
        } catch (error) {
            console.error('[QuestionReviewHistoryModal] Erro ao carregar questão:', error);
        }
    };

    // Construir caminhos de filtros quando questionData mudar
    useEffect(() => {
        async function loadFilters() {
            try {
                if (!questionData?.sub_filter_ids || questionData.sub_filter_ids.length === 0) {
                    setFilterPaths([]);
                    return;
                }

                const { getSubFiltersMap } = await import('@/lib/services/filterService');
                const map = await getSubFiltersMap();
                setSubFiltersMap(map);

                // Filtrar apenas subfiltros de especialidades (não incluir Ano e Universidade)
                const specialtyIds = questionData.sub_filter_ids.filter(id =>
                    !id.startsWith('Ano da Prova_') &&
                    !id.startsWith('Universidade_')
                );

                // Agrupar IDs por filtro raiz (primeira parte antes do primeiro _)
                const pathsByRoot = new Map<string, string[]>();

                specialtyIds.forEach(id => {
                    const rootId = id.split('_')[0];
                    if (!pathsByRoot.has(rootId)) {
                        pathsByRoot.set(rootId, []);
                    }
                    pathsByRoot.get(rootId)!.push(id);
                });

                // Construir caminhos hierárquicos para cada grupo
                const paths: string[][] = [];

                pathsByRoot.forEach((ids, rootId) => {
                    // Ordenar IDs por profundidade (mais profundo primeiro)
                    const sortedIds = ids.sort((a, b) => {
                        const depthA = (a.match(/_/g) || []).length;
                        const depthB = (b.match(/_/g) || []).length;
                        return depthB - depthA;
                    });

                    // Pegar o ID mais profundo (que contém todo o caminho)
                    const deepestId = sortedIds[0];

                    // Verificar se deepestId é válido
                    if (!deepestId || typeof deepestId !== 'string') {
                        console.warn('[QuestionReviewHistoryModal] deepestId inválido:', deepestId);
                        return;
                    }

                    // Reconstruir o caminho completo
                    const path: string[] = [];
                    const parts = deepestId.split('_');

                    // Verificar se parts é válido
                    if (!parts || !Array.isArray(parts) || parts.length === 0) {
                        console.warn('[QuestionReviewHistoryModal] parts inválido:', parts);
                        return;
                    }

                    // Adicionar o filtro raiz primeiro
                    const rootFilter = map.get(rootId);
                    if (rootFilter) {
                        path.push(rootFilter.name);
                    }

                    // Construir IDs incrementalmente e buscar os nomes
                    for (let i = 1; i < parts.length; i++) {
                        const partialId = parts.slice(0, i + 1).join('_');
                        const subFilter = map.get(partialId);
                        if (subFilter) {
                            path.push(subFilter.name);
                        }
                    }

                    if (path.length > 0) {
                        paths.push(path);
                    }
                });

                setFilterPaths(paths);
            } catch (error) {
                console.error('[QuestionReviewHistoryModal] Erro ao carregar filtros:', error);
            }
        }

        loadFilters();
    }, [questionData?.sub_filter_ids]);

    // Extrair instituição e ano dos sub_filter_ids
    const getInstitution = () => {
        if (!questionData) return '';

        const institutionId = questionData.sub_filter_ids?.find((id: string) =>
            id.startsWith('Universidade_') || id.startsWith('Residencia_')
        );
        if (institutionId) {
            const subFilter = subFiltersMap.get(institutionId);
            return subFilter?.name || questionData.university || '';
        }
        return questionData.university || '';
    };

    const getYear = () => {
        if (!questionData) return '';

        const yearId = questionData.sub_filter_ids?.find((id: string) => /^\d{4}$/.test(id.split('_').pop() || ''));
        if (yearId) {
            const parts = yearId.split('_');
            return parts[parts.length - 1];
        }
        return questionData.year?.toString() || '';
    };


    const getGradeLabel = (grade: number) => {
        // Para questões e caderno de erros: grade 0 = Errou, grade >= 1 = Acertou
        return grade === 0 ? 'Errou' : 'Acertou';
    };

    const getGradeColor = (grade: number) => {
        if (grade === 0) {
            return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        }
        // grade >= 1 = Acertou (verde)
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const formatRelativeDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();

        // Zerar as horas para comparar apenas as datas
        date.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays} dias atrás`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
        return `${Math.floor(diffDays / 365)} anos atrás`;
    };

    // Calcular estatísticas
    // Para questões: grade 0 = Errou, grade >= 1 = Acertou (aceitar 1 ou 2 por compatibilidade)
    const totalReviews = history.length;
    const correctReviews = history.filter(h => h.grade >= 1).length;
    const accuracy = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;

    if (!shouldRender) return null;

    // Verificar se está no browser antes de usar createPortal
    if (typeof window === 'undefined') return null;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[800px] bg-surface-light dark:bg-surface-dark 
                           shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-3">
                                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                    {reviewType === 'QUESTION' ? 'Questão' : 'Caderno de Erros'}
                                </h2>

                                {questionData && (
                                    <>
                                        {/* Universidade e Ano */}
                                        {(getInstitution() || getYear()) && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary shadow-sm"
                                                    aria-label={`Instituição: ${getInstitution()}`}
                                                >
                                                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                                                    <span className="text-xs font-medium">{getInstitution()}</span>
                                                </button>

                                                {getYear() && (
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary shadow-sm"
                                                        aria-label={`Ano: ${getYear()}`}
                                                    >
                                                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                                                        <span className="text-xs font-medium">{getYear()}</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Caminhos hierárquicos dos filtros */}
                                        {filterPaths.length > 0 && (
                                            <div className="flex flex-col gap-2">
                                                {filterPaths.map((path, pathIndex) => (
                                                    <div
                                                        key={pathIndex}
                                                        className="flex items-center gap-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary overflow-x-auto"
                                                    >
                                                        {path.map((name, nameIndex) => (
                                                            <div key={nameIndex} className="flex items-center gap-1.5 flex-shrink-0">
                                                                {nameIndex > 0 && (
                                                                    <span className="text-text-light-tertiary dark:text-text-dark-tertiary flex-shrink-0">→</span>
                                                                )}
                                                                <span className="px-2 py-1 bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded-md border border-border-light dark:border-border-dark whitespace-nowrap flex-shrink-0">
                                                                    {name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                                         transition-all duration-200 hover:scale-110 group flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                               group-hover:text-primary transition-colors">
                                    close
                                </span>
                            </button>
                        </div>
                    </div>



                    {/* Tabs */}
                    <div className="flex border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <button
                            onClick={() => setActiveTab('question')}
                            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all duration-200 relative
                                     ${activeTab === 'question'
                                    ? 'text-primary'
                                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-xl">quiz</span>
                                Questão
                            </span>
                            {activeTab === 'question' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all duration-200 relative
                                     ${activeTab === 'history'
                                    ? 'text-primary'
                                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-xl">schedule</span>
                                Timeline
                            </span>
                            {activeTab === 'history' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all duration-200 relative
                                     ${activeTab === 'stats'
                                    ? 'text-primary'
                                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-xl">bar_chart</span>
                                Estatísticas
                            </span>
                            {activeTab === 'stats' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                    </div>

                    {/* Content */}
                    <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <MedBraveLoader />
                            </div>
                        ) : activeTab === 'question' ? (
                            questionData ? (
                                <div className="space-y-6">
                                    {/* Enunciado */}
                                    <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 border-2 border-border-light dark:border-border-dark shadow-lg">
                                        <div className="flex items-center gap-2 mb-4">
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                                                Enunciado
                                            </h3>
                                            {questionData.is_annulled && (
                                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-md border border-red-300 dark:border-red-700">
                                                    ANULADA
                                                </span>
                                            )}
                                            {questionData.is_outdated && (
                                                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-md border border-orange-300 dark:border-orange-700">
                                                    DESATUALIZADA
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none text-text-light-primary dark:text-text-dark-primary"
                                            dangerouslySetInnerHTML={{ __html: questionData.enunciado }}
                                        />
                                    </div>

                                    {/* Alternativas */}
                                    <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 border-2 border-border-light dark:border-border-dark shadow-lg">
                                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
                                            Alternativas
                                        </h3>
                                        <div className="space-y-3">
                                            {questionData.alternativas?.map((alt, index) => (
                                                <div
                                                    key={alt.id}
                                                    className={`p-4 rounded-lg border-2 ${alt.correta
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                                        : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${alt.correta
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                            }`}>
                                                            {String.fromCharCode(65 + index)}
                                                        </span>
                                                        <div
                                                            className="flex-1 prose prose-sm dark:prose-invert max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: alt.texto }}
                                                        />
                                                        {alt.correta && (
                                                            <span className="material-symbols-outlined text-green-500 flex-shrink-0">
                                                                check_circle
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Comentário da alternativa (caderno de erros) */}
                                                    {questionData.alternative_comments?.[alt.id] && (
                                                        <div className="mt-3 pl-9 text-sm text-text-light-secondary dark:text-text-dark-secondary bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border-l-4 border-blue-500">
                                                            <strong className="text-blue-600 dark:text-blue-400">Seu comentário:</strong> {questionData.alternative_comments[alt.id]}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Anotações do Caderno de Erros */}
                                    {(questionData.user_note || questionData.user_explanation || questionData.key_points) && (
                                        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 border-2 border-border-light dark:border-border-dark shadow-lg">
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
                                                Suas Anotações
                                            </h3>

                                            {questionData.user_note && (
                                                <div className="mb-4">
                                                    <p className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                                        Por que errei
                                                    </p>
                                                    <div
                                                        className="text-sm text-text-light-primary dark:text-text-dark-primary prose prose-sm dark:prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: questionData.user_note }}
                                                    />
                                                </div>
                                            )}

                                            {questionData.user_explanation && (
                                                <div className="mb-4">
                                                    <p className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                                        Explicação
                                                    </p>
                                                    <div
                                                        className="text-sm text-text-light-primary dark:text-text-dark-primary prose prose-sm dark:prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: questionData.user_explanation }}
                                                    />
                                                </div>
                                            )}

                                            {questionData.key_points && questionData.key_points.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                                        Conceitos Chave
                                                    </p>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {questionData.key_points.map((point, idx) => (
                                                            <li key={idx} className="text-sm text-text-light-primary dark:text-text-dark-primary">
                                                                {point}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-primary text-5xl">
                                            error
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                                        Erro ao carregar questão
                                    </h3>
                                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-sm">
                                        Não foi possível carregar os dados da questão.
                                    </p>
                                </div>
                            )
                        ) : activeTab === 'history' ? (
                            history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-primary text-5xl">
                                            history
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                                        Nenhuma revisão ainda
                                    </h3>
                                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-sm">
                                        Esta questão ainda não foi revisada. Comece a estudar para ver seu histórico aqui.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="bg-background-light dark:bg-background-dark rounded-xl border-2 border-border-light dark:border-border-dark
                                                 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                 transition-all duration-300 hover:scale-[1.01] p-5"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${getGradeColor(entry.grade)}`}>
                                                            {getGradeLabel(entry.grade)}
                                                        </span>
                                                        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                                            {formatRelativeDate(entry.reviewed_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-medium">
                                                        {formatDate(entry.reviewed_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : activeTab === 'stats' ? (
                            <div className="space-y-6">
                                {/* Resumo Geral */}
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                                              rounded-xl p-5 border-2 border-primary/30 shadow-lg">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
                                        Resumo Geral
                                    </h3>
                                    <div className="text-center">
                                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                            Total de Revisões
                                        </p>
                                        <p className="text-5xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                            {totalReviews}
                                        </p>
                                    </div>
                                </div>

                                {/* Distribuição de Respostas */}
                                <div className="bg-background-light dark:bg-background-dark rounded-xl p-5 border-2 border-border-light dark:border-border-dark shadow-lg">
                                    <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider mb-4">
                                        Distribuição de Respostas
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Errou */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                    Errou
                                                </span>
                                                <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                    {history.filter(h => h.grade === 0).length} ({totalReviews > 0 ? ((history.filter(h => h.grade === 0).length / totalReviews) * 100).toFixed(1) : 0}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 transition-all duration-500"
                                                    style={{ width: `${totalReviews > 0 ? (history.filter(h => h.grade === 0).length / totalReviews) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Acertou */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                    Acertou
                                                </span>
                                                <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                    {correctReviews} ({accuracy.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 transition-all duration-500"
                                                    style={{ width: `${accuracy}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gráfico de Evolução */}
                                {history.length > 0 && (
                                    <div className="bg-background-light dark:bg-background-dark rounded-xl p-5 border-2 border-border-light dark:border-border-dark shadow-lg">
                                        <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider mb-4">
                                            Evolução das Respostas
                                        </h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={history.slice().reverse().map((entry, index) => ({
                                                    index: index + 1,
                                                    // Mapear: grade 0 → 0 (Errou), grade >= 1 → 2 (Acertou)
                                                    grade: entry.grade === 0 ? 0 : 2,
                                                    originalGrade: entry.grade,
                                                    date: formatDate(entry.reviewed_at),
                                                }))}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                                    <XAxis
                                                        dataKey="index"
                                                        stroke="#9ca3af"
                                                        style={{ fontSize: '12px' }}
                                                        label={{ value: 'Revisão', position: 'insideBottom', offset: -5 }}
                                                    />
                                                    <YAxis
                                                        stroke="#9ca3af"
                                                        style={{ fontSize: '10px' }}
                                                        domain={[0, 2]}
                                                        ticks={[0, 2]}
                                                        tickFormatter={(value) => value === 0 ? 'Errou' : 'Acertou'}
                                                        width={80}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#1f2937',
                                                            border: '1px solid #374151',
                                                            borderRadius: '8px',
                                                            fontSize: '12px'
                                                        }}
                                                        labelStyle={{ color: '#9ca3af' }}
                                                        labelFormatter={(label, payload) => {
                                                            if (payload && payload.length > 0) {
                                                                return payload[0].payload.date;
                                                            }
                                                            return `Revisão ${label}`;
                                                        }}
                                                        formatter={(value: any) => value === 0 ? 'Errou' : 'Acertou'}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="grade"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={3}
                                                        dot={(props: any) => {
                                                            const { cx, cy, payload } = props;
                                                            const color = payload.originalGrade === 0 ? '#ef4444' : '#10b981';
                                                            return (
                                                                <circle
                                                                    cx={cx}
                                                                    cy={cy}
                                                                    r={5}
                                                                    fill={color}
                                                                    stroke="#fff"
                                                                    strokeWidth={2}
                                                                />
                                                            );
                                                        }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}

export { QuestionReviewHistoryModal };
