import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { Progress } from '../../../components/ui/progress';
import { useAuth } from '../../../contexts/AuthContext';
import fetchWithAuth from '../../../services/fetchWithAuth';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { formatTime } from '../../../utils/dateUtils';

// URL base da API
const API_URL = 'http://localhost:5000/api';

// Hook simples para toast
const useToast = () => {
  return {
    toast: ({ title, description, status }) => {
      // Toast removido para melhor performance
    }
  };
};

export const FlashcardImporter = ({ onImportSuccess, onImportStart }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [detailedReport, setDetailedReport] = useState('');
  const [processingSteps, setProcessingSteps] = useState([]);
  const [useFSRS, setUseFSRS] = useState(true); // Estado para FSRS - padrão true
  const { toast } = useToast();
  const { token, user } = useAuth();
  
  // 🚀 ESTADO PARA LAZY LOADING
  const [isComponentActive, setIsComponentActive] = useState(false);
  
  // Referências para os intervalos
  const progressIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const startTimeRef = useRef(null);

  // 🚀 LAZY LOADING: Ativar componente apenas quando necessário
  useEffect(() => {
    // Pequeno delay para evitar carregamento desnecessário na inicialização
    const timer = setTimeout(() => {
      setIsComponentActive(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Função para limpar todos os intervalos
  const clearAllIntervals = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Função para adicionar etapa ao log de processamento
  const addProcessingStep = (step, status = 'processing') => {
    const timestamp = formatTime(new Date());
    setProcessingSteps(prev => [...prev, { timestamp, step, status }]);
  };

  // Função para atualizar última etapa
  const updateLastStep = (status, details = '') => {
    setProcessingSteps(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status,
          details
        };
      }
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Verificar extensão do arquivo
    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExt !== 'apkg' && fileExt !== 'colpkg') {
      setError('Formato de arquivo inválido. Apenas arquivos .apkg e .colpkg são permitidos.');
      setFile(null);
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB em bytes
    if (selectedFile.size > maxSize) {
      setError(`O arquivo é muito grande. O tamanho máximo permitido é 1GB.`);
      setFile(null);
      return;
    }
    
    // Avisar sobre arquivos grandes
    if (selectedFile.size > 300 * 1024 * 1024) { // 300MB
      setImportStatus(`AVISO: Arquivo grande detectado (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB). O processamento pode demorar até 30 minutos.`);
    }

    setFile(selectedFile);
    setError('');
    setImportStatus('');
    setDetailedReport('');
    setProcessingSteps([]);
  };

  // Função para verificar progresso da importação em tempo real
  const checkImportProgress = async () => {
    try {
      const progressResponse = await fetchWithAuth(`${API_URL}/study-tools/flashcards/apkg-fsrs/import-progress/${user.uid}`);
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        
        if (progressData.success && progressData.data) {
          const { isActive, steps, currentProgress } = progressData.data;
          
          // ✅ ATUALIZAR PROGRESSO REAL DO BACKEND
          if (currentProgress !== undefined && currentProgress >= 0) {
            setProcessingProgress(currentProgress);
          }
          
          // ✅ ATUALIZAR ETAPAS REAIS DO BACKEND
          if (steps && steps.length > 0) {
            // Substituir todas as etapas pelas reais do backend
            const realSteps = steps.map(step => ({
              step: step.step,
              status: step.status,
              timestamp: step.timestamp,
              details: step.details
            }));
            
            setProcessingSteps(realSteps);
            
            const lastStep = steps[steps.length - 1];
            
            // ✅ VERIFICAR SE IMPORTAÇÃO FOI CONCLUÍDA
            if (lastStep.status === 'completed' && lastStep.step.includes('concluída')) {
              const report = lastStep.details || generateDetailedReport([]);
              setDetailedReport(report);
              setImportStatus('Importação concluída com sucesso!');
              setIsProcessing(false);
              setProcessingProgress(100);
              
              // Verificar novos decks e notificar componente pai
              const foundDecks = await checkForNewDecks();
              if (foundDecks && Array.isArray(foundDecks)) {
                onImportSuccess(foundDecks);
              }
              return true;
            }
            
            // ✅ VERIFICAR SE HOUVE ERRO
            if (lastStep.status === 'error') {
              setError(lastStep.details || 'Erro no processamento');
              setIsProcessing(false);
              return true;
            }
          }
          
          // ✅ SE NÃO ESTÁ MAIS ATIVO, FINALIZAR
          if (!isActive) {
            setIsProcessing(false);
            setProcessingProgress(100);
            
            // Verificar novos decks mesmo sem progresso ativo
            const foundDecks = await checkForNewDecks();
            if (foundDecks && Array.isArray(foundDecks)) {
              setImportStatus('Importação concluída!');
              onImportSuccess(foundDecks);
            }
            return true;
          }
          
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Erro ao verificar progresso FSRS:', error);
      return false;
    }
  };

  // 🚀 FUNÇÃO OTIMIZADA: Verificar novos decks usando metadados
  const checkForNewDecks = async () => {
    try {
      // Usar API de metadados primeiro (mais rápido)
      const metadataResponse = await fetchWithAuth(`${API_URL}/admin/flashcards/collections/metadata`);
      
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        if (metadataData.success && metadataData.data?.collections) {
          // Retornar informações básicas dos metadados
          return metadataData.data.collections;
        }
      }
      
      // Fallback para API tradicional se metadados falharem
      const decksResponse = await fetchWithAuth(`${API_URL}/admin/flashcards/decks?limit=200`);
      
      if (!decksResponse.ok) {
        return false;
      }
      
      const decksData = await decksResponse.json();
      
      if (decksData.success && decksData.data && decksData.data.length > 0) {
        // Verificar se temos novos decks com base no timestamp
        const now = new Date();
        const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
        
        const recentDecks = decksData.data.filter(deck => {
          let deckDate;
          if (deck.createdAt && typeof deck.createdAt === 'object') {
            if (deck.createdAt._seconds) {
              deckDate = new Date(deck.createdAt._seconds * 1000 + (deck.createdAt._nanoseconds || 0) / 1000000);
            } else if (deck.createdAt.seconds) {
              deckDate = new Date(deck.createdAt.seconds * 1000 + (deck.createdAt.nanoseconds || 0) / 1000000);
            } else {
              deckDate = new Date(deck.createdAt);
            }
          } else {
            deckDate = new Date(deck.createdAt);
          }
          
          return deckDate > threeMinutesAgo;
        });
        
        if (recentDecks.length > 0) {
          // Encontramos decks recém-criados! Retornar os decks para processamento
          console.log('✅ Decks encontrados para processamento:', recentDecks.length);
          return recentDecks;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar novos decks:', error);
      return null;
    }
  };

  // Função para gerar relatório detalhado
  const generateDetailedReport = (decks) => {
    const totalCards = decks.reduce((sum, deck) => sum + (deck.flashcardCount || 0), 0);
    const fsrsDecks = decks.filter(deck => deck.fsrsEnabled).length;
    
    let report = 'IMPORTACAO CONCLUIDA COM SUCESSO\n';
    report += '='.repeat(50) + '\n\n';
    
    if (decks.length === 1) {
      report += `NOVA COLECAO CRIADA (${decks[0].collection || 'Sem nome'})\n`;
    } else {
      report += `COLECAO ATUALIZADA - MERGE\n`;
    }
    
    report += `• ${decks.length} deck(s) processado(s)\n`;
    report += `• ${totalCards} card(s) importado(s)\n\n`;
    
    if (totalCards === 0) {
      report += 'SOMENTE TEXTO\n';
      report += '• Nenhum arquivo de mídia encontrado no APKG\n\n';
    }
    
    report += 'ESTATISTICAS DETALHADAS\n';
    report += `• Total de decks processados: ${decks.length}\n`;
    report += `• Total de cards processados: ${totalCards}\n`;
    report += `• Decks novos: ${decks.length} | Decks existentes: 0\n\n`;
    
    if (useFSRS && fsrsDecks > 0) {
      report += 'ALGORITMO FSRS v4.5 ATIVO\n';
      report += `• Todos os ${totalCards} cards configurados com FSRS\n`;
      report += '• Sistema de repetição espaçada otimizado\n';
      report += '• Migração SM-2 → FSRS v4.5 concluída\n';
    }
    
    report += '\n' + '='.repeat(50);
    
    return report;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Selecione um arquivo para importar.');
      return;
    }

    // Resetar estados
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingProgress(0);
    setError('');
    setImportStatus('');
    setDetailedReport('');
    setProcessingSteps([]);
    startTimeRef.current = Date.now();
    
    // Notificar o componente pai que a importação começou
    if (onImportStart) {
      onImportStart();
    }

    // Adicionar primeira etapa
    addProcessingStep('Iniciando upload do arquivo', 'processing');

    // Criar FormData para upload
    const formData = new FormData();
    formData.append('apkgFile', file);

    try {
      // Configurar upload com progresso usando XMLHttpRequest
      const xhr = new XMLHttpRequest();
      
      // Configurar evento de progresso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentCompleted);
          
          if (percentCompleted === 100) {
            updateLastStep('completed', 'Upload concluído');
            addProcessingStep('Processando arquivo APKG', 'processing');
          }
        }
      });

      // Criar uma Promise para gerenciar o XHR
      const response = await new Promise((resolve, reject) => {
        // Escolher a rota baseada na opção FSRS
        const importUrl = useFSRS 
          ? `${API_URL}/study-tools/flashcards/apkg-fsrs/import`
          : `${API_URL}/study-tools/flashcards/apkg/import`;
        
        xhr.open('POST', importUrl);
        
        // Adicionar token de autenticação
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(responseData);
            } catch (e) {
              reject({
                status: xhr.status,
                statusText: 'Invalid JSON response',
                response: xhr.responseText
              });
            }
          } else {
            reject({
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText
            });
          }
        };
        
        xhr.onerror = function() {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText
          });
        };

        // Configurar timeout para a requisição
        xhr.timeout = 1800000; // 30 minutos
        xhr.ontimeout = function() {
          reject({
            status: 408,
            statusText: 'Request Timeout',
            response: 'A requisição excedeu o tempo limite de 30 minutos'
          });
        };
        
        xhr.send(formData);
      });
      
      // Verificar resposta
      if (response.success) {
        
        // Se o servidor indicar que está processando em background
        if (response.processing) {
          setIsUploading(false);
          setIsProcessing(true);
          updateLastStep('completed', 'Arquivo enviado');
          addProcessingStep('Aguardando processamento do servidor', 'processing');
          setImportStatus('Arquivo enviado com sucesso. Processando...');
          
          // Limpar intervalos anteriores se existirem
          clearAllIntervals();
          
          // ✅ POLLING OTIMIZADO - Reduzir frequência para economizar leituras
          checkIntervalRef.current = setInterval(async () => {
            const progressFound = await checkImportProgress();
            if (progressFound) {
              clearAllIntervals();
            }
          }, 5000); // ✅ MUDANÇA: 5 segundos em vez de 1 segundo
          
          // Timeout final após 10 minutos
          timeoutRef.current = setTimeout(() => {
            if (isProcessing) {
              clearAllIntervals();
              updateLastStep('warning', 'Timeout atingido');
              addProcessingStep('Processamento pode ter sido concluído', 'warning');
              setIsProcessing(false);
              setProcessingProgress(100);
              setImportStatus('Processamento pode ter sido concluído. Verifique sua lista de coleções.');
              
              // Notificar componente pai para atualizar a lista
              onImportSuccess([]);
              setFile(null);
            }
          }, 600000); // 10 minutos
          
        } else {
          // Processamento síncrono concluído
          toast({
            title: 'Sucesso',
            description: response.message,
            status: 'success',
          });
          
          // Limpar formulário
          setFile(null);
          
          // Notificar componente pai
          if (onImportSuccess && response.decks) {
            onImportSuccess(response.decks);
          }
          
          setIsUploading(false);
          setIsProcessing(false);
        }
      } else {
        setError(response.message || 'Erro ao importar arquivo.');
        setIsUploading(false);
        setIsProcessing(false);
        updateLastStep('error', response.message);
      }
    } catch (error) {
      console.error('Erro ao importar arquivo APKG:', error);
      
      // Se for timeout, pode ser que o processamento tenha sido concluído com sucesso
      if (error.status === 408) {
        setIsUploading(false);
        setIsProcessing(true);
        updateLastStep('warning', 'Timeout, mas processamento pode continuar');
        addProcessingStep('Servidor processando em background', 'processing');
        setImportStatus('O servidor está processando seu arquivo. Isso pode demorar alguns minutos.');
        
        // Limpar intervalos anteriores
        clearAllIntervals();
        
        // Verificar progresso em tempo real após timeout
        checkIntervalRef.current = setInterval(async () => {
          const progressFound = await checkImportProgress();
          if (progressFound) {
            clearAllIntervals();
          } else {
            const found = await checkForNewDecks();
            if (found) {
              clearAllIntervals();
            }
          }
        }, 10000); // ✅ MUDANÇA: 10 segundos em vez de 3 segundos
        
        // Timeout final após 2 minutos adicionais
        timeoutRef.current = setTimeout(() => {
          clearAllIntervals();
          setIsProcessing(false);
          setProcessingProgress(100);
          setImportStatus('Processamento concluído. Verifique sua lista de coleções.');
          onImportSuccess([]);
          setFile(null);
        }, 120000);
      } else {
        setError(error.response?.message || 'Erro ao processar arquivo. Verifique o formato e tente novamente.');
        setIsUploading(false);
        setIsProcessing(false);
        updateLastStep('error', error.response?.message || 'Erro desconhecido');
      }
    }
  };

  // Resetar estado quando o componente for desmontado
  useEffect(() => {
    return () => {
      clearAllIntervals();
      setIsUploading(false);
      setIsProcessing(false);
      setFile(null);
      setError('');
      setImportStatus('');
      setDetailedReport('');
      setProcessingSteps([]);
    };
  }, []);

  // Calcular tempo decorrido
  const getElapsedTime = () => {
    if (!startTimeRef.current) return '';
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 🚀 LAZY LOADING: Não renderizar até estar ativo
  if (!isComponentActive) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h2 className="text-lg font-medium mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Instruções para Importação
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Formatos suportados: <strong>.apkg</strong> (Anki Package) e <strong>.colpkg</strong> (Anki Collection)</li>
          <li>Tamanho máximo: <strong>1GB</strong> (ideal até 500MB para melhor performance)</li>
          <li>Os decks importados serão privados por padrão</li>
          <li>Você poderá editar, publicar ou excluir os decks após a importação</li>
          <li>Imagens e formatação avançada serão preservadas quando possível</li>
          <li><strong>Importante:</strong> Arquivos grandes (300MB+) podem demorar até 30 minutos para processar</li>
          <li><strong>Dica:</strong> Mantenha a aba aberta durante todo o processo</li>
        </ul>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </Alert>
      )}
      
      {importStatus && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {importStatus}
        </Alert>
      )}

      {/* Log de Processamento */}
      {processingSteps.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <h3 className="text-sm font-medium mb-3 flex items-center justify-between">
            Log de Processamento
            {(isUploading || isProcessing) && (
              <span className="text-xs text-gray-500">
                Tempo: {getElapsedTime()}
              </span>
            )}
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {processingSteps.map((step, index) => (
              <div key={index} className="flex items-center text-xs">
                <span className="text-gray-400 mr-2">{step.timestamp}</span>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'error' ? 'bg-red-500' :
                  step.status === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500 animate-pulse'
                }`}></div>
                <span className="flex-1">{step.step}</span>
                {step.details && (
                  <span className="text-gray-500 ml-2">({step.details})</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Relatório Detalhado */}
      {detailedReport && (
        <Card className="p-4 bg-green-50 border-green-200">
          <h3 className="text-sm font-medium mb-3 text-green-800">Relatório de Importação</h3>
          <pre className="text-xs text-green-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
            {detailedReport}
          </pre>
        </Card>
      )}

      <Card className="p-6 border border-dashed border-gray-300">
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium mb-1">Selecione um arquivo para importar</h3>
            <p className="text-sm text-gray-500">Arraste e solte ou clique para selecionar</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="apkg-file">Arquivo APKG/COLPKG</Label>
              <Input
                id="apkg-file"
                type="file"
                accept=".apkg,.colpkg"
                onChange={handleFileChange}
                disabled={isUploading || isProcessing}
                className="mt-1"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Arquivo selecionado: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  {file.size > 300 * 1024 * 1024 && (
                    <span className="text-orange-600 block">
                      AVISO: Arquivo grande - processamento pode demorar até 30 minutos
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          {/* Opção FSRS */}
          <div className="flex items-center space-x-2 mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <input
              id="use-fsrs"
              type="checkbox"
              checked={useFSRS}
              onChange={(e) => setUseFSRS(e.target.checked)}
              disabled={isUploading || isProcessing}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="use-fsrs" className="text-sm font-medium text-gray-900 cursor-pointer">
                Usar FSRS (Algoritmo Inteligente de Repetição) 
                <span className="bg-green-100 text-green-800 text-xs font-medium ml-2 px-2.5 py-0.5 rounded">
                  RECOMENDADO
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1">
                {useFSRS 
                  ? "Cards terão agendamento otimizado por IA (90-95% de retenção, 15-25% menos tempo de estudo)"
                  : "Será usado o algoritmo SM-2 clássico (menos eficiente que FSRS)"
                }
              </p>
            </div>
          </div>
          
          {isUploading && !isProcessing && (
            <div className="w-full mt-4">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center mt-1">Enviando arquivo... {uploadProgress}%</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="w-full mt-4">
              <Progress value={processingProgress} className="h-2" />
              <p className="text-xs text-center mt-1">Processando arquivo... {Math.round(processingProgress)}%</p>
              <p className="text-xs text-center mt-1 text-amber-600">
                Isso pode demorar vários minutos para arquivos grandes. Não feche esta janela.
              </p>
            </div>
          )}
          
          <Button
            onClick={handleImport}
            disabled={!file || isUploading || isProcessing}
            className="w-full"
            variant={file ? "default" : "outline"}
          >
            {isUploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando ({uploadProgress}%)
              </div>
            ) : isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando ({Math.round(processingProgress)}%)
              </div>
            ) : (
              'Importar Flashcards'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};