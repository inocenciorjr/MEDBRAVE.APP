import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE = '/api/flashcards';

// Tipos para APKG
export interface ApkgPreview {
  fileName: string;
  fileSize: number;
  deckName: string;
  cardCount: number;
  mediaCount: number;
  sampleCards: Array<{
    front: string;
    back: string;
    tags: string[];
  }>;
  warnings?: string[];
}

export interface ApkgImportResult {
  success: boolean;
  deck_id: string;
  deckName: string;
  cardsImported: number;
  mediaFiles: number;
  warnings: string[];
}

export interface ApkgImportData {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  category?: string;
}

/**
 * 🔍 Validar arquivo APKG
 */
export function validateApkgFile(file: File): { valid: boolean; error?: string } {
  // Verificar extensão
  if (!file.name.toLowerCase().endsWith('.apkg')) {
    return {
      valid: false,
      error: 'Arquivo deve ter extensão .apkg'
    };
  }
  
  // Verificar tamanho (máximo 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Máximo permitido: 50MB'
    };
  }
  
  // Verificar se não está vazio
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Arquivo está vazio'
    };
  }
  
  return { valid: true };
}

/**
 * 👀 Fazer preview do arquivo APKG
 */
export async function previewApkgFile(file: File): Promise<ApkgPreview> {
  console.log('👀 [previewApkgFile] Iniciando preview APKG:', file.name);
  
  // Validar arquivo primeiro
  const validation = validateApkgFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const formData = new FormData();
  formData.append('apkgFile', file);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/preview-apkg`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao fazer preview APKG: ${errorData.error || res.statusText}`);
    }
    
    const preview = await res.json();
    console.log('✅ [previewApkgFile] Preview gerado:', preview);
    
    return {
      fileName: file.name,
      fileSize: file.size,
      deckName: preview.deckName || 'Deck Importado',
      cardCount: preview.cardCount || 0,
      mediaCount: preview.mediaCount || 0,
      sampleCards: preview.sampleCards || [],
      warnings: preview.warnings || []
    };
  } catch (error) {
    console.error('❌ [previewApkgFile] Erro:', error);
    throw error;
  }
}

/**
 * 📦 Importar arquivo APKG
 */
export async function importApkgFile(file: File, importData: ApkgImportData): Promise<ApkgImportResult> {
  console.log('📦 [importApkgFile] Iniciando importação APKG:', file.name);
  
  // Validar arquivo primeiro
  const validation = validateApkgFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const formData = new FormData();
  formData.append('apkgFile', file);
  formData.append('importData', JSON.stringify(importData));
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/import-apkg`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao importar APKG: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    console.log('✅ [importApkgFile] APKG importado com sucesso:', result);
    
    return {
      success: true,
      deck_id: result.deck_id,
      deckName: result.deckName,
      cardsImported: result.cardsImported || 0,
      mediaFiles: result.mediaFiles || 0,
      warnings: result.warnings || []
    };
  } catch (error) {
    console.error('❌ [importApkgFile] Erro:', error);
    throw error;
  }
}

/**
 * 📊 Obter estatísticas de importações do usuário
 */
export async function getImportHistory() {
  console.log('📊 [getImportHistory] Buscando histórico de importações...');
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/import-history`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar histórico: ${errorData.error || res.statusText}`);
    }
    
    const history = await res.json();
    console.log('✅ [getImportHistory] Histórico obtido:', history);
    return history;
  } catch (error) {
    console.error('❌ [getImportHistory] Erro:', error);
    return [];
  }
}

/**
 * 🗑️ Cancelar importação em progresso
 */
export async function cancelImport(importId: string) {
  console.log('🗑️ [cancelImport] Cancelando importação:', importId);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/import/${importId}/cancel`, {
      method: 'POST',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao cancelar importação: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    console.log('✅ [cancelImport] Importação cancelada:', result);
    return result;
  } catch (error) {
    console.error('❌ [cancelImport] Erro:', error);
    throw error;
  }
}

/**
 * 🔄 Obter status de importação em progresso
 */
export async function getImportStatus(importId: string) {
  console.log('🔄 [getImportStatus] Verificando status da importação:', importId);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/import/${importId}/status`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao verificar status: ${errorData.error || res.statusText}`);
    }
    
    const status = await res.json();
    console.log('✅ [getImportStatus] Status obtido:', status);
    return status;
  } catch (error) {
    console.error('❌ [getImportStatus] Erro:', error);
    throw error;
  }
}

// Export do serviço como objeto
export const apkgService = {
  validateApkgFile,
  previewApkgFile,
  importApkgFile,
  getImportHistory,
  cancelImport,
  getImportStatus,
};

export default apkgService;