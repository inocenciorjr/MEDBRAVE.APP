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
    <div className="h-full w-full flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
        <h3 className="text-base font-bold text-text-light-primary dark:text-text-dark-primary">
          {title}
        </h3>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div
          className="text-sm leading-relaxed text-text-light-secondary dark:text-text-dark-secondary"
          dangerouslySetInnerHTML={{ __html: highlightText() }}
        />
      </div>

      {/* Lista de palavras - footer fixo */}
      <div className="border-t border-border-light dark:border-border-dark px-5 py-4 bg-surface-light dark:bg-surface-dark flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
            Palavras
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {foundWords.length}/{words.length}
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
  );
}
