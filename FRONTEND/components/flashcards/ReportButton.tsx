'use client';

interface ReportButtonProps {
  cardId: string;
}

export function ReportButton({ cardId }: ReportButtonProps) {
  const handleReport = () => {
    // TODO: Implement report modal
    console.log('Report card:', cardId);
  };

  return (
    <button
      onClick={handleReport}
      className="fixed bottom-6 right-6 flex items-center gap-1.5 text-sm bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      aria-label="Reportar erro neste flashcard"
    >
      <span className="material-symbols-outlined text-base">warning</span>
      Reportar erro
    </button>
  );
}
