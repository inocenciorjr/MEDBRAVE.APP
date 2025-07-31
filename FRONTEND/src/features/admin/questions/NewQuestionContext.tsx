import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Definição de tipos
export interface Alternative {
  text: string;
  isCorrect: boolean;
  explanation?: string; // Explicação para cada alternativa (opcional)
}

export interface Filter {
  id: string;
  name: string;
  category?: string;
}

export interface SubFilter {
  id: string;
  name: string;
  filterId: string;
  parentId?: string;
}

export interface NewQuestionData {
  id?: string;
  type: string;
  statement: string;
  description?: string; // Campo para descrição/explicação da questão
  alternatives: Alternative[];
  tags?: string[];
  isAnnulled?: boolean;  // Mudança: agora é opcional
  isOutdated?: boolean;  // Mudança: agora é opcional
  difficulty?: string; // EASY, MEDIUM, HARD
  status?: string; // DRAFT, PUBLISHED, ARCHIVED
  filterIds?: string[];  // Mudança: agora é opcional
  subFilterIds?: string[];  // Mudança: agora é opcional
  educationalFilters?: string[];  // Adicionado para compatibilidade
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
  status: 'PUBLISHED',  // Mudança: padrão agora é PUBLISHED
  filterIds: [],
  subFilterIds: [],
  educationalFilters: []  // Adicionado
};

// Função para carregar dados do localStorage
const loadFromStorage = (): NewQuestionData => {
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
  const [questionData, setQuestionData] = useState<NewQuestionData>(loadFromStorage());

  console.log('🏗️ NewQuestionProvider - Iniciando nova instância');
  console.log('📊 NewQuestionProvider - Estado inicial:', JSON.stringify(questionData, null, 2));

  // Wrapper para setQuestionData que salva no localStorage
  const setQuestionDataWithStorage = (data: NewQuestionData | ((prev: NewQuestionData) => NewQuestionData)) => {
    if (typeof data === 'function') {
      setQuestionData(prev => {
        const newData = data(prev);
        saveToStorage(newData);
        return newData;
      });
    } else {
      setQuestionData(data);
      saveToStorage(data);
    }
  };

  // Função para atualizar um campo específico
  const updateField = <K extends keyof NewQuestionData>(field: K, value: NewQuestionData[K]) => {
    console.log(`📝 NewQuestionProvider - Atualizando campo ${String(field)}:`, value);
    setQuestionData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📊 NewQuestionProvider - Novo estado:', JSON.stringify(newData, null, 2));
      saveToStorage(newData);
      return newData;
    });
  };

  // Função para resetar o estado
  const resetQuestion = () => {
    console.log('🔄 NewQuestionProvider - Resetando estado');
    localStorage.removeItem('new-question-data');
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