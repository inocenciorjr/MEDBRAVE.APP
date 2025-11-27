'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Definição de tipos
export interface Alternative {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface NewQuestionData {
  id?: string;
  type: string;
  statement: string;
  description?: string;
  alternatives: Alternative[];
  tags?: string[];
  isAnnulled?: boolean;
  isOutdated?: boolean;
  difficulty?: string;
  status?: string;
  filterIds?: string[];
  subFilterIds?: string[];
  educationalFilters?: string[];
}

interface NewQuestionContextType {
  questionData: NewQuestionData;
  setQuestionData: React.Dispatch<React.SetStateAction<NewQuestionData>>;
  updateField: <K extends keyof NewQuestionData>(field: K, value: NewQuestionData[K]) => void;
  resetQuestion: () => void;
}

// Estado inicial da questão
const initialQuestionData: NewQuestionData = {
  type: 'objetiva',
  statement: '',
  description: '',
  alternatives: [],
  tags: [],
  isAnnulled: false,
  isOutdated: false,
  difficulty: 'MEDIUM',
  status: 'PUBLISHED',
  filterIds: [],
  subFilterIds: [],
  educationalFilters: []
};

// Função para carregar dados do localStorage
const loadFromStorage = (): NewQuestionData => {
  if (typeof window === 'undefined') return initialQuestionData;
  
  try {
    const stored = localStorage.getItem('new-question-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('💾 Carregando dados do localStorage:', parsed);
      return { ...initialQuestionData, ...parsed };
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados do localStorage:', error);
  }
  return initialQuestionData;
};

// Função para salvar dados no localStorage
const saveToStorage = (data: NewQuestionData) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('new-question-data', JSON.stringify(data));
    console.log('💾 Dados salvos no localStorage:', data);
  } catch (error) {
    console.error('❌ Erro ao salvar dados no localStorage:', error);
  }
};

// Criação do contexto
const NewQuestionContext = createContext<NewQuestionContextType | undefined>(undefined);

// Provider para envolver os componentes do fluxo
export const NewQuestionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questionData, setQuestionData] = useState<NewQuestionData>(initialQuestionData);
  const [isClient, setIsClient] = useState(false);

  // Carregar dados do localStorage apenas no cliente
  useEffect(() => {
    setIsClient(true);
    setQuestionData(loadFromStorage());
  }, []);

  // Wrapper para setQuestionData que salva no localStorage
  const setQuestionDataWithStorage = (data: NewQuestionData | ((prev: NewQuestionData) => NewQuestionData)) => {
    if (typeof data === 'function') {
      setQuestionData(prev => {
        const newData = data(prev);
        if (isClient) saveToStorage(newData);
        return newData;
      });
    } else {
      setQuestionData(data);
      if (isClient) saveToStorage(data);
    }
  };

  // Função para atualizar um campo específico
  const updateField = <K extends keyof NewQuestionData>(field: K, value: NewQuestionData[K]) => {
    console.log(`📝 Atualizando campo ${String(field)}:`, value);
    setQuestionData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📊 Novo estado:', JSON.stringify(newData, null, 2));
      if (isClient) saveToStorage(newData);
      return newData;
    });
  };

  // Função para resetar o estado
  const resetQuestion = () => {
    console.log('🔄 Resetando estado');
    if (isClient) localStorage.removeItem('new-question-data');
    setQuestionData(initialQuestionData);
  };

  return (
    <NewQuestionContext.Provider value={{ questionData, setQuestionData: setQuestionDataWithStorage, updateField, resetQuestion }}>
      {children}
    </NewQuestionContext.Provider>
  );
};

// Hook para usar o contexto
export const useNewQuestion = () => {
  const context = useContext(NewQuestionContext);
  if (context === undefined) {
    throw new Error('useNewQuestion must be used within a NewQuestionProvider');
  }
  return context;
};
