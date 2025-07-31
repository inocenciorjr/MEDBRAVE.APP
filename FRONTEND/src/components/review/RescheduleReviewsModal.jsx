import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { unifiedReviewService } from '../../services/unifiedReviewService';

const RescheduleReviewsModal = ({ 
  isOpen, 
  onClose, 
  reviewsByType, 
  onRescheduleComplete 
}) => {
  const [selectedTypes, setSelectedTypes] = useState({
    FLASHCARD: false,
    QUESTION: false,
    ERROR_NOTEBOOK: false
  });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    // Default para amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedTypes).every(Boolean);
    const newState = !allSelected;
    setSelectedTypes({
      FLASHCARD: newState,
      QUESTION: newState,
      ERROR_NOTEBOOK: newState
    });
  };

  const handleReschedule = async () => {
    const selectedTypesList = Object.keys(selectedTypes).filter(type => selectedTypes[type]);
    
    if (selectedTypesList.length === 0) {
      alert('Selecione pelo menos um tipo de revisão para reagendar.');
      return;
    }

    setIsRescheduling(true);
    
    try {
      // Calcular quantos itens serão reagendados
      const totalItems = selectedTypesList.reduce((total, type) => {
        return total + (reviewsByType[type]?.length || 0);
      }, 0);

      // Chamar API para reagendar
      await unifiedReviewService.rescheduleReviews({
        types: selectedTypesList,
        newDate: rescheduleDate
      });

      // Notificar sucesso
      onRescheduleComplete({
        types: selectedTypesList,
        totalItems,
        newDate: rescheduleDate
      });

      onClose();
    } catch (error) {
      console.error('Erro ao reagendar revisões:', error);
      alert('Erro ao reagendar revisões. Tente novamente.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      FLASHCARD: 'Flashcards',
      QUESTION: 'Questões',
      ERROR_NOTEBOOK: 'Cadernos de Erros'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      FLASHCARD: '💳',
      QUESTION: '❓',
      ERROR_NOTEBOOK: '📝'
    };
    return icons[type] || '📄';
  };

  const selectedCount = Object.values(selectedTypes).filter(Boolean).length;
  const totalSelectedItems = Object.keys(selectedTypes)
    .filter(type => selectedTypes[type])
    .reduce((total, type) => total + (reviewsByType[type]?.length || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 p-6">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-bold">Reagendar Revisões</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecione os tipos de revisão que deseja reagendar
            </p>
          </div>

          {/* Seleção de Data */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Nova data para as revisões:
            </label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Tipos de Revisão */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Tipos de Revisão</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {Object.values(selectedTypes).every(Boolean) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            {Object.keys(reviewsByType).map(type => {
              const count = reviewsByType[type]?.length || 0;
              if (count === 0) return null;

              return (
                <div
                  key={type}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTypes[type]
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleTypeToggle(type)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTypes[type]}
                        onChange={() => handleTypeToggle(type)}
                        className="w-4 h-4"
                      />
                      <span className="text-lg">{getTypeIcon(type)}</span>
                      <span className="font-medium">{getTypeLabel(type)}</span>
                    </div>
                    <Badge variant="outline">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo da Seleção */}
          {selectedCount > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {totalSelectedItems} {totalSelectedItems === 1 ? 'revisão selecionada' : 'revisões selecionadas'}
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Serão reagendadas para {new Date(rescheduleDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          {/* Aviso */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Importante:</p>
                <p>
                  As revisões reagendadas serão adicionadas às revisões já programadas para a nova data.
                  Elas aparecerão com prioridade alta por estarem pendentes.
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
              disabled={isRescheduling}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              className="flex-1"
              disabled={selectedCount === 0 || isRescheduling}
            >
              {isRescheduling ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Reagendando...
                </div>
              ) : (
                `Reagendar ${totalSelectedItems} ${totalSelectedItems === 1 ? 'Revisão' : 'Revisões'}`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RescheduleReviewsModal;