'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CreateListState } from '@/types/banco-questoes';

interface CreateListContextType {
  state: CreateListState;
  cachedQuestions: any[] | null;
  setCachedQuestions: (questions: any[] | null) => void;
  updateListName: (name: string) => void;
  updateFolderId: (folderId: string | null) => void;
  updateSelectedSubjects: (subjects: string[]) => void;
  toggleSubject: (subjectId: string) => void;
  updateSelectedYears: (years: number[]) => void;
  toggleYear: (year: number) => void;
  toggleAllYears: (allYears: number[]) => void;
  updateSelectedInstitutions: (institutions: string[]) => void;
  toggleInstitution: (institutionId: string) => void;
  updateSelectedExamTypes: (examTypes: string[]) => void;
  toggleExamType: (examTypeId: string) => void;
  updateQuestionLimit: (limit: number) => void;
  calculateTotalQuestions: () => number;
  clearFilters: () => void;
  resetState: () => void;
}

const CreateListContext = createContext<CreateListContextType | undefined>(undefined);

const initialState: CreateListState = {
  step: 'geral',
  listName: '',
  folderId: null,
  selectedSubjects: [],
  selectedYears: [],
  selectedInstitutions: [],
  selectedExamTypes: [],
  totalQuestions: 0,
  questionLimit: 0,
};

export function CreateListProvider({ children }: { children: ReactNode }) {
  const [cachedQuestions, setCachedQuestions] = useState<any[] | null>(null);
  
  const [state, setState] = useState<CreateListState>(() => {
    // Load from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('createListState');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialState;
        }
      }
    }
    return initialState;
  });

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('createListState', JSON.stringify(state));
    }
  }, [state]);

  const updateListName = (name: string) => {
    setState((prev) => ({ ...prev, listName: name }));
  };

  const updateFolderId = (folderId: string | null) => {
    setState((prev) => ({ ...prev, folderId }));
  };

  const updateSelectedSubjects = (subjects: string[]) => {
    setState((prev) => ({ ...prev, selectedSubjects: subjects }));
  };

  const toggleSubject = (subjectId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedSubjects.includes(subjectId);
      const newSubjects = isSelected
        ? prev.selectedSubjects.filter((id) => id !== subjectId)
        : [...prev.selectedSubjects, subjectId];
      return { ...prev, selectedSubjects: newSubjects };
    });
  };

  const updateSelectedYears = (years: number[]) => {
    setState((prev) => ({ ...prev, selectedYears: years }));
  };

  const toggleYear = (year: number) => {
    setState((prev) => {
      const isSelected = prev.selectedYears.includes(year);
      const newYears = isSelected
        ? prev.selectedYears.filter((y) => y !== year)
        : [...prev.selectedYears, year];
      return { ...prev, selectedYears: newYears };
    });
  };

  const toggleAllYears = (allYears: number[]) => {
    setState((prev) => {
      const allSelected = allYears.every((year) => prev.selectedYears.includes(year));
      const newYears = allSelected ? [] : allYears;
      return { ...prev, selectedYears: newYears };
    });
  };

  const updateSelectedInstitutions = (institutions: string[]) => {
    setState((prev) => ({ ...prev, selectedInstitutions: institutions }));
  };

  const toggleInstitution = (institutionId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedInstitutions.includes(institutionId);
      const newInstitutions = isSelected
        ? prev.selectedInstitutions.filter((id) => id !== institutionId)
        : [...prev.selectedInstitutions, institutionId];
      return { ...prev, selectedInstitutions: newInstitutions };
    });
  };

  const updateSelectedExamTypes = (examTypes: string[]) => {
    setState((prev) => ({ ...prev, selectedExamTypes: examTypes }));
  };

  const toggleExamType = (examTypeId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedExamTypes?.includes(examTypeId) || false;
      const newExamTypes = isSelected
        ? (prev.selectedExamTypes || []).filter((id) => id !== examTypeId)
        : [...(prev.selectedExamTypes || []), examTypeId];
      return { ...prev, selectedExamTypes: newExamTypes };
    });
  };

  const updateQuestionLimit = (limit: number) => {
    setState((prev) => ({ ...prev, questionLimit: limit }));
  };

  const calculateTotalQuestions = () => {
    // Mock calculation - in real app, this would call an API
    const { selectedSubjects, selectedYears, selectedInstitutions } = state;
    
    // Permitir cálculo mesmo sem todos os filtros selecionados
    const subjectsCount = selectedSubjects.length || 1;
    const yearsCount = selectedYears.length || 1;
    const institutionsCount = selectedInstitutions.length || 1;

    // Mock formula: subjects * years * institutions * 100
    const total = subjectsCount * yearsCount * institutionsCount * 100;
    return total;
  };

  const clearFilters = () => {
    setState((prev) => ({
      ...prev,
      selectedSubjects: [],
      selectedYears: [],
      selectedInstitutions: [],
      selectedExamTypes: [],
      totalQuestions: 0,
    }));
  };

  const resetState = () => {
    setState(initialState);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('createListState');
    }
  };

  return (
    <CreateListContext.Provider
      value={{
        state,
        cachedQuestions,
        setCachedQuestions,
        updateListName,
        updateFolderId,
        updateSelectedSubjects,
        toggleSubject,
        updateSelectedYears,
        toggleYear,
        toggleAllYears,
        updateSelectedInstitutions,
        toggleInstitution,
        updateSelectedExamTypes,
        toggleExamType,
        updateQuestionLimit,
        calculateTotalQuestions,
        clearFilters,
        resetState,
      }}
    >
      {children}
    </CreateListContext.Provider>
  );
}

export function useCreateList() {
  const context = useContext(CreateListContext);
  if (context === undefined) {
    throw new Error('useCreateList must be used within a CreateListProvider');
  }
  return context;
}
