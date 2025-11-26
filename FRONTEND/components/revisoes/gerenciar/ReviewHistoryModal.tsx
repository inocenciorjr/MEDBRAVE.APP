'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ReviewHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviewId: string;
    reviewTitle: string;
    reviewType: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
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

interface ReviewStats {
    totalReviews: number;
    averageGrade: number;
    lastReview: string | null;
    nextReview: string | null;
    currentStreak: number;
    longestStreak: number;
    gradeDistribution: {
        again: number;
        hard: number;
        good: number;
        easy: number;
    };
}

function ReviewHistoryModal({
    isOpen,
    onClose,
    reviewId,
    reviewTitle,
    reviewType
}: ReviewHistoryModalProps) {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');
    const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [showTitleTooltip, setShowTitleTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const titleRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
            loadHistory();
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
                setHistory([]);
                setStats(null);
                setExpandedEntries(new Set());
                setActiveTab('timeline');
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const loadHistory = async () => {
        if (!reviewId || reviewId === 'undefined') {
            console.error('[ReviewHistoryModal] reviewId inválido:', reviewId);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            console.log('[ReviewHistoryModal] Carregando histórico para reviewId:', reviewId);
            const response = await fetch(`/api/unified-reviews/history/${reviewId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) throw new Error('Erro ao carregar histórico');

            const result = await response.json();
            console.log('[ReviewHistoryModal] Resposta do backend:', result);
            const historyData = result.data?.history || result.history || [];
            console.log('[ReviewHistoryModal] Histórico carregado:', historyData);
            setHistory(historyData);
            calculateStats(historyData);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStats = (historyData: ReviewHistoryEntry[]) => {
        if (historyData.length === 0) {
            setStats(null);
            return;
        }

        console.log('[calculateStats] historyData:', historyData);
        console.log('[calculateStats] grades:', historyData.map(h => h.grade));

        const gradeDistribution = {
            again: historyData.filter(h => h.grade === 0).length,
            hard: historyData.filter(h => h.grade === 1).length,
            good: historyData.filter(h => h.grade === 2).length,
            easy: historyData.filter(h => h.grade === 3).length,
        };

        console.log('[calculateStats] gradeDistribution:', gradeDistribution);

        const totalGrades = historyData.reduce((sum, h) => sum + h.grade, 0);
        const averageGrade = totalGrades / historyData.length;

        // Calcular streaks
        // A sequência deve considerar apenas revisões no estado "Review" (state 2)
        // e com grade >= 2 (good ou easy)
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        const sortedHistory = [...historyData].sort((a, b) =>
            new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
        );

        for (let i = 0; i < sortedHistory.length; i++) {
            const entry = sortedHistory[i];
            // Considerar apenas revisões no estado "Review" (state 2) com grade >= 2
            if (entry.state === 2 && entry.grade >= 2) {
                tempStreak++;
                if (i === 0) currentStreak = tempStreak;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                // Se encontrou um erro ou estado diferente de Review, resetar streak temporário
                if (i === 0) currentStreak = 0;
                tempStreak = 0;
            }
        }

        setStats({
            totalReviews: historyData.length,
            averageGrade,
            lastReview: historyData[0]?.reviewed_at || null,
            nextReview: null,
            currentStreak,
            longestStreak,
            gradeDistribution,
        });
    };

    const toggleEntry = (entryId: string) => {
        setExpandedEntries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(entryId)) {
                newSet.delete(entryId);
            } else {
                newSet.add(entryId);
            }
            return newSet;
        });
    };

    const getGradeLabel = (grade: number) => {
        // Para questões, só mostra Errou/Acertou
        if (reviewType === 'QUESTION') {
            switch (grade) {
                case 0: return 'Errou';
                case 2: return 'Acertou';
                default: return 'Desconhecido';
            }
        }

        // Para flashcards e caderno de erros
        switch (grade) {
            case 0: return 'Não lembrei!';
            case 1: return 'Lembrei, mas achei difícil!';
            case 2: return 'Quase consolidado na mente...';
            case 3: return 'Acertei com confiança!';
            default: return 'Desconhecido';
        }
    };

    const getGradeColor = (grade: number) => {
        switch (grade) {
            case 0: return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 1: return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/20 border-gray-300 dark:border-gray-700';
            case 2: return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
            case 3: return 'text-purple-900 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/30 border-purple-300 dark:border-purple-900';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
        }
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
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffMs = nowOnly.getTime() - dateOnly.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays} dias atrás`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
        return `${Math.floor(diffDays / 365)} anos atrás`;
    };

    // Preparar dados para o gráfico
    const chartData = history
        .slice()
        .reverse()
        .map((entry, index) => ({
            index: index + 1,
            grade: entry.grade,
            stability: entry.stability,
            difficulty: entry.difficulty,
            date: formatDate(entry.reviewed_at),
        }));

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
                className={`fixed right-0 top-0 h-full w-full md:w-[700px] bg-surface-light dark:bg-surface-dark 
                           shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                                Histórico de Revisões
                            </h2>
                            {reviewType === 'FLASHCARD' ? (
                                // Flashcard: Formatar hierarquia
                                (() => {
                                    const parts = reviewTitle.split(' / ');
                                    if (parts.length >= 2) {
                                        const collection = parts[0];
                                        const deckPath = parts.slice(1, -1).join(' › ');
                                        const rawCardNumber = parts[parts.length - 1];

                                        const numericValue = parseInt(rawCardNumber);
                                        const cardNumber = !isNaN(numericValue)
                                            ? String(numericValue + 1)
                                            : rawCardNumber;

                                        return (
                                            <div className="mt-1 space-y-0.5">
                                                <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
                                                    {collection}
                                                </p>
                                                {deckPath && (
                                                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                                                        {deckPath}
                                                    </p>
                                                )}
                                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                                    Flashcard Nº {cardNumber}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 truncate">
                                            {reviewTitle}
                                        </p>
                                    );
                                })()
                            ) : (
                                <p
                                    ref={titleRef}
                                    className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 truncate cursor-help"
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltipPosition({
                                            top: rect.top - 10,
                                            left: rect.left
                                        });
                                        setShowTitleTooltip(true);
                                    }}
                                    onMouseLeave={() => setShowTitleTooltip(false)}
                                    title={reviewTitle}
                                >
                                    {reviewTitle}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                                     transition-all duration-200 hover:scale-110 group ml-4"
                        >
                            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                           group-hover:text-primary transition-colors">
                                close
                            </span>
                        </button>
                    </div>



                    {/* Tabs */}
                    <div className="flex border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all duration-200 relative
                                     ${activeTab === 'timeline'
                                    ? 'text-primary'
                                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-primary'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-xl">schedule</span>
                                Timeline
                            </span>
                            {activeTab === 'timeline' && (
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
                        ) : history.length === 0 ? (
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
                                    Este item ainda não foi revisado. Comece a estudar para ver seu histórico aqui.
                                </p>
                            </div>
                        ) : activeTab === 'timeline' ? (
                            <div className="space-y-4">
                                {history.map((entry, index) => (
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
                        ) : (
                            <div className="space-y-6">
                                {/* Resumo Geral */}
                                {stats && (
                                    <>
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
                                                    {stats.totalReviews}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Distribuição de Avaliações */}
                                        <div className="bg-background-light dark:bg-background-dark rounded-xl p-5 border-2 border-border-light dark:border-border-dark shadow-lg">
                                            <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider mb-4">
                                                Distribuição de Avaliações
                                            </h3>
                                            <div className="space-y-4">
                                                {/* Errou / Não lembrei */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                            {reviewType === 'QUESTION' ? 'Errou' : 'Não lembrei!'}
                                                        </span>
                                                        <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                            {stats.gradeDistribution.again} ({((stats.gradeDistribution.again / stats.totalReviews) * 100).toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-500 transition-all duration-500"
                                                            style={{ width: `${(stats.gradeDistribution.again / stats.totalReviews) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Difícil - Só para flashcards/caderno */}
                                                {reviewType !== 'QUESTION' && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                                Lembrei, mas achei difícil!
                                                            </span>
                                                            <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                                {stats.gradeDistribution.hard} ({((stats.gradeDistribution.hard / stats.totalReviews) * 100).toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gray-600 transition-all duration-500"
                                                                style={{ width: `${(stats.gradeDistribution.hard / stats.totalReviews) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Acertou / Quase consolidado */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                                            {reviewType === 'QUESTION' ? 'Acertou' : 'Quase consolidado na mente...'}
                                                        </span>
                                                        <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                            {stats.gradeDistribution.good} ({((stats.gradeDistribution.good / stats.totalReviews) * 100).toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-purple-500 transition-all duration-500"
                                                            style={{ width: `${(stats.gradeDistribution.good / stats.totalReviews) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Acertei com confiança - Só para flashcards/caderno */}
                                                {reviewType !== 'QUESTION' && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                                                                Acertei com confiança!
                                                            </span>
                                                            <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                                                {stats.gradeDistribution.easy} ({((stats.gradeDistribution.easy / stats.totalReviews) * 100).toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-purple-900 transition-all duration-500"
                                                                style={{ width: `${(stats.gradeDistribution.easy / stats.totalReviews) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Gráfico de Evolução */}
                                        {chartData.length > 0 && (
                                            <div className="bg-background-light dark:bg-background-dark rounded-xl p-5 border-2 border-border-light dark:border-border-dark shadow-lg">
                                                <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider mb-4">
                                                    Evolução das Avaliações
                                                </h3>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={chartData}>
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
                                                                domain={[0, 3]}
                                                                ticks={[0, 1, 2, 3]}
                                                                tickFormatter={(value) => {
                                                                    if (reviewType === 'QUESTION') {
                                                                        return value === 0 ? 'Errou' : value === 2 ? 'Acertou' : '';
                                                                    }
                                                                    const labels = ['Não lembrei', 'Difícil', 'Quase consolidado', 'Com confiança'];
                                                                    return labels[value] || '';
                                                                }}
                                                                width={100}
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
                                                                formatter={(value: any) => {
                                                                    if (reviewType === 'QUESTION') {
                                                                        return value === 0 ? 'Errou' : value === 2 ? 'Acertou' : '';
                                                                    }
                                                                    const labels = ['Não lembrei!', 'Lembrei, mas achei difícil!', 'Quase consolidado na mente...', 'Acertei com confiança!'];
                                                                    return labels[value] || '';
                                                                }}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="grade"
                                                                stroke="#8b5cf6"
                                                                strokeWidth={3}
                                                                dot={(props: any) => {
                                                                    const { cx, cy, payload } = props;
                                                                    const colors = ['#ef4444', '#6b7280', '#a855f7', '#581c87'];
                                                                    return (
                                                                        <circle
                                                                            cx={cx}
                                                                            cy={cy}
                                                                            r={5}
                                                                            fill={colors[payload.grade] || '#8b5cf6'}
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


                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}


export { ReviewHistoryModal };
