'use client';

import { useState, useEffect } from 'react';
import { Flashcard } from '@/types/flashcards';
import Image from 'next/image';
import { EmptyDeckState } from './EmptyDeckState';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckName: string;
    deckTags?: string[];
    flashcards: Flashcard[];
    onStartStudy: () => void;
    onCreateFlashcard?: () => void;
    canEdit?: boolean; // Se o usuário pode editar
}

export function PreviewModal({
    isOpen,
    onClose,
    deckName,
    deckTags = [],
    flashcards,
    onStartStudy,
    onCreateFlashcard,
    canEdit = true,
}: PreviewModalProps) {
    const [showAnswers, setShowAnswers] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleCloseWithAnimation = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleStartStudyWithAnimation = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
            setTimeout(() => onStartStudy(), 50);
        }, 300);
    };

    if (!shouldRender) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleCloseWithAnimation}
            />

            {/* Modal - Slide from right */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[90%] lg:w-[80%] xl:w-[70%] bg-surface-light dark:bg-surface-dark shadow-2xl dark:shadow-dark-2xl z-[60] transform transition-transform duration-300 ease-out flex flex-col ${
                    isAnimating ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border-light dark:border-border-dark">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-2 truncate">
                            {deckName}
                        </h2>

                        {/* Tags */}
                        {deckTags.length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {deckTags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary px-2.5 py-1 rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {flashcards.length} flashcards disponíveis
                        </p>
                    </div>

                    <button
                        onClick={handleCloseWithAnimation}
                        className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors ml-4 flex-shrink-0"
                        aria-label="Fechar"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Content - Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {flashcards.length === 0 ? (
                        <EmptyDeckState 
                            onCreateFlashcard={() => {
                                handleCloseWithAnimation();
                                setTimeout(() => onCreateFlashcard?.(), 350);
                            }}
                            isPreview={true}
                        />
                    ) : (
                    <div className="space-y-6">
                        {flashcards.map((card, index) => (
                            <div
                                key={card.id}
                                className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr] gap-4 lg:gap-6 border-b border-border-light dark:border-border-dark pb-6 last:border-b-0"
                            >
                                {/* Card Number */}
                                <div className="flex lg:items-start items-center lg:justify-center justify-start pt-1">
                                    <span className="text-base font-semibold text-slate-500 dark:text-slate-400 min-w-[2rem] lg:text-center">
                                        {index + 1}
                                    </span>
                                </div>

                                {/* Question */}
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Questão
                                    </h3>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {card.isHtml ? (
                                            <div
                                                dangerouslySetInnerHTML={{ __html: card.front }}
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap">{card.front}</p>
                                        )}

                                        {/* Question Images */}
                                        {card.images && card.images.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                {card.images.map((img, imgIndex) => (
                                                    <div key={imgIndex} className="relative w-full">
                                                        <Image
                                                            src={img}
                                                            alt={`Imagem da questão ${imgIndex + 1}`}
                                                            width={500}
                                                            height={350}
                                                            className="rounded-lg border border-border-light dark:border-border-dark w-full h-auto object-contain"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Answer */}
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Resposta
                                    </h3>
                                    <div
                                        className={`text-sm rounded-lg p-4 transition-all duration-200 ${showAnswers
                                            ? 'bg-primary/5 dark:bg-primary/10 text-slate-600 dark:text-slate-300'
                                            : 'bg-slate-100 dark:bg-slate-800'
                                            }`}
                                    >
                                        {showAnswers ? (
                                            <>
                                                {card.isHtml ? (
                                                    <div
                                                        dangerouslySetInnerHTML={{ __html: card.back }}
                                                        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                                                    />
                                                ) : (
                                                    <p className="whitespace-pre-wrap leading-relaxed">{card.back}</p>
                                                )}

                                                {/* Answer Images */}
                                                {card.images && card.images.length > 0 && (
                                                    <div className="mt-4 space-y-3">
                                                        {card.images.map((img, imgIndex) => (
                                                            <div key={imgIndex} className="relative w-full">
                                                                <Image
                                                                    src={img}
                                                                    alt={`Imagem da resposta ${imgIndex + 1}`}
                                                                    width={500}
                                                                    height={350}
                                                                    className="rounded-lg border border-border-light dark:border-border-dark w-full h-auto object-contain"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="h-20 flex items-center justify-center">
                                                <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                                                    Resposta oculta
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 sm:p-6 border-t border-border-light dark:border-border-dark gap-3 sm:gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    {/* Left side - Edit button (só se pode editar) */}
                    {canEdit && onCreateFlashcard && (
                        <button
                            onClick={() => {
                                handleCloseWithAnimation();
                                setTimeout(() => onCreateFlashcard?.(), 350);
                            }}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-all hover:shadow-md"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            Editar
                        </button>
                    )}

                    {/* Right side - Toggle answers and study button */}
                    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${!canEdit ? 'w-full sm:justify-end' : ''}`}>
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            disabled={flashcards.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-lg">
                                {showAnswers ? 'visibility_off' : 'visibility'}
                            </span>
                            {showAnswers ? 'Esconder Resposta' : 'Mostrar Resposta'}
                        </button>

                        <button
                            onClick={handleStartStudyWithAnimation}
                            disabled={flashcards.length === 0}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-lg"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            Estudar deck
                        </button>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}
