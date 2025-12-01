'use client';

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onRemove: () => void;
  onExtendTime: () => void;
  onSendMessage: () => void;
}

export default function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onRemove,
  onExtendTime,
  onSendMessage,
}: BatchActionsBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-primary text-white rounded-2xl p-4 shadow-xl shadow-primary/30
      animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClearSelection}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <span className="font-semibold">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSendMessage}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30
              rounded-xl font-medium transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            <span className="hidden sm:inline">Enviar Recado</span>
          </button>
          
          <button
            onClick={onExtendTime}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30
              rounded-xl font-medium transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">schedule</span>
            <span className="hidden sm:inline">Estender Tempo</span>
          </button>
          
          <button
            onClick={onRemove}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600
              rounded-xl font-medium transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">person_remove</span>
            <span className="hidden sm:inline">Remover</span>
          </button>
        </div>
      </div>
    </div>
  );
}
