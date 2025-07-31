import React from 'react';
// import { AlertTriangle, Brain, FileQuestion } from 'lucide-react';

interface ValidationWarningCardProps {
  validation: {
    performed: boolean;
    aiAnalysisMatch: boolean;
    markedAnswer: string;
    aiSuggestedAnswer: string | null;
    hasDiscrepancy: boolean;
    warning: string | null;
  };
}

export const ValidationWarningCard: React.FC<ValidationWarningCardProps> = ({
  validation
}) => {
  if (!validation.performed || !validation.hasDiscrepancy) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-amber-400 text-lg">⚠️</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            🔍 Divergência na Análise Detectada
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">📋</span>
                  <span className="font-medium">Resposta Marcada:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                    {validation.markedAnswer}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">🧠</span>
                  <span className="font-medium">IA Sugere:</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-mono">
                    {validation.aiSuggestedAnswer}
                  </span>
                </div>
              </div>
              
              {validation.warning && (
                <div className="mt-3 p-3 bg-amber-100 rounded border">
                  <p className="text-xs text-amber-800">
                    <strong>Análise da IA:</strong> {validation.warning}
                  </p>
                </div>
              )}
              
              <div className="mt-3 text-xs text-amber-600">
                <p>
                  <strong>⚠️ O que isso significa:</strong> A IA identificou uma possível 
                  divergência entre a resposta marcada como correta e sua análise 
                  independente. A explicação abaixo foi adaptada para abordar essa discrepância.
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>A explicação focará na resposta marcada como correta</li>
                  <li>Possíveis controvérsias ou interpretações alternativas serão discutidas</li>
                  <li>Mantenha senso crítico e consulte fontes atualizadas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationWarningCard; 