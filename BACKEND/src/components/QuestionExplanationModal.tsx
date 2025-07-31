import React, { useState, useEffect } from 'react';
import VisualExplanationRenderer from './VisualExplanationRenderer';
// import ValidationWarningCard from './ValidationWarningCard';

interface QuestionExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionData: {
    statement: string;
    alternatives: string[];
    correctAnswerIndex: number;
    specialty?: string;
    difficulty?: string;
    isAnnulled?: boolean;
    isOutdated?: boolean;
  };
}

interface ExplanationData {
  content: string;
  metadata: {
    generatedAt: string;
    model: string;
    confidence: number;
    hasVisualElements: boolean;
  };
  cached: boolean;
}

export const QuestionExplanationModal: React.FC<QuestionExplanationModalProps> = ({
  isOpen,
  onClose,
  questionId,
  questionData
}) => {
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<'positive' | 'negative' | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Gerar explicação quando modal abrir
  useEffect(() => {
    if (isOpen && questionId && !explanation) {
      generateExplanation();
    }
  }, [isOpen, questionId]);

  const generateExplanation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pulse-ai/generate-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questionId,
          questionData
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar explicação');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!userRating || !explanation) return;

    try {
      await fetch('/api/pulse-ai/rate-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questionId,
          rating: userRating,
          comment: ratingComment.trim() || undefined,
          explanationMetadata: explanation.metadata
        })
      });

      setShowRatingForm(false);
      // Mostrar feedback de sucesso
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                🧠 Explicação Educativa com IA
              </h2>
              <p className="text-sm text-gray-600">
                Análise completa com elementos visuais e fluxogramas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4 text-2xl">⟳</div>
                <p className="text-gray-600">
                  🎨 Gerando explicação com elementos visuais...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Incluindo fluxogramas, diagramas e tabelas educativas
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-800">❌ {error}</p>
              <button
                onClick={generateExplanation}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {explanation && (
            <div className="space-y-6">
              {/* Metadata */}
              <div className="bg-gray-50 rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">👁️</span>
                    <span className="text-sm font-medium text-gray-700">
                      Informações da Explicação
                    </span>
                  </div>
                  {explanation.cached && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      📋 Cache
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Modelo:</span>
                    <p className="font-medium">{explanation.metadata.model}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Confiança:</span>
                    <p className="font-medium">{explanation.metadata.confidence}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Elementos Visuais:</span>
                    <p className="font-medium">
                      {explanation.metadata.hasVisualElements ? '🎨 Sim' : '📝 Não'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gerado em:</span>
                    <p className="font-medium">
                      {new Date(explanation.metadata.generatedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Explanation Content */}
              <div className="bg-white border rounded-xl p-6">
                <VisualExplanationRenderer 
                  content={explanation.content}
                  className="max-w-none"
                />
              </div>

              {/* Rating Section */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-blue-600">💬</span>
                  <span className="font-medium text-blue-900">
                    Avalie esta explicação
                  </span>
                </div>
                
                {!showRatingForm ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setUserRating('positive');
                        setShowRatingForm(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-xl"
                    >
                      <span>👍</span>
                      <span>Útil</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserRating('negative');
                        setShowRatingForm(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl"
                    >
                      <span>👎</span>
                      <span>Não útil</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {userRating === 'positive' ? (
                        <span className="text-green-600">👍</span>
                      ) : (
                        <span className="text-red-600">👎</span>
                      )}
                      <span className="text-sm text-gray-700">
                        {userRating === 'positive' 
                          ? 'Obrigado! Quer nos contar o que foi mais útil?' 
                          : 'Que pena! Como podemos melhorar?'
                        }
                      </span>
                    </div>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Comentário opcional..."
                      className="w-full p-3 border rounded-xl resize-none"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={submitRating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                      >
                        Enviar Avaliação
                      </button>
                      <button
                        onClick={() => setShowRatingForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 <strong>Dica:</strong> Use os fluxogramas e diagramas para visualizar melhor os conceitos
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionExplanationModal;