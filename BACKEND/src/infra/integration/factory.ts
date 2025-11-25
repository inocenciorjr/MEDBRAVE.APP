import { IDataImportExportService } from './interfaces/IDataImportExportService';
import { SupabaseDataImportExportService } from './supabase/SupabaseDataImportExportService';

// Instância singleton
let dataImportExportService: IDataImportExportService;

/**
 * Obtém uma instância do serviço de importação/exportação de dados
 * @returns Instância do serviço
 */
export function getDataImportExportService(): IDataImportExportService {
  if (!dataImportExportService) {
    dataImportExportService = new SupabaseDataImportExportService();
  }
  return dataImportExportService;
}

/**
 * Limpa a instância do serviço (útil para testes)
 */
export function clearDataImportExportService(): void {
  dataImportExportService = undefined as unknown as IDataImportExportService;
}
