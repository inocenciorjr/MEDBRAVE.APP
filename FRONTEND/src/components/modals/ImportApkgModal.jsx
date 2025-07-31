import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Upload, FileText, AlertCircle, CheckCircle, 
  Loader, Info, AlertTriangle, Database, X
} from 'lucide-react';
import fetchWithAuth from '../../services/fetchWithAuth';

const API_URL = '/api/flashcards';

const ImportApkgModal = ({ isOpen, onClose, onSuccess }) => {
  // Estados principais
  const [step, setStep] = useState(1); // 1: Seleção, 2: Processando/Preview, 3: Confirmação
  const [selectedFile, setSelectedFile] = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState('ignore'); // 'ignore' ou 'overwrite'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [processedData, setProcessedData] = useState(null);

  // Refs
  const fileInputRef = useRef(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const resetModal = () => {
    setStep(1);
    setSelectedFile(null);
    setDuplicateHandling('ignore');
    setLoading(false);
    setError('');
    setPreviewData(null);
    setProcessedData(null);
  };

  // Validação do arquivo
  const validateApkgFile = (file) => {
    if (!file) return 'Nenhum arquivo selecionado';
    if (!file.name.toLowerCase().endsWith('.apkg')) return 'Arquivo deve ter extensão .apkg';
    if (file.size > 500 * 1024 * 1024) return 'Arquivo muito grande (máximo 500MB)';
    if (file.size === 0) return 'Arquivo está vazio';
    return null;
  };

  // Processar arquivo (ÚNICO processamento)
  const processFile = async (file) => {
    setError('');
    setLoading(true);
    setStep(2);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicateHandling', duplicateHandling);
      formData.append('previewOnly', 'true'); // Não salvar ainda

      // Processamento silencioso - sem logs desnecessários

      const response = await fetchWithAuth(`${API_URL}/apkg-fsrs/import`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro no processamento');
      }

      // Processamento bem-sucedido
      setProcessedData(result);
      setPreviewData(result.preview || result.stats);
      setStep(3); // Ir para confirmação

    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError(error.message);
      setStep(1); // Voltar para seleção
    } finally {
      setLoading(false);
    }
  };

  // Selecionar arquivo e processar automaticamente
  const handleFileSelect = async (file) => {
    const validationError = validateApkgFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError('');

    // Processar automaticamente após seleção
    await processFile(file);
  };

  // Confirmar e salvar
  const handleConfirmSave = async () => {
    if (!processedData) return;

    setLoading(true);
    setError('');

    try {
      // Chamar endpoint para salvar os dados processados
      const response = await fetchWithAuth(`${API_URL}/apkg-fsrs/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: processedData.sessionId,
          duplicateHandling
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar: ${response.status}`);
      }

      const result = await response.json();
      
      // Salvamento bem-sucedido
      if (onSuccess) onSuccess(result);
      onClose();

    } catch (error) {
      // Erro silencioso - exibe mensagem amigável
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatar tamanho de arquivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
              backgroundColor: 'var(--color-blue-light)'
            }}>
              <Upload className="w-5 h-5" style={{color: 'var(--color-blue)'}} />
            </div>
            <div>
              <DialogTitle>Importar Arquivo Anki</DialogTitle>
              <DialogDescription>
                {step === 1 && 'Selecione um arquivo .apkg'}
                {step === 2 && 'Processando arquivo...'}
                {step === 3 && 'Confirmar importação'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* STEP 1: Seleção do arquivo + Configuração de duplicatas */}
          {step === 1 && (
            <div className="space-y-6">
              
              {/* Área de upload */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-muted)'}} />
                <h3 className="text-lg font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Clique para selecionar arquivo
                </h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Ou arraste e solte um arquivo .apkg aqui
                </p>
                <p className="text-xs mt-2" style={{color: 'var(--text-muted)'}}>
                  Máximo 500MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".apkg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              {/* Configuração de duplicatas */}
              <div className="space-y-3">
                <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>
                  Como tratar cards duplicados?
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="ignore"
                      checked={duplicateHandling === 'ignore'}
                      onChange={(e) => setDuplicateHandling(e.target.value)}
                      style={{accentColor: 'var(--color-blue)'}}
                    />
                    <div>
                      <div className="font-medium" style={{color: 'var(--text-primary)'}}>
                        Ignorar duplicados
                      </div>
                      <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        Pular cards que já existem
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="overwrite"
                      checked={duplicateHandling === 'overwrite'}
                      onChange={(e) => setDuplicateHandling(e.target.value)}
                      style={{accentColor: 'var(--color-blue)'}}
                    />
                    <div>
                      <div className="font-medium" style={{color: 'var(--text-primary)'}}>
                        Sobrescrever duplicados
                      </div>
                      <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        Atualizar cards existentes
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="rounded-lg p-4" style={{
                  backgroundColor: 'var(--color-red-light)',
                  borderColor: 'var(--color-red-border)',
                  border: '1px solid'
                }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" style={{color: 'var(--color-red)'}} />
                    <p style={{color: 'var(--color-red-dark)'}}>{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Processando */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Loader className="w-12 h-12 mx-auto animate-spin mb-4" style={{color: 'var(--color-blue)'}} />
                <h3 className="text-lg font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Processando arquivo...
                </h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Analisando estrutura e convertendo para FSRS
                </p>
              </div>
              
              {selectedFile && (
                <div className="rounded-lg p-4" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8" style={{color: 'var(--color-blue)'}} />
                    <div>
                      <div className="font-medium" style={{color: 'var(--text-primary)'}}>
                        {selectedFile.name}
                      </div>
                      <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview e Confirmação */}
          {step === 3 && previewData && (
            <div className="space-y-6">
              <div className="rounded-lg p-4" style={{
                backgroundColor: 'var(--color-green-light)',
                borderColor: 'var(--color-green-border)',
                border: '1px solid'
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" style={{color: 'var(--color-green)'}} />
                  <h3 className="font-medium" style={{color: 'var(--color-green-dark)'}}>
                    Arquivo processado com sucesso!
                  </h3>
                </div>
                <p className="text-sm" style={{color: 'var(--color-green-dark)'}}>
                  Pronto para importar para sua biblioteca de flashcards
                </p>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--color-blue)'}}>
                    {previewData.totalDecks || previewData.collections || 0}
                  </div>
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Coleções
                  </div>
                </div>
                <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--color-green)'}}>
                    {previewData.totalCards || previewData.cards || 0}
                  </div>
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Cards
                  </div>
                </div>
                <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--color-purple)'}}>
                    {previewData.newCards || 0}
                  </div>
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Novos
                  </div>
                </div>
                <div className="rounded-lg p-4 text-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--color-orange)'}}>
                    {previewData.duplicates || 0}
                  </div>
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Duplicados
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmSave}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader className="w-4 h-4 animate-spin" />}
                  Confirmar Importação
                </Button>
              </div>
            </div>
          )}

          {/* Erro geral */}
          {error && step !== 1 && (
            <div className="rounded-lg p-4" style={{
              backgroundColor: 'var(--color-red-light)',
              borderColor: 'var(--color-red-border)',
              border: '1px solid'
            }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{color: 'var(--color-red)'}} />
                <p style={{color: 'var(--color-red-dark)'}}>{error}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportApkgModal; 