'use client';

interface ContextPanelProps {
  title: string;
  contextText: string;
  words: string[];
  foundWords: string[];
}

export function ContextPanel({ title, contextText, words, foundWords }: ContextPanelProps) {
  // Função para destacar palavras e formatar texto
  const highlightText = () => {
    let result = contextText;

    // Primeiro: converter **texto** em negrito
    result = result.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-bold text-text-light-primary dark:text-text-dark-primary">$1</strong>'
    );

    // Segundo: destacar palavras a serem encontradas (apenas primeira ocorrência, com word boundary)
    words.forEach((word) => {
      const isFound = foundWords.includes(word);
      // Usar word boundary (\b) para não pegar palavras dentro de outras
      // e substituir apenas a primeira ocorrência
      const regex = new RegExp(`\\b(${word})\\b`, 'i');
      const className = isFound
        ? 'bg-emerald-500 text-white px-1.5 py-0.5 rounded-md font-semibold'
        : 'bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-semibold border border-primary/30';

      result = result.replace(regex, `<span class="${className}">$1</span>`);
    });

    // Converter quebras de linha em <br>
    result = result.replace(/\n/g, '<br/>');

    return result;
  };

  return (
    <div className="w-full bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-light-primary dark:text-text-dark-primary">
            {title}
          </h3>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {foundWords.length}/{words.length} palavras
          </span>
        </div>
      </div>

      {/* Conteúdo - texto + palavras */}
      <div className="px-5 py-4">
        {/* Texto da atualização */}
        <div
          className="text-sm leading-relaxed text-text-light-secondary dark:text-text-dark-secondary mb-6"
          dangerouslySetInnerHTML={{ __html: highlightText() }}
        />

        {/* Lista de palavras - após o texto */}
        <div className="pt-4 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
              Palavras para encontrar
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {words.map((word) => {
              const isFound = foundWords.includes(word);
              return (
                <span
                  key={word}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isFound
                      ? 'bg-emerald-500 text-white'
                      : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary'
                  }`}
                >
                  {isFound ? `✓ ${word}` : word}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
