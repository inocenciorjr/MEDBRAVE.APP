'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNewQuestion } from '@/lib/contexts/NewQuestionContext';
import CreateQuestionFlow from '@/components/admin/questions/CreateQuestionFlow';
import dynamic from 'next/dynamic';

// Importar RichTextEditor dinamicamente para evitar problemas de SSR
const RichTextEditor = dynamic(
  () => import('@/components/admin/ui/RichTextEditor'),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-64 rounded-lg"></div> }
);

const CreateQuestionPageContent: React.FC = () => {
  const router = useRouter();
  const { questionData, setQuestionData } = useNewQuestion();
  const [tags, setTags] = useState<string[]>(questionData.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isAnulada, setIsAnulada] = useState(questionData.isAnnulled || false);
  const [isDesatualizada, setIsDesatualizada] = useState(questionData.isOutdated || false);

  // Inicializar com 4 alternativas e status PUBLISHED por padrão
  useEffect(() => {
    console.log('🔍 CreateQuestionPage useEffect - questionData:', questionData);
    
    // Só inicializar se for questão objetiva e não tiver alternativas
    if (questionData.type === 'objetiva' && questionData.alternatives.length === 0) {
      console.log('📝 Criando 4 alternativas padrão...');
      const updatedData = {
        ...questionData,
        status: 'PUBLISHED',
        alternatives: [
          { text: '', isCorrect: false, explanation: '' },
          { text: '', isCorrect: false, explanation: '' },
          { text: '', isCorrect: false, explanation: '' },
          { text: '', isCorrect: false, explanation: '' }
        ]
      };
      setQuestionData(updatedData);
      console.log('✅ Alternativas criadas:', updatedData.alternatives);
    }
    
    // Garantir que o status seja PUBLISHED se não foi definido
    if (!questionData.status || questionData.status === 'DRAFT') {
      console.log('📝 Definindo status como PUBLISHED...');
      setQuestionData({ ...questionData, status: 'PUBLISHED' });
    }
  }, []);

  // Adicionar alternativa
  const addAlternative = () => {
    const newAlternatives = [...questionData.alternatives, { text: '', isCorrect: false, explanation: '' }];
    setQuestionData({ ...questionData, alternatives: newAlternatives });
  };

  // Remover alternativa
  const removeAlternative = (index: number) => {
    if (questionData.alternatives.length > 2) {
      const newAlternatives = questionData.alternatives.filter((_, i) => i !== index);
      setQuestionData({ ...questionData, alternatives: newAlternatives });
    }
  };

  // Atualizar alternativa
  const updateAlternative = (index: number, field: 'text' | 'isCorrect' | 'explanation', value: string | boolean) => {
    const newAlternatives = [...questionData.alternatives];
    newAlternatives[index] = { ...newAlternatives[index], [field]: value };
    
    // Se marcar como correta, desmarcar as outras (a menos que seja anulada/desatualizada)
    if (field === 'isCorrect' && value === true && !isAnulada && !isDesatualizada) {
      newAlternatives.forEach((alt, i) => {
        if (i !== index) alt.isCorrect = false;
      });
    }
    
    setQuestionData({ ...questionData, alternatives: newAlternatives });
  };

  // Gerenciar tags
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setQuestionData({ ...questionData, tags: newTags });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    setQuestionData({ ...questionData, tags: newTags });
  };

  // Toggle questão anulada/desatualizada
  const toggleAnulada = () => {
    const newValue = !isAnulada;
    setIsAnulada(newValue);
    setQuestionData({ ...questionData, isAnnulled: newValue });
  };

  const toggleDesatualizada = () => {
    const newValue = !isDesatualizada;
    setIsDesatualizada(newValue);
    setQuestionData({ ...questionData, isOutdated: newValue });
  };

  // Sincronizar estados
  useEffect(() => {
    setIsAnulada(questionData.isAnnulled || false);
    setIsDesatualizada(questionData.isOutdated || false);
  }, [questionData.isAnnulled, questionData.isOutdated]);

  // Avançar para filtros
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 CreateQuestionPage - Avançando para filtros');
    console.log('📋 CreateQuestionPage - Dados atuais:', JSON.stringify(questionData, null, 2));
    
    router.push('/admin/questions/create/filters');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                Criar Nova Questão
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-lg">Preencha os campos abaixo para criar uma questão completa</p>
            </div>
            <button 
              onClick={() => router.push('/admin/questions')}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <span className="material-symbols-outlined inline-block mr-2">arrow_back</span>
              Voltar
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Configurações Básicas */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">settings</span>
              Configurações Básicas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  <span className="material-symbols-outlined inline-block mr-2 text-sm">list</span>
                  Tipo de Questão
                </label>
                <select 
                  value={questionData.type} 
                  onChange={e => setQuestionData({ ...questionData, type: e.target.value })} 
                  className="w-full p-3 border-2 border-border-light dark:border-border-dark rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="objetiva">Objetiva</option>
                  <option value="discursiva">Discursiva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  <span className="material-symbols-outlined inline-block mr-2 text-sm">signal_cellular_alt</span>
                  Dificuldade
                </label>
                <select 
                  value={questionData.difficulty || 'MEDIUM'} 
                  onChange={e => setQuestionData({ ...questionData, difficulty: e.target.value })} 
                  className="w-full p-3 border-2 border-border-light dark:border-border-dark rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="EASY">🟢 Fácil</option>
                  <option value="MEDIUM">🟡 Média</option>
                  <option value="HARD">🔴 Difícil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  <span className="material-symbols-outlined inline-block mr-2 text-sm">visibility</span>
                  Status
                </label>
                <select 
                  value={questionData.status || 'PUBLISHED'} 
                  onChange={e => setQuestionData({ ...questionData, status: e.target.value })} 
                  className="w-full p-3 border-2 border-border-light dark:border-border-dark rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="PUBLISHED">✅ Publicado</option>
                  <option value="DRAFT">📝 Rascunho</option>
                  <option value="ARCHIVED">📦 Arquivado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conteúdo da Questão */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-green-600">edit</span>
              Conteúdo da Questão
            </h2>
            
            <div className="space-y-8">
              {/* Enunciado */}
              <div>
                <label className="block text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">help</span>
                  Enunciado da Questão
                </label>
                <RichTextEditor 
                  value={questionData.statement} 
                  onChange={(value) => setQuestionData({ ...questionData, statement: value })}
                  placeholder="Digite o enunciado da questão..."
                  height="250px"
                />
              </div>

              {/* Descrição/Explicação */}
              <div>
                <label className="block text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">info</span>
                  Descrição/Explicação (Opcional)
                </label>
                <RichTextEditor 
                  value={questionData.description || ''} 
                  onChange={(value) => setQuestionData({ ...questionData, description: value })}
                  placeholder="Adicione uma explicação ou contexto adicional..."
                  height="180px"
                />
              </div>
            </div>
          </div>

          {/* Alternativas ou Resposta */}
          {questionData.type === 'objetiva' ? (
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-600">format_list_numbered</span>
                  Alternativas
                </h2>
                <button 
                  type="button" 
                  onClick={addAlternative}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Adicionar Alternativa
                </button>
              </div>
              
              <div className="space-y-6">
                {questionData.alternatives.map((alt, index) => (
                  <div key={index} className="border-2 border-border-light dark:border-border-dark rounded-xl p-6 hover:border-primary/20 transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <input 
                            type={isAnulada || isDesatualizada ? "checkbox" : "radio"}
                            name={isAnulada || isDesatualizada ? undefined : "correct-answer"}
                            checked={alt.isCorrect} 
                            onChange={e => updateAlternative(index, 'isCorrect', e.target.checked)}
                            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600" 
                          />
                          <label className="ml-3 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                            Resposta Correta
                          </label>
                        </div>
                        <span className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary bg-primary/10 px-3 py-1 rounded-full">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>
                      {questionData.alternatives.length > 2 && (
                        <button 
                          type="button" 
                          onClick={() => removeAlternative(index)}
                          className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Remover
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                          Texto da Alternativa:
                        </label>
                        <RichTextEditor 
                          value={alt.text} 
                          onChange={(value) => updateAlternative(index, 'text', value)}
                          placeholder={`Digite o texto da alternativa ${String.fromCharCode(65 + index)}...`}
                          height="120px"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                          Explicação (Opcional):
                        </label>
                        <RichTextEditor 
                          value={alt.explanation || ''} 
                          onChange={(value) => updateAlternative(index, 'explanation', value)}
                          placeholder={`Explicação para a alternativa ${String.fromCharCode(65 + index)}...`}
                          height="100px"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
              <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-600">edit_note</span>
                Resposta Discursiva
              </h2>
              <RichTextEditor 
                value={questionData.alternatives[0]?.text || ''} 
                onChange={(value) => setQuestionData({ 
                  ...questionData, 
                  alternatives: [{ text: value, isCorrect: true, explanation: '' }] 
                })}
                placeholder="Digite a resposta esperada para a questão discursiva..."
                height="250px"
              />
            </div>
          )}

          {/* Tags */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-600">label</span>
              Tags
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-3">
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 p-3 border-2 border-border-light dark:border-border-dark rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary" 
                  placeholder="Digite uma tag e pressione Enter" 
                />
                <button 
                  type="button" 
                  onClick={addTag}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Adicionar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <span className="material-symbols-outlined mr-2 text-sm">label</span>
                    {tag}
                    <button 
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary hover:text-primary/80 transition-colors duration-200"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Status Especiais */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-600">warning</span>
              Status Especiais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={toggleAnulada}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 ${
                  isAnulada 
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30' 
                    : 'border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/50 hover:border-red-200 dark:hover:border-red-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isAnulada ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isAnulada && <span className="material-symbols-outlined text-white text-xs">check</span>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">Questão Anulada</h3>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Marcar esta questão como anulada</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={toggleDesatualizada}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 ${
                  isDesatualizada 
                    ? 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30' 
                    : 'border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-900/50 hover:border-orange-200 dark:hover:border-orange-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isDesatualizada ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isDesatualizada && <span className="material-symbols-outlined text-white text-xs">check</span>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">Questão Desatualizada</h3>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Marcar esta questão como desatualizada</p>
                  </div>
                </div>
              </div>
            </div>

            {(isAnulada || isDesatualizada) && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-lg">
                <div className="flex">
                  <span className="material-symbols-outlined text-yellow-400 dark:text-yellow-600 mt-1 mr-3">warning</span>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Status Especial Ativo
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      Esta questão será marcada como {isAnulada && isDesatualizada ? 'anulada e desatualizada' : isAnulada ? 'anulada' : 'desatualizada'}.
                      {(isAnulada || isDesatualizada) && ' Você poderá selecionar múltiplas respostas corretas.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-2">
                <span className="material-symbols-outlined">info</span>
                Após criar a questão, você poderá definir os filtros e categorias
              </div>
              <div className="flex space-x-4">
                <button 
                  type="button" 
                  onClick={() => router.push('/admin/questions')}
                  className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">close</span>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Avançar para Filtros
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CreateQuestionPage() {
  return (
    <CreateQuestionFlow>
      <CreateQuestionPageContent />
    </CreateQuestionFlow>
  );
}
