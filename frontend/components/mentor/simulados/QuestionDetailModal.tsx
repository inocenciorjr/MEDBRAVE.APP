'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Alternative {
    id: string;
    text: string;
    isCorrect?: boolean;
}

interface QuestionDetailModalProps {
    question: {
        id: string;
        content: string;
        title?: string;
        options?: any[];
        correct_answer?: string;
        explanation?: string;
        professor_comment?: string;
        sub_filter_ids?: string[];
        is_annulled?: boolean;
        is_outdated?: boolean;
    };
    subFiltersMap: Map<string, string>;
    isAlreadyAdded?: boolean;
    onAdd: () => void;
    onClose: () => void;
}

export default function QuestionDetailModal({
    question,
    subFiltersMap,
    isAlreadyAdded = false,
    onAdd,
    onClose
}: QuestionDetailModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAdded, setIsAdded] = useState(isAlreadyAdded);

    useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => setIsAnimating(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleAddAndClose = () => {
        setIsAdded(true);
        onAdd();
        setTimeout(() => {
            handleClose();
        }, 500);
    };

    // Extrair informações dos filtros
    const getInstitution = () => {
        const institutionId = question.sub_filter_ids?.find(id => id.startsWith('Universidade_'));
        return institutionId ? subFiltersMap.get(institutionId) || institutionId.split('_').pop() : null;
    };

    const getYear = () => {
        const yearId = question.sub_filter_ids?.find(id => id.startsWith('Ano da Prova_'));
        return yearId ? yearId.match(/\d{4}/)?.[0] : null;
    };

    const getSpecialtyFilters = () => {
        const specialtyIds = (question.sub_filter_ids || []).filter(id =>
            !id.includes('Ano da Prova_') && !id.includes('Universidade_')
        );
        return specialtyIds.map(id => ({
            id,
            name: subFiltersMap.get(id) || id.split('_').pop()?.replace(/([A-Z])/g, ' $1').trim() || id
        }));
    };

    const institution = getInstitution();
    const year = getYear();
    const specialtyFilters = getSpecialtyFilters();
    const isHtmlContent = /<[a-z][\s\S]*>/i.test(question.content || '');

    // Processar alternativas
    const alternatives: Alternative[] = question.options?.map((opt: any, idx: number) => {
        // Usar letra (A, B, C, D) ao invés do ID
        const letter = String.fromCharCode(65 + idx);
        const text = typeof opt === 'string' ? opt : (opt.text || opt);
        const isCorrect = text === question.correct_answer || opt === question.correct_answer;

        return {
            id: letter,
            text: text,
            isCorrect: isCorrect
        };
    }) || [];

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{ zIndex: 99999 }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                style={{ zIndex: 100000 }}
            >
                <div
                    className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl dark:shadow-dark-2xl
            w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">quiz</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                    Detalhes da Questão
                                </h2>
                                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                    ID: {question.id.split('-').pop()?.toUpperCase() || question.id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl
                text-text-light-secondary dark:text-text-dark-secondary transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            {question.is_annulled && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                  rounded-lg text-xs text-red-700 dark:text-red-300 font-semibold">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        cancel
                                    </span>
                                    Questão Anulada
                                </span>
                            )}
                            {question.is_outdated && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 
                  rounded-lg text-xs text-orange-700 dark:text-orange-300 font-semibold">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        schedule
                                    </span>
                                    Questão Desatualizada
                                </span>
                            )}
                            {institution && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 
                  rounded-lg text-xs text-blue-700 dark:text-blue-300 font-medium">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        school
                                    </span>
                                    {institution}
                                </span>
                            )}
                            {year && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 
                  rounded-lg text-xs text-amber-700 dark:text-amber-300 font-medium">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        calendar_today
                                    </span>
                                    {year}
                                </span>
                            )}
                        </div>

                        {/* Specialty Filters */}
                        {specialtyFilters.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {specialtyFilters.map((filter, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg font-medium">
                                        {filter.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Question Content */}
                        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 
              border border-border-light dark:border-border-dark">
                            <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-3 
                flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">description</span>
                                Enunciado
                            </h3>
                            {isHtmlContent ? (
                                <div
                                    className="text-base text-text-light-primary dark:text-text-dark-primary 
                    prose prose-base dark:prose-invert max-w-none
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
                    [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4"
                                    dangerouslySetInnerHTML={{ __html: question.content }}
                                />
                            ) : (
                                <p className="text-base text-text-light-primary dark:text-text-dark-primary whitespace-pre-wrap leading-relaxed">
                                    {question.content}
                                </p>
                            )}
                        </div>

                        {/* Alternatives */}
                        {alternatives.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary 
                  flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">list</span>
                                    Alternativas
                                </h3>
                                <div className="space-y-2">
                                    {alternatives.map((alt) => (
                                        <div
                                            key={alt.id}
                                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${alt.isCorrect
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                                : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${alt.isCorrect
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                    {alt.id}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm ${alt.isCorrect
                                                        ? 'text-emerald-900 dark:text-emerald-100 font-medium'
                                                        : 'text-text-light-primary dark:text-text-dark-primary'
                                                        }`}>
                                                        {alt.text}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 
                border border-blue-200 dark:border-blue-800">
                                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 
                  flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">lightbulb</span>
                                    Explicação
                                </h3>
                                <div
                                    className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed
                                        prose prose-sm dark:prose-invert max-w-none
                                        prose-p:text-blue-900 dark:prose-p:text-blue-100
                                        prose-strong:text-blue-900 dark:prose-strong:text-blue-100
                                        prose-ul:text-blue-900 dark:prose-ul:text-blue-100
                                        prose-ol:text-blue-900 dark:prose-ol:text-blue-100"
                                    dangerouslySetInnerHTML={{ __html: question.explanation }}
                                />
                            </div>
                        )}

                        {/* Professor Comment */}
                        {question.professor_comment && (
                            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-6 
                border border-violet-200 dark:border-violet-800">
                                <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3 
                  flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">school</span>
                                    Comentário MedBrave
                                </h3>
                                <div
                                    className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed
                                        prose prose-sm dark:prose-invert max-w-none
                                        prose-p:text-violet-900 dark:prose-p:text-violet-100
                                        prose-strong:text-violet-900 dark:prose-strong:text-violet-100
                                        prose-ul:text-violet-900 dark:prose-ul:text-violet-100
                                        prose-ol:text-violet-900 dark:prose-ol:text-violet-100"
                                    dangerouslySetInnerHTML={{ __html: question.professor_comment }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-4 p-6 border-t border-border-light dark:border-border-dark
            bg-background-light/50 dark:bg-background-dark/50">
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl
                font-semibold text-text-light-primary dark:text-text-dark-primary
                hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleAddAndClose}
                            disabled={isAdded}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200
                                shadow-lg hover:shadow-xl flex items-center gap-2 ${isAdded
                                    ? 'bg-emerald-500 text-white cursor-default'
                                    : 'bg-primary text-white hover:bg-primary/90 shadow-primary/30'
                                }`}
                        >
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: isAdded ? "'FILL' 1" : "'FILL' 0" }}>
                                {isAdded ? 'check_circle' : 'add'}
                            </span>
                            {isAdded ? 'Adicionada!' : 'Adicionar ao Simulado'}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
