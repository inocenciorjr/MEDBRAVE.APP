'use client';

import { useState } from 'react';

interface StylesPanelProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

const AVAILABLE_TAGS = [
  'Conduta',
  'Diagnóstico',
  'Tratamento',
  'Prognóstico',
  'Epidemiologia',
  'Fisiopatologia',
];

export function StylesPanel({ tags, onAddTag, onRemoveTag }: StylesPanelProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  const availableTags = AVAILABLE_TAGS.filter(tag => !tags.includes(tag));

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl p-6">
      <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        Minhas Tags:
      </h3>

      {/* Current Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              onRemove={onRemoveTag ? () => onRemoveTag(tag) : undefined}
            />
          ))}
        </div>
      )}

      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {(showAllTags ? availableTags : availableTags.slice(0, 2)).map((tag) => (
          <button
            key={tag}
            onClick={() => onAddTag(tag)}
            className="flex items-center gap-1 px-3 py-1.5 bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors shadow-sm text-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>{tag}</span>
          </button>
        ))}
        
        {availableTags.length > 2 && !showAllTags && (
          <button
            onClick={() => setShowAllTags(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors shadow-sm text-sm"
          >
            <span className="material-symbols-outlined text-base">more_horiz</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-lg text-sm font-medium">
      <span>{tag}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-primary/70 transition-colors"
          aria-label={`Remover tag ${tag}`}
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
}
