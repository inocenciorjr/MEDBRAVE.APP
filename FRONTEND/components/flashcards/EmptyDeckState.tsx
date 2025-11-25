'use client';

interface EmptyDeckStateProps {
  onCreateFlashcard: () => void;
  isPreview?: boolean;
}

export function EmptyDeckState({ onCreateFlashcard, isPreview = false }: EmptyDeckStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full space-y-6">
        {/* Icon with glow effect */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl" />
            <div className="relative p-8 bg-gradient-to-br from-primary/10 to-primary/5 
                          dark:from-primary/20 dark:to-primary/10 rounded-3xl 
                          shadow-2xl dark:shadow-dark-2xl">
              <span className="material-symbols-outlined text-primary text-7xl">
                {isPreview ? 'visibility_off' : 'add_circle'}
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3">
          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {isPreview ? 'Deck Vazio' : 'Nenhum Flashcard Ainda'}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
            {isPreview 
              ? 'Este deck ainda não possui flashcards. Crie o primeiro flashcard para começar a estudar!'
              : 'Comece adicionando seu primeiro flashcard para este deck.'
            }
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border-2 border-primary/20 
                      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                      transition-all duration-300">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg 
                          flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-primary text-xl">
                lightbulb
              </span>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <p className="font-semibold text-primary">Dica:</p>
              <ul className="space-y-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Adicione perguntas na frente e respostas no verso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Use tags para organizar seus flashcards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Você pode adicionar múltiplos cards de uma vez</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onCreateFlashcard}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary/90 
                   hover:from-primary/90 hover:to-primary text-white rounded-xl 
                   font-semibold shadow-xl hover:shadow-2xl dark:shadow-dark-xl 
                   dark:hover:shadow-dark-2xl transition-all duration-300 
                   hover:scale-[1.02] flex items-center justify-center gap-3 group"
        >
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
            add
          </span>
          <span>Criar Primeiro Flashcard</span>
        </button>
      </div>
    </div>
  );
}
