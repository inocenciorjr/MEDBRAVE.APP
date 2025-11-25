'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { simulatedExamService } from '@/services/simulatedExamService';

interface SimulatedExamStateOptions {
  resultId: string;
  questionId: string;
  listId: string;
}

/**
 * Hook para gerenciar estado de questões em simulados
 * Sincroniza automaticamente com o banco de dados
 */
export function useSimulatedExamState({ resultId, questionId, listId }: SimulatedExamStateOptions) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const storageKey = `question_state_${listId}_${questionId}`;

  // Carregar estado inicial do localStorage
  useEffect(() => {
    const loadInitialState = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSelectedAlternative(parsed.selectedAlternative || null);
        }
      } catch (error) {
        console.error('[useSimulatedExamState] Erro ao carregar estado:', error);
      }
    };

    loadInitialState();
  }, [storageKey]);

  // Função para sincronizar com o banco de dados
  const syncWithDatabase = useCallback(async (alternativeId: string | null) => {
    if (!alternativeId) return;

    try {
      setIsSyncing(true);
      
      // Salvar no banco de dados
      await simulatedExamService.updateSimulatedExamAnswer(
        resultId,
        questionId,
        alternativeId
      );
      
      console.log('[useSimulatedExamState] Resposta sincronizada:', {
        questionId,
        alternativeId
      });
    } catch (error) {
      console.error('[useSimulatedExamState] Erro ao sincronizar:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [resultId, questionId]);

  // Selecionar alternativa
  const selectAlternative = useCallback((alternativeId: string) => {
    const newValue = selectedAlternative === alternativeId ? null : alternativeId;
    
    // Atualizar estado local
    setSelectedAlternative(newValue);
    
    // Salvar no localStorage imediatamente
    const state = {
      selectedAlternative: newValue,
      isAnswered: false,
      isCorrect: null,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
    
    // Cancelar sincronização pendente
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Agendar sincronização com debounce de 1 segundo
    // (para não fazer muitas requisições se o usuário ficar mudando rapidamente)
    syncTimeoutRef.current = setTimeout(() => {
      syncWithDatabase(newValue);
    }, 1000);
  }, [selectedAlternative, storageKey, syncWithDatabase]);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    selectedAlternative,
    selectAlternative,
    isSyncing,
  };
}
