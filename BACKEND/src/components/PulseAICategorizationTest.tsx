/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import React, { useState } from 'react';

interface TestQuestion {
  tempId: string;
  question: string;
  statement?: string;
  enunciado?: string;
  alternatives: string[];
  correctAnswer?: string;
  explanation?: string;
}

const PulseAICategorizationTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Questões de teste de diferentes especialidades médicas
  const testQuestions: TestQuestion[] = [
    {
      tempId: 'test-1',
      question: 'QUESTÃO 1\nPaciente de 65 anos apresenta dor torácica em aperto, irradiando para membro superior esquerdo, com duração de 30 minutos. Queixa-se também de sudorese fria e náuseas. O ECG mostra supradesnivelamento do segmento ST em D2, D3 e aVF. Qual o diagnóstico mais provável?',
      alternatives: [
        'A) Angina instável',
        'B) Infarto agudo do miocárdio de parede inferior',
        'C) Embolia pulmonar',
        'D) Dissecção aórtica'
      ],
      correctAnswer: 'B',
      explanation: 'Quadro clínico típico de IAM inferior com elevação de ST nas derivações correspondentes'
    },
    {
      tempId: 'test-2', 
      question: 'QUESTÃO 2\nCriança de 2 anos apresenta febre há 3 dias, vômitos e diarreia. Mãe refere que a criança está prostrada e recusa alimentação. Ao exame: desidratação moderada, fontanela deprimida, mucosas secas. Qual a conduta inicial mais adequada?',
      alternatives: [
        'A) Prescrever antibiótico oral',
        'B) Solicitar hemograma e urocultura',
        'C) Iniciar reposição hidro-eletrolítica',
        'D) Prescrever antieméticos'
      ],
      correctAnswer: 'C',
      explanation: 'Prioridade é corrigir a desidratação antes de outras medidas'
    },
    {
      tempId: 'test-3',
      question: 'QUESTÃO 3\nNo contexto de ensino médico, qual é a principal diferença entre aprendizagem baseada em problemas (ABP) e ensino tradicional expositivo?',
      alternatives: [
        'A) ABP usa apenas casos clínicos reais',
        'B) ABP promove aprendizagem ativa e autônoma',
        'C) Ensino tradicional é mais eficaz para memorização',
        'D) ABP requer menos preparo do professor'
      ],
      correctAnswer: 'B',
      explanation: 'ABP foca na aprendizagem ativa, com o aluno como protagonista do processo'
    }
  ];

  const testCategorization = async () => {
    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('🚀 Iniciando teste de categorização...');
      
      // Simular busca de filtros (hierarquia mockada para teste)
      const _mockFiltersHierarchy = [
        {
          id: 'filter-1',
          name: 'Clínica Médica',
          category: 'MEDICAL_SPECIALTY',
          children: [
            {
              id: 'sub-1',
              name: 'Cardiologia',
              parentId: null,
              children: [
                {
                  id: 'sub-1-1',
                  name: 'Síndrome Coronariana Aguda',
                  parentId: 'sub-1',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'filter-2',
          name: 'Pediatria',
          category: 'MEDICAL_SPECIALTY',
          children: [
            {
              id: 'sub-2',
              name: 'Gastroenterologia Pediátrica',
              parentId: null,
              children: []
            }
          ]
        },
        {
          id: 'filter-3',
          name: 'Metodologias de Ensino',
          category: 'EDUCATIONAL',
          children: [
            {
              id: 'sub-3',
              name: 'Aprendizagem Baseada em Problemas',
              parentId: null,
              children: []
            }
          ]
        }
      ];

      // Testar função de categorização diretamente (simulação)
      const mockResults = {
        success: true,
        categorizedQuestions: testQuestions.map((q, index) => {
          if (index === 0) {
            // Questão de cardiologia
            return {
              ...q,
              suggestedFilterIds: ['filter-1'],
              suggestedSubFilterIds: ['sub-1', 'sub-1-1'],
              categoryPath: [
                { id: 'filter-1', name: 'Clínica Médica', level: 0, confidence: 0.95, reasoning: 'questão clínica médica' },
                { id: 'sub-1', name: 'Cardiologia', level: 1, confidence: 0.92, reasoning: 'ECG e dor torácica' },
                { id: 'sub-1-1', name: 'Síndrome Coronariana Aguda', level: 2, confidence: 0.90, reasoning: 'IAM inferior' }
              ],
              medicalSpecialty: 'cardiologia',
              difficulty: 'intermediária',
              keywords: ['ECG', 'IAM', 'dor torácica', 'supradesnivelamento ST'],
              topicHierarchy: ['Clínica Médica', 'Cardiologia', 'Síndrome Coronariana Aguda', 'IAM']
            };
          } else if (index === 1) {
            // Questão de pediatria
            return {
              ...q,
              suggestedFilterIds: ['filter-2'],
              suggestedSubFilterIds: ['sub-2'],
              categoryPath: [
                { id: 'filter-2', name: 'Pediatria', level: 0, confidence: 0.93, reasoning: 'criança 2 anos' },
                { id: 'sub-2', name: 'Gastroenterologia Pediátrica', level: 1, confidence: 0.85, reasoning: 'vômitos e diarreia' }
              ],
              medicalSpecialty: 'pediatria',
              difficulty: 'básica',
              keywords: ['criança', 'desidratação', 'vômitos', 'diarreia'],
              topicHierarchy: ['Pediatria', 'Gastroenterologia Pediátrica', 'Desidratação']
            };
          } else {
            // Questão educacional
            return {
              ...q,
              suggestedFilterIds: ['filter-3'],
              suggestedSubFilterIds: ['sub-3'],
              categoryPath: [
                { id: 'filter-3', name: 'Metodologias de Ensino', level: 0, confidence: 0.88, reasoning: 'ensino médico' },
                { id: 'sub-3', name: 'Aprendizagem Baseada em Problemas', level: 1, confidence: 0.94, reasoning: 'ABP mencionada' }
              ],
              medicalSpecialty: 'educacao_medica',
              difficulty: 'intermediária',
              keywords: ['ABP', 'ensino', 'aprendizagem ativa', 'metodologia'],
              topicHierarchy: ['Educação Médica', 'Metodologias', 'ABP']
            };
          }
        }),
        summary: {
          totalQuestions: 3,
          categorizedQuestions: 3,
          uncategorizedQuestions: 0,
          topCategories: [
            { path: 'Clínica Médica > Cardiologia', count: 1 },
            { path: 'Pediatria > Gastroenterologia Pediátrica', count: 1 },
            { path: 'Metodologias de Ensino > ABP', count: 1 }
          ],
          averageConfidence: 0.91
        }
      };

      console.log('✅ Categorização simulada concluída:', mockResults);
      setResults(mockResults);

    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      setError(error.message || 'Erro durante o teste de categorização');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🩺 PULSE AI - Teste de Categorização Inteligente
        </h2>
        <p className="text-gray-600">
          Teste da funcionalidade de categorização automática de questões médicas em diferentes especialidades.
        </p>
      </div>

      {/* Questões de Teste */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">📝 Questões de Teste:</h3>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          {testQuestions.map((q, index) => (
            <div key={q.tempId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-800 mb-2">
                {index === 0 && '🫀 Cardiologia'} 
                {index === 1 && '👶 Pediatria'}
                {index === 2 && '📚 Educação Médica'}
              </h4>
              <p className="text-sm text-gray-600 mb-2 line-clamp-3">{q.question}</p>
              <div className="text-xs text-gray-500">
                {q.alternatives.length} alternativas • Resposta: {q.correctAnswer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão de Teste */}
      <div className="mb-6">
        <button
          onClick={testCategorization}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-medium text-white ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Categorizando...
            </>
          ) : (
            '🚀 Testar Categorização'
          )}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">❌ Erro:</h4>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div className="space-y-6">
          {/* Resumo */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">📊 Resumo da Categorização:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-600">Total:</span>
                <span className="font-medium ml-1">{results.summary.totalQuestions}</span>
              </div>
              <div>
                <span className="text-green-600">Categorizadas:</span>
                <span className="font-medium ml-1">{results.summary.categorizedQuestions}</span>
              </div>
              <div>
                <span className="text-green-600">Confiança média:</span>
                <span className="font-medium ml-1">{(results.summary.averageConfidence * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-green-600">Sucesso:</span>
                <span className="font-medium ml-1">100%</span>
              </div>
            </div>
          </div>

          {/* Questões Categorizadas */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">🎯 Resultados Detalhados:</h3>
            <div className="space-y-4">
              {results.categorizedQuestions.map((q: any, index: number) => (
                <div key={q.tempId} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-800">
                      Questão {index + 1} - {q.medicalSpecialty}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{q.question}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Caminho da Categoria */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">🏷️ Caminho da Categoria:</h5>
                      <div className="space-y-1">
                        {q.categoryPath.map((cat: any, _catIndex: number) => (
                          <div key={cat.id} className="flex items-center text-sm">
                            <span className="text-gray-400 mr-2">{'  '.repeat(cat.level)}{'└'}</span>
                            <span className="text-gray-700">{cat.name}</span>
                            <span className="ml-2 text-xs text-green-600">
                              ({(cat.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Palavras-chave */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">🔑 Palavras-chave:</h5>
                      <div className="flex flex-wrap gap-1">
                        {q.keywords.map((keyword: string) => (
                          <span 
                            key={keyword} 
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">
                          Dificuldade: <span className="font-medium">{q.difficulty}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias Mais Usadas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3">📈 Categorias Mais Utilizadas:</h3>
            <div className="space-y-2">
              {results.summary.topCategories.map((cat: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-blue-700">{cat.path}</span>
                  <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm">
                    {cat.count} questão{cat.count !== 1 ? 'ões' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PulseAICategorizationTest;