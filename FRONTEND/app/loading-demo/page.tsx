'use client';

import { LoadingAnimation } from '@/components/ui/LoadingAnimation';
import { PageLoader } from '@/components/ui/PageLoader';
import { InlineLoader } from '@/components/ui/InlineLoader';
import { useState } from 'react';

export default function LoadingDemoPage() {
    const [showPageLoader, setShowPageLoader] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black p-8">
            <div className="space-y-12">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Demonstração de Loading
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Animação do logo em diferentes tamanhos
                    </p>
                </div>

                {/* Tamanhos da Animação */}
                <section className="bg-white dark:bg-surface-dark rounded-2xl p-8 shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                        Tamanhos Disponíveis
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Small */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Small (sm)
                            </h3>
                            <LoadingAnimation size="sm" />
                            <code className="text-xs text-gray-500 dark:text-gray-400">
                                96x96px
                            </code>
                        </div>

                        {/* Medium */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Medium (md)
                            </h3>
                            <LoadingAnimation size="md" />
                            <code className="text-xs text-gray-500 dark:text-gray-400">
                                128x128px
                            </code>
                        </div>

                        {/* Large */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Large (lg)
                            </h3>
                            <LoadingAnimation size="lg" />
                            <code className="text-xs text-gray-500 dark:text-gray-400">
                                192x192px
                            </code>
                        </div>

                        {/* Extra Large */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl md:col-span-2">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Extra Large (xl)
                            </h3>
                            <LoadingAnimation size="xl" />
                            <code className="text-xs text-gray-500 dark:text-gray-400">
                                256x256px
                            </code>
                        </div>

                        {/* Full */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Full (full)
                            </h3>
                            <div className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                <LoadingAnimation size="full" />
                            </div>
                            <code className="text-xs text-gray-500 dark:text-gray-400">
                                100% do container
                            </code>
                        </div>
                    </div>
                </section>

                {/* Velocidades */}
                <section className="bg-white dark:bg-surface-dark rounded-2xl p-8 shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                        Velocidades Diferentes
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Pequeno
                            </h3>
                            <LoadingAnimation size="sm" />
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Médio
                            </h3>
                            <LoadingAnimation size="md" />
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                Grande
                            </h3>
                            <LoadingAnimation size="lg" />
                        </div>
                    </div>
                </section>

                {/* Componentes Prontos */}
                <section className="bg-white dark:bg-surface-dark rounded-2xl p-8 shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                        Componentes Prontos
                    </h2>

                    <div className="space-y-8">
                        {/* InlineLoader */}
                        <div className="p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                                InlineLoader (para cards, modais, etc)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InlineLoader message="Carregando..." size="sm" />
                                <InlineLoader message="Processando..." size="md" />
                                <InlineLoader message="Aguarde..." size="lg" />
                            </div>
                        </div>

                        {/* PageLoader */}
                        <div className="p-6 bg-gray-50 dark:bg-background-dark rounded-xl">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                                PageLoader (tela inteira)
                            </h3>
                            <button
                                onClick={() => setShowPageLoader(true)}
                                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                Mostrar PageLoader
                            </button>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                Clique para ver o loading de página inteira (fecha automaticamente em 3s)
                            </p>
                        </div>
                    </div>
                </section>

                {/* Exemplos de Uso */}
                <section className="bg-white dark:bg-surface-dark rounded-2xl p-8 shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                        Exemplos de Código
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100">
                                <code>{`// Animação básica
import { LoadingAnimation } from '@/components/ui/LoadingAnimation';

<LoadingAnimation size="md" />`}</code>
                            </pre>
                        </div>

                        <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100">
                                <code>{`// Loading inline
import { InlineLoader } from '@/components/ui/InlineLoader';

<InlineLoader message="Carregando..." size="sm" />`}</code>
                            </pre>
                        </div>

                        <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100">
                                <code>{`// Loading de página inteira
import { PageLoader } from '@/components/ui/PageLoader';

<PageLoader message="Carregando dados..." size="lg" />`}</code>
                            </pre>
                        </div>
                    </div>
                </section>
            </div>

            {/* PageLoader Modal */}
            {showPageLoader && (
                <>
                    <PageLoader message="Carregando página..." size="lg" />
                    {setTimeout(() => setShowPageLoader(false), 3000)}
                </>
            )}
        </div>
    );
}
