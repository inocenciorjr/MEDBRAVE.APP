import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { unifiedReviewService } from '../../services/unifiedReviewService';

const RemoveReviewModal = ({ 
  isOpen, 
  onClose, 
  reviewItem, 
  onRemoveComplete 
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen || !reviewItem) return null;

  const handleRemove = async () => {
    setIsRemoving(true);
    
    try {
      // Chamar API para remover a revisão
      await unifiedReviewService.removeReview(reviewItem.id, reviewItem.contentType);

      // Notificar sucesso
      onRemoveComplete(reviewItem);
      onClose();
    } catch (error) {
      console.error('Erro ao remover revisão:', error);
      alert('Erro ao remover revisão. Tente novamente.');
    } finally {
      setIsRemoving(false);
    }
  };

  const getTypeLabel = (contentType) => {
    const labels = {
      FLASHCARD: 'Flashcard',
      QUESTION: 'Questão',
      ERROR_NOTEBOOK: 'Caderno de Erros'
    };
    return labels[contentType] || 'Item';
  };

  const getTypeIcon = (contentType) => {
    const icons = {
      FLASHCARD: '💳',
      QUESTION: '❓',
      ERROR_NOTEBOOK: '📝'
    };
    return icons[contentType] || '📄';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 p-6">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Trash2 className="w-6 h-6 text-red-500 mr-2" />
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                Remover Revisão
              </h2>
            </div>
          </div>

          {/* Informações do Item */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getTypeIcon(reviewItem.contentType)}</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {reviewItem.title || 'Item sem título'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getTypeLabel(reviewItem.contentType)}
                </p>
                {reviewItem.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {reviewItem.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Aviso Principal */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                  ⚠️ Esta ação é irreversível!
                </p>
                <div className="text-red-700 dark:text-red-300 space-y-1">
                  <p>• O item será removido permanentemente das suas revisões</p>
                  <p>• Todo o histórico de revisões deste item será perdido</p>
                  <p>• O progresso FSRS (intervalos, facilidade) será resetado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Como recuperar */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  💡 Para adicionar novamente às revisões:
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Você precisará estudar este item novamente para que ele seja incluído 
                  automaticamente no sistema de revisões.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isRemoving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              className="flex-1"
              disabled={isRemoving}
            >
              {isRemoving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Removendo...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Remover Definitivamente
                </div>
              )}
            </Button>
          </div>

          {/* Texto de confirmação adicional */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Tem certeza de que deseja remover este item das suas revisões?
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RemoveReviewModal;