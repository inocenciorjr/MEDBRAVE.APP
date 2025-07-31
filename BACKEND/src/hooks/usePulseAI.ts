import { useState, useCallback, useMemo } from 'react';
import { PulseResponse, MedicalCase, PulseDiagnosis, PulseEducation, PulseConfiguration } from '../domain/pulseAI/types/PulseAITypes';
import { PulseAIService } from '../domain/pulseAI/services/PulseAIService';
import { env } from '../config/env';

interface UsePulseAIState {
  loading: boolean;
  error: string | null;
  lastResponse: PulseResponse | null;
  responseTime: number | null;
  tokensUsed: number | null;
}

interface UsePulseAIReturn extends UsePulseAIState {
  // 🧠 Análise médica
  analyzeMedicalCase: (medicalCase: MedicalCase) => Promise<PulseDiagnosis>;
  
  // 📚 Educação médica
  educateTopic: (topic: string, specialty?: string, complexity?: 'básico' | 'intermediário' | 'avançado') => Promise<PulseEducation>;
  
  // ⚡ Consulta rápida
  askQuickQuestion: (query: string) => Promise<PulseResponse>;
  
  // 🔍 Sugestões de tópicos
  getTopicSuggestions: (category: string, count?: number) => Promise<PulseResponse>;
  
  // 🛡️ Moderação de conteúdo
  moderateContent: (content: string) => Promise<PulseResponse>;
  
  // 🔄 Utilitários
  clearError: () => void;
  reset: () => void;
  getStatus: () => { name: string; version: string; model: string; ready: boolean };
  switchModel: (model: string) => void;
}

export const usePulseAI = (): UsePulseAIReturn => {
  const [state, setState] = useState<UsePulseAIState>({
    loading: false,
    error: null,
    lastResponse: null,
    responseTime: null,
    tokensUsed: null
  });

  // 🚀 Instância do PulseAIService com configuração centralizada
  const pulseService = useMemo(() => {
    const config: PulseConfiguration = {
      apiKey: env.GOOGLE_AI_API_KEY,
      defaultModel: env.PULSE_AI_MODEL,
      temperature: env.PULSE_AI_TEMPERATURE,
      topP: 0.8,
      topK: 40,
      maxTokens: env.PULSE_AI_MAX_TOKENS,
      enableLogging: env.PULSE_AI_ENABLE_LOGGING,
      logLevel: env.PULSE_AI_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error'
    };
    return new PulseAIService(config);
  }, []);

  const updateState = useCallback((updates: Partial<UsePulseAIState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleRequest = useCallback(async <T extends PulseResponse>(
    requestFn: () => Promise<T>
  ): Promise<T> => {
    updateState({ loading: true, error: null });
    
    try {
      const response = await requestFn();
      
      updateState({
        loading: false,
        lastResponse: response,
        responseTime: response.responseTime || null,
        tokensUsed: response.tokensUsed?.total || null,
        error: response.success ? null : response.error || 'Erro desconhecido'
      });
      
      return response;
    } catch (error: any) {
      updateState({
        loading: false,
        error: error.message || 'Erro ao processar solicitação'
      });
      throw error;
    }
  }, [updateState]);

  // 🧠 Análise médica completa
  const analyzeMedicalCase = useCallback(async (medicalCase: MedicalCase): Promise<PulseDiagnosis> => {
    return handleRequest(() => pulseService.analyzeMedicalCase(medicalCase));
  }, [handleRequest, pulseService]);

  // 📚 Educação médica
  const educateTopic = useCallback(async (
    topic: string, 
    specialty?: string, 
    complexity: 'básico' | 'intermediário' | 'avançado' = 'intermediário'
  ): Promise<PulseEducation> => {
    return handleRequest(() => pulseService.educateMedicalTopic(topic, specialty, complexity));
  }, [handleRequest, pulseService]);

  // ⚡ Consulta rápida
  const askQuickQuestion = useCallback(async (query: string): Promise<PulseResponse> => {
    return handleRequest(() => pulseService.quickMedicalQuery(query));
  }, [handleRequest, pulseService]);

  // 🔍 Sugestões de tópicos
  const getTopicSuggestions = useCallback(async (category: string, count: number = 5): Promise<PulseResponse> => {
    return handleRequest(() => pulseService.generateTopicSuggestions(category, count));
  }, [handleRequest, pulseService]);

  // 🛡️ Moderação de conteúdo
  const moderateContent = useCallback(async (content: string): Promise<PulseResponse> => {
    return handleRequest(() => pulseService.moderateMedicalContent(content));
  }, [handleRequest, pulseService]);

  // 🔄 Utilitários
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      lastResponse: null,
      responseTime: null,
      tokensUsed: null
    });
  }, []);

  const getStatus = useCallback(() => {
    return pulseService.getStatus();
  }, [pulseService]);

  const switchModel = useCallback((model: string) => {
    // Funcionalidade removida - modelo agora é configurado via .env
    console.warn('switchModel foi removido. Configure o modelo via PULSE_AI_MODEL no .env');
  }, []);

  return {
    ...state,
    analyzeMedicalCase,
    educateTopic,
    askQuickQuestion,
    getTopicSuggestions,
    moderateContent,
    clearError,
    reset,
    getStatus,
    switchModel
  };
};

// 🩺 Hook especializado para análise médica rápida
export const usePulseQuickAnalysis = () => {
  const { analyzeMedicalCase, loading, error } = usePulseAI();

  const quickAnalyze = useCallback(async (question: string, patientAge?: number, symptoms?: string[]) => {
    const medicalCase: MedicalCase = {
      question,
      patient: patientAge || symptoms ? {
        age: patientAge,
        symptoms: symptoms
      } : undefined
    };

    return analyzeMedicalCase(medicalCase);
  }, [analyzeMedicalCase]);

  return {
    quickAnalyze,
    loading,
    error
  };
};

// 📚 Hook especializado para educação médica
export const usePulseEducation = () => {
  const { educateTopic, getTopicSuggestions, loading, error } = usePulseAI();

  const educate = useCallback(async (topic: string, level: 'básico' | 'intermediário' | 'avançado' = 'intermediário') => {
    return educateTopic(topic, undefined, level);
  }, [educateTopic]);

  const getSuggestions = useCallback(async (category: string) => {
    return getTopicSuggestions(category, 5);
  }, [getTopicSuggestions]);

  return {
    educate,
    getSuggestions,
    loading,
    error
  };
};

// 🛡️ Hook especializado para moderação
export const usePulseModeration = () => {
  const { moderateContent, loading, error } = usePulseAI();

  const moderate = useCallback(async (content: string) => {
    return moderateContent(content);
  }, [moderateContent]);

  return {
    moderate,
    loading,
    error
  };
};

// Exports
export { PULSE_MODELS };
export type { PulseResponse, MedicalCase, PulseDiagnosis, PulseEducation };
export default usePulseAI;