'use client';

import { useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import { MedBraveLoader } from './MedBraveLoader';

export default function ToastLoaderDemo() {
  const toast = useToast();
  const [showLoader, setShowLoader] = useState(false);
  const [loaderVariant, setLoaderVariant] = useState<'morphing' | 'particles' | 'breathing'>('breathing');
  const [loaderSize, setLoaderSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  return (
    <div className="p-8 space-y-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-text-light-primary dark:text-text-dark-primary">
          Sistema de Toast e Loader
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mb-8">
          Demonstração dos componentes de notificação e loading
        </p>

        {/* Toast Examples */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            🎉 Toasts
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => toast.success('Operação realizada com sucesso!')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Success Toast
            </button>
            <button
              onClick={() => toast.error('Ops! Algo deu errado.')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Error Toast
            </button>
            <button
              onClick={() => toast.warning('Atenção! Verifique os dados.')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Warning Toast
            </button>
            <button
              onClick={() => toast.info('Informação importante para você.')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Info Toast
            </button>
          </div>
        </div>

        {/* Loader Examples */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            ⚡ Loaders Animados
          </h2>
          
          {/* Variant Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text-light-secondary dark:text-text-dark-secondary">
              Escolha o estilo:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLoaderVariant('breathing')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  loaderVariant === 'breathing'
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary'
                }`}
              >
                Breathing (Padrão)
              </button>
              <button
                onClick={() => setLoaderVariant('morphing')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  loaderVariant === 'morphing'
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary'
                }`}
              >
                Morphing
              </button>
              <button
                onClick={() => setLoaderVariant('particles')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  loaderVariant === 'particles'
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary'
                }`}
              >
                Particles
              </button>
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text-light-secondary dark:text-text-dark-secondary">
              Tamanho:
            </label>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setLoaderSize(size)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    loaderSize === size
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary'
                  }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Loader Preview */}
          <div className="bg-background-light dark:bg-background-dark rounded-lg p-12 flex items-center justify-center mb-4">
            <MedBraveLoader 
              variant={loaderVariant}
              size={loaderSize}
              text="Carregando dados..."
            />
          </div>

          {/* Fullscreen Demo */}
          <button
            onClick={() => {
              setShowLoader(true);
              setTimeout(() => setShowLoader(false), 3000);
            }}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Testar Fullscreen (3s)
          </button>
        </div>

        {/* Descriptions */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-lg mt-8">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            📖 Descrição dos Estilos
          </h2>
          <div className="space-y-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div>
              <strong className="text-text-light-primary dark:text-text-dark-primary">Breathing (Padrão):</strong>
              <p>Efeito suave de respiração com brilho pulsante e anéis concêntricos. Ideal para carregamentos gerais.</p>
            </div>
            <div>
              <strong className="text-text-light-primary dark:text-text-dark-primary">Morphing:</strong>
              <p>Logo com fade e círculos morphing ao fundo, com anéis orbitais. Perfeito para transições de página.</p>
            </div>
            <div>
              <strong className="text-text-light-primary dark:text-text-dark-primary">Particles:</strong>
              <p>Partículas que explodem e se reagrupam com anel de energia. Ótimo para operações de processamento.</p>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-lg mt-8">
          <h2 className="text-xl font-semibold mb-4 text-text-light-primary dark:text-text-dark-primary">
            💻 Como Usar
          </h2>
          <pre className="bg-background-light dark:bg-background-dark p-4 rounded-lg overflow-x-auto text-xs">
{`// Toast
import { useToast } from '@/lib/contexts/ToastContext';

const toast = useToast();
toast.success('Sucesso!');
toast.error('Erro!');
toast.warning('Atenção!');
toast.info('Info!');

// Loader
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';

// Inline
<MedBraveLoader 
  variant="breathing" 
  size="md" 
  text="Carregando..." 
/>

// Fullscreen
<MedBraveLoader 
  fullScreen 
  variant="particles"
  text="Processando dados..." 
/>`}
          </pre>
        </div>
      </div>

      {/* Fullscreen Loader */}
      {showLoader && (
        <MedBraveLoader 
          fullScreen 
          variant={loaderVariant}
          text="Demonstração de loader fullscreen..."
        />
      )}
    </div>
  );
}
