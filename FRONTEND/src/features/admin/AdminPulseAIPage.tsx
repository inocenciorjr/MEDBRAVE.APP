import React, { useState, useRef } from 'react';
import { pulseAIService } from '../../services/pulseAIService';
import { fetchWithAuth } from '../../services/fetchWithAuth';

interface ExtractedQuestion {
  question: string;
  alternatives: string[];
  correctAnswer: string;
  explanation?: string;
  specialty: string;
  difficulty: 'básica' | 'intermediária' | 'avançada';
  topics: string[];
}

interface Filter {
  id: string;
  name: string;
  subfilters?: Array<{
    id: string;
    name: string;
  }>;
}

interface CategorizedQuestion extends ExtractedQuestion {
  suggestedFilters: Array<{
    filterId: string;
    filterName: string;
    confidence: number;
    reasoning: string;
  }>;
  suggestedSubfilters: Array<{
    subfilterId: string;
    subfilterName: string;
    filterId: string;
    confidence: number;
    reasoning: string;
  }>;
}

// Interface BulkQuestion igual ao BulkCreate
interface BulkQuestion {
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta?: number;
  dificuldade?: string;
  status?: string;
  tags?: string[];
  filterIds?: string[];
  subFilterIds?: string[];
  explicacao?: string;
  imagem?: string;
  tempId?: string;
  aiGenerated?: boolean;
  aiConfidence?: number;
  isAnnulled?: boolean;
  isOutdated?: boolean;
}

// Função para converter ExtractedQuestion para BulkQuestion
const convertToBulkQuestions = (extracted: ExtractedQuestion[]): BulkQuestion[] => {
  return extracted.map((q, idx) => ({
    numero: (idx + 1).toString(),
    enunciado: q.question,
    alternativas: q.alternatives,
    correta: q.alternatives.findIndex(alt => alt === q.correctAnswer),
    dificuldade: q.difficulty === 'básica' ? 'EASY' : q.difficulty === 'avançada' ? 'HARD' : 'MEDIUM',
    status: 'DRAFT',
    tags: q.topics,
    explicacao: q.explanation,
    tempId: `pulse-q-${idx}`,
    aiGenerated: true,
    aiConfidence: 0.8,
    isAnnulled: false,
    isOutdated: false,
  }));
};

const AdminPulseAIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'extract' | 'categorize' | 'status'>('extract');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para extração
  const [extractContent, setExtractContent] = useState('');
  const [extractOptions, setExtractOptions] = useState({
    specialty: '',
    maxQuestions: 10,
    includeExplanations: true
  });
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  
  // Estados para categorização
  const [questionsToCategories, setQuestionsToCategories] = useState<ExtractedQuestion[]>([]);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);
  const [categorizedQuestions, setCategorizedQuestions] = useState<CategorizedQuestion[]>([]);
  
  // Estados para status
  const [pulseStatus, setPulseStatus] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setExtractContent(content);
        };
        reader.readAsText(file);
      } else {
        setError('Por favor, selecione um arquivo de texto (.txt)');
      }
    }
  };

  const handleExtractQuestions = async () => {
    if (!extractContent.trim() || extractContent.length < 100) {
      setError('Conteúdo deve ter pelo menos 100 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithAuth('http://localhost:5001/extract-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: extractContent,
          options: extractOptions
        })
      });

      const result = await response.json();

      if (result.success) {
        setExtractedQuestions(result.questions || []);
        setSuccess(`${result.questions?.length || 0} questões extraídas com sucesso!`);
      } else {
        setError(result.error || 'Erro na extração de questões');
      }
    } catch (err: any) {
      setError('Erro de comunicação com o PULSE AI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/filters');
      const result = await response.json();
      
      if (result.success) {
        setAvailableFilters(result.data || []);
      } else {
        setError('Erro ao carregar filtros do banco de dados');
      }
    } catch (err: any) {
      setError('Erro ao carregar filtros: ' + err.message);
    }
  };

  const handleCategorizeQuestions = async () => {
    if (questionsToCategories.length === 0) {
      setError('Nenhuma questão para categorizar');
      return;
    }

    if (availableFilters.length === 0) {
      await loadFilters();
      if (availableFilters.length === 0) {
        setError('Nenhum filtro disponível no banco de dados');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithAuth('/api/pulse-ai/categorize-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: questionsToCategories,
          availableFilters
        })
      });

      const result = await response.json();

      if (result.success) {
        setCategorizedQuestions(result.categorizedQuestions || []);
        setSuccess(`${result.categorizedQuestions?.length || 0} questões categorizadas com sucesso!`);
      } else {
        setError(result.error || 'Erro na categorização de questões');
      }
    } catch (err: any) {
      setError('Erro de comunicação com o PULSE AI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkPulseStatus = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/pulse-ai/status');
      const result = await response.json();
      setPulseStatus(result);
    } catch (err: any) {
      setError('Erro ao verificar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveExtractedToCategories = () => {
    setQuestionsToCategories(extractedQuestions);
    setActiveTab('categorize');
    setSuccess('Questões movidas para categorização!');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🤖 PULSE AI - Administração</h1>
        <p className="text-gray-600">Extração e categorização automática de questões médicas</p>
      </div>

      {/* Navegação */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('extract')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'extract'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Extração de Questões
          </button>
          <button
            onClick={() => setActiveTab('categorize')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categorize'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🏷️ Categorização
          </button>
          <button
            onClick={() => {
              setActiveTab('status');
              checkPulseStatus();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'status'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Status
          </button>
        </nav>
      </div>

      {/* Alertas */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Tab: Extração de Questões */}
      {activeTab === 'extract' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Extrair Questões de Texto/PDF</h3>
            
            {/* Upload de arquivo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo de texto (.txt)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {/* Área de texto */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo das questões (mínimo 100 caracteres)
              </label>
              <textarea
                value={extractContent}
                onChange={(e) => setExtractContent(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cole aqui o conteúdo com as questões de residência médica..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {extractContent.length} caracteres
              </p>
            </div>

            {/* Opções */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidade (opcional)
                </label>
                <input
                  type="text"
                  value={extractOptions.specialty}
                  onChange={(e) => setExtractOptions(prev => ({ ...prev, specialty: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Cardiologia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo de questões
                </label>
                <input
                  type="number"
                  value={extractOptions.maxQuestions}
                  onChange={(e) => setExtractOptions(prev => ({ ...prev, maxQuestions: parseInt(e.target.value) || 10 }))}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incluir explicações
                </label>
                <input
                  type="checkbox"
                  checked={extractOptions.includeExplanations}
                  onChange={(e) => setExtractOptions(prev => ({ ...prev, includeExplanations: e.target.checked }))}
                  className="mt-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </div>
            </div>

            <button
              onClick={handleExtractQuestions}
              disabled={loading || extractContent.length < 100}
              className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Extraindo...' : '🤖 Extrair Questões com PULSE AI'}
            </button>
          </div>

          {/* Resultados da extração */}
          {extractedQuestions.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  ✅ {extractedQuestions.length} Questões Extraídas
                </h4>
                <button
                  onClick={moveExtractedToCategories}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  ➡️ Mover para Categorização
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {extractedQuestions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {question.specialty}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded ml-2">
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{question.question}</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      {question.alternatives.map((alt, altIndex) => (
                        <div key={altIndex} className={alt === question.correctAnswer ? 'text-green-600 font-medium' : ''}>
                          {alt}
                        </div>
                      ))}
                    </div>
                    {question.topics.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Tópicos: </span>
                        {question.topics.map((topic, topicIndex) => (
                          <span key={topicIndex} className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded mr-1">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Categorização */}
      {activeTab === 'categorize' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">🏷️ Categorizar Questões</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Questões para categorizar: <strong>{questionsToCategories.length}</strong>
              </p>
              
              {questionsToCategories.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhuma questão para categorizar.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Extraia questões primeiro na aba "Extração de Questões"
                  </p>
                </div>
              )}
              
              {questionsToCategories.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={loadFilters}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
                  >
                    🔄 Carregar Filtros do Banco
                  </button>
                  
                  <button
                    onClick={handleCategorizeQuestions}
                    disabled={loading || availableFilters.length === 0}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '🔄 Categorizando...' : '🤖 Categorizar com PULSE AI'}
                  </button>
                  
                  <p className="text-sm text-gray-500">
                    Filtros disponíveis: <strong>{availableFilters.length}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resultados da categorização */}
          {categorizedQuestions.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                ✅ {categorizedQuestions.length} Questões Categorizadas
              </h4>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {categorizedQuestions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">{question.question.substring(0, 100)}...</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Filtros Sugeridos:</h5>
                        {question.suggestedFilters.map((filter, filterIndex) => (
                          <div key={filterIndex} className="mb-2 p-2 bg-blue-50 rounded">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">{filter.filterName}</span>
                              <span className="text-xs bg-blue-200 text-blue-800 px-1 rounded">
                                {Math.round(filter.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{filter.reasoning}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Subfiltros Sugeridos:</h5>
                        {question.suggestedSubfilters.map((subfilter, subIndex) => (
                          <div key={subIndex} className="mb-2 p-2 bg-green-50 rounded">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">{subfilter.subfilterName}</span>
                              <span className="text-xs bg-green-200 text-green-800 px-1 rounded">
                                {Math.round(subfilter.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{subfilter.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Status */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Status do PULSE AI</h3>
            
            {pulseStatus && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Sistema</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Nome:</span>
                      <span className="font-medium">{pulseStatus.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Versão:</span>
                      <span className="font-medium">{pulseStatus.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modelo:</span>
                      <span className="font-medium">{pulseStatus.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${pulseStatus.ready ? 'text-green-600' : 'text-red-600'}`}>
                        {pulseStatus.ready ? '✅ Ativo' : '❌ Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Saúde</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${pulseStatus.health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                        {pulseStatus.health?.status === 'healthy' ? '💚 Saudável' : '❤️ Problemas'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-medium">{Math.round(pulseStatus.uptime / 3600)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Última verificação:</span>
                      <span className="font-medium">
                        {new Date(pulseStatus.health?.lastHealthCheck).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {pulseStatus.health?.issues?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-600 mb-1">Problemas:</p>
                      <ul className="text-xs text-red-500 space-y-1">
                        {pulseStatus.health.issues.map((issue: string, index: number) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={checkPulseStatus}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '🔄 Verificando...' : '🔄 Atualizar Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPulseAIPage; 