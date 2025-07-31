import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewQuestion } from './NewQuestionContext';

// Importação direta do ReactQuill
let ReactQuill: any = null;

// Componente wrapper para ReactQuill
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}> = ({ value, onChange, placeholder, height = '200px' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuill = async () => {
      try {
        const quillModule = await import('react-quill');
        ReactQuill = quillModule.default;
        await import('react-quill/dist/quill.snow.css');
        setIsLoaded(true);
      } catch (err) {
        console.error('❌ Erro ao carregar ReactQuill:', err);
        setError('Falha ao carregar editor rico');
      }
    };

    loadQuill();
  }, []);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script', 'align', 'list', 'bullet', 'indent',
    'blockquote', 'code-block', 'link', 'image', 'video'
  ];

  if (error) {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error} - Usando editor simples
        </div>
        <textarea 
          className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ height }}
        />
      </div>
    );
  }

  if (!isLoaded || !ReactQuill) {
    return (
      <div className="border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-gray-600 font-medium">Carregando editor rico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .ql-toolbar {
          border: 2px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px 12px 0 0;
          padding: 16px;
        }
        
        .rich-text-editor .ql-container {
          border: 2px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 12px 12px;
          font-size: 14px;
        }
        
        .rich-text-editor .ql-editor {
          min-height: ${height};
          padding: 20px;
          line-height: 1.6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 24px;
        }
        
        .rich-text-editor .ql-toolbar button {
          margin: 2px;
          border-radius: 8px;
          padding: 8px;
          transition: all 0.2s ease;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }
        
        .rich-text-editor .ql-toolbar .ql-active {
          background: #3b82f6;
          color: white;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
      <ReactQuill 
        value={value} 
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        theme="snow"
      />
    </div>
  );
};

const CreateQuestionPage: React.FC = () => {
  const navigate = useNavigate();
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
        status: 'PUBLISHED', // Status padrão como PUBLISHED
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
  }, []); // Array vazio para executar apenas uma vez

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
    
    // Se marcar como correta, desmarcar as outras
    if (field === 'isCorrect' && value === true) {
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
    console.log('📝 CreateQuestionPage - Statement antes de navegar:', questionData.statement);
    console.log('📊 CreateQuestionPage - Alternativas antes de navegar:', questionData.alternatives?.length);
    
    navigate('/admin/questions/filters');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                <i className="fas fa-plus-circle text-blue-600 mr-3"></i>
                Criar Nova Questão
              </h1>
              <p className="text-gray-600 text-lg">Preencha os campos abaixo para criar uma questão completa</p>
            </div>
            <button 
              onClick={() => navigate('/admin/questions')}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Voltar
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Configurações Básicas */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-cog text-blue-600 mr-3"></i>
              Configurações Básicas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-list-ul mr-2"></i>
                  Tipo de Questão
                </label>
                <select 
                  value={questionData.type} 
                  onChange={e => setQuestionData({ ...questionData, type: e.target.value })} 
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="objetiva">Objetiva</option>
                  <option value="discursiva">Discursiva</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-signal mr-2"></i>
                  Dificuldade
                </label>
                <select 
                  value={questionData.difficulty || 'MEDIUM'} 
                  onChange={e => setQuestionData({ ...questionData, difficulty: e.target.value })} 
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="EASY">🟢 Fácil</option>
                  <option value="MEDIUM">🟡 Média</option>
                  <option value="HARD">🔴 Difícil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-eye mr-2"></i>
                  Status
                </label>
                <select 
                  value={questionData.status || 'PUBLISHED'} 
                  onChange={e => setQuestionData({ ...questionData, status: e.target.value })} 
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="PUBLISHED">✅ Publicado</option>
                  <option value="DRAFT">📝 Rascunho</option>
                  <option value="ARCHIVED">📦 Arquivado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conteúdo da Questão */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-edit text-green-600 mr-3"></i>
              Conteúdo da Questão
            </h2>
            
            <div className="space-y-8">
              {/* Enunciado */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-4">
                  <i className="fas fa-question-circle text-blue-600 mr-2"></i>
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
                <label className="block text-lg font-semibold text-gray-700 mb-4">
                  <i className="fas fa-info-circle text-purple-600 mr-2"></i>
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
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <i className="fas fa-list-ol text-orange-600 mr-3"></i>
                  Alternativas
                </h2>
                <button 
                  type="button" 
                  onClick={addAlternative}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar Alternativa
                </button>
              </div>
              
              <div className="space-y-6">
                {questionData.alternatives.map((alt, index) => (
                  <div key={index} className="border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            name="correct-answer"
                            checked={alt.isCorrect} 
                            onChange={e => updateAlternative(index, 'isCorrect', e.target.checked)}
                            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300" 
                          />
                          <label className="ml-3 text-sm font-medium text-gray-700">
                            Resposta Correta
                          </label>
                        </div>
                        <span className="text-lg font-bold text-gray-900 bg-blue-100 px-3 py-1 rounded-full">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>
                      {questionData.alternatives.length > 2 && (
                        <button 
                          type="button" 
                          onClick={() => removeAlternative(index)}
                          className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Remover
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="fas fa-pen-alt text-purple-600 mr-3"></i>
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
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-tags text-indigo-600 mr-3"></i>
              Tags
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-3">
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                  placeholder="Digite uma tag e pressione Enter" 
                />
                <button 
                  type="button" 
                  onClick={addTag}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                    <i className="fas fa-tag mr-2"></i>
                    {tag}
                    <button 
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Status Especiais */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-exclamation-triangle text-yellow-600 mr-3"></i>
              Status Especiais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={toggleAnulada}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 ${
                  isAnulada 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-gray-50 hover:border-red-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isAnulada ? 'border-red-500 bg-red-500' : 'border-gray-300'
                  }`}>
                    {isAnulada && <i className="fas fa-check text-white text-xs"></i>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Questão Anulada</h3>
                    <p className="text-sm text-gray-600">Marcar esta questão como anulada</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={toggleDesatualizada}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 ${
                  isDesatualizada 
                    ? 'border-orange-300 bg-orange-50' 
                    : 'border-gray-200 bg-gray-50 hover:border-orange-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isDesatualizada ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                  }`}>
                    {isDesatualizada && <i className="fas fa-check text-white text-xs"></i>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Questão Desatualizada</h3>
                    <p className="text-sm text-gray-600">Marcar esta questão como desatualizada</p>
                  </div>
                </div>
              </div>
            </div>

            {(isAnulada || isDesatualizada) && (
              <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                <div className="flex">
                  <i className="fas fa-exclamation-triangle text-yellow-400 mt-1 mr-3"></i>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      Status Especial Ativo
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Esta questão será marcada como {isAnulada && isDesatualizada ? 'anulada e desatualizada' : isAnulada ? 'anulada' : 'desatualizada'}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <i className="fas fa-info-circle mr-2"></i>
                Após criar a questão, você poderá definir os filtros e categorias
              </div>
              <div className="flex space-x-4">
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/questions')}
                  className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <i className="fas fa-arrow-right mr-2"></i>
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

export default CreateQuestionPage; 