import { Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import { firestore, storage } from '../../../config/firebaseAdmin';
import { IDataImportExportService } from '../interfaces/IDataImportExportService';
import {
  DataJob,
  CreateDataJobDTO,
  UpdateDataJobStatusDTO,
  GetDataJobsOptions,
  DataJobStatus,
  DataJobType,
  DataFormat,
} from '../types';
import logger from '../../../utils/logger';

/**
 * Coleção para armazenar jobs de importação/exportação
 */
const DATA_JOBS_COLLECTION = 'dataJobs';

/**
 * Implementação do serviço de importação e exportação usando Firebase
 */
export class FirebaseDataImportExportService implements IDataImportExportService {
  /**
   * Cria um novo job de importação/exportação de dados
   */
  async createDataJob(jobData: CreateDataJobDTO): Promise<DataJob> {
    const jobRef = firestore.collection(DATA_JOBS_COLLECTION).doc();
    const now = Timestamp.now();

    const newJob: DataJob = {
      id: jobRef.id,
      ...jobData,
      status: DataJobStatus.PENDING,
      progress: 0,
      totalRecords: null,
      processedRecords: 0,
      startedAt: null,
      completedAt: null,
      resultUrl: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await jobRef.set(newJob);
      logger.info(
        `Job de ${jobData.type === DataJobType.IMPORT ? 'importação' : 'exportação'} (ID: ${newJob.id}) criado com sucesso.`,
      );
      return newJob;
    } catch (error) {
      logger.error(
        `Erro ao criar job de ${jobData.type === DataJobType.IMPORT ? 'importação' : 'exportação'}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Busca um job de importação/exportação pelo ID
   */
  async getDataJobById(jobId: string): Promise<DataJob | null> {
    try {
      const docRef = firestore.collection(DATA_JOBS_COLLECTION).doc(jobId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return docSnap.data() as DataJob;
      }

      logger.warn(`Job de importação/exportação (ID: ${jobId}) não encontrado.`);
      return null;
    } catch (error) {
      logger.error(`Erro ao buscar job de importação/exportação (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Busca jobs de importação/exportação com opções de filtro
   */
  async getDataJobs(options: GetDataJobsOptions = {}): Promise<{ jobs: DataJob[]; total: number }> {
    try {
      const collectionRef = firestore.collection(DATA_JOBS_COLLECTION);
      let query: FirebaseFirestore.Query = collectionRef;

      // Aplicar filtros
      if (options.type) {
        query = query.where('type', '==', options.type);
      }

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      if (options.collection) {
        query = query.where('collection', '==', options.collection);
      }

      if (options.createdBy) {
        query = query.where('createdBy', '==', options.createdBy);
      }

      // Filtrar por intervalo de datas
      if (options.startDate) {
        const startTimestamp = Timestamp.fromDate(options.startDate);
        query = query.where('createdAt', '>=', startTimestamp);
      }

      if (options.endDate) {
        const endTimestamp = Timestamp.fromDate(options.endDate);
        query = query.where('createdAt', '<=', endTimestamp);
      }

      // Contar o total antes de aplicar paginação
      const countQuery = query;
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      // Aplicar ordenação
      if (options.orderByCreatedAt) {
        query = query.orderBy('createdAt', options.orderByCreatedAt);
      } else {
        query = query.orderBy('createdAt', 'desc'); // Padrão: mais recentes primeiro
      }

      // Aplicar paginação
      if (options.offset) {
        query = query.offset(options.offset);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();

      const jobs: DataJob[] = [];
      snapshot.forEach(doc => {
        jobs.push(doc.data() as DataJob);
      });

      return { jobs, total };
    } catch (error) {
      logger.error('Erro ao buscar jobs de importação/exportação:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de um job de importação/exportação
   */
  async updateDataJobStatus(
    jobId: string,
    status: DataJobStatus,
    updates: UpdateDataJobStatusDTO = {},
  ): Promise<DataJob | null> {
    try {
      const jobRef = firestore.collection(DATA_JOBS_COLLECTION).doc(jobId);
      const now = Timestamp.now();

      const updateData: Record<string, any> = {
        status,
        updatedAt: now,
      };

      if (status === DataJobStatus.PROCESSING && !updates.error) {
        updateData.startedAt = updateData.startedAt || now;
      }

      if (
        status === DataJobStatus.COMPLETED ||
        status === DataJobStatus.FAILED ||
        status === DataJobStatus.CANCELLED
      ) {
        updateData.completedAt = now;
      }

      if (updates.progress !== undefined) {
        updateData.progress = updates.progress;
      }

      if (updates.totalRecords !== undefined) {
        updateData.totalRecords = updates.totalRecords;
      }

      if (updates.processedRecords !== undefined) {
        updateData.processedRecords = updates.processedRecords;
      }

      if (updates.resultUrl) {
        updateData.resultUrl = updates.resultUrl;
      }

      if (updates.error) {
        updateData.error = updates.error;
      }

      await jobRef.update(updateData);
      logger.info(
        `Status do job de importação/exportação (ID: ${jobId}) atualizado para ${status}.`,
      );

      const updatedDoc = await jobRef.get();
      return updatedDoc.exists ? (updatedDoc.data() as DataJob) : null;
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do job de importação/exportação (ID: ${jobId}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cancela um job de importação/exportação
   */
  async cancelDataJob(jobId: string): Promise<DataJob | null> {
    try {
      const job = await this.getDataJobById(jobId);
      if (!job) {
        logger.warn(`Job de importação/exportação (ID: ${jobId}) não encontrado.`);
        return null;
      }

      if (job.status !== DataJobStatus.PENDING && job.status !== DataJobStatus.PROCESSING) {
        logger.warn(`Não é possível cancelar um job com status ${job.status}.`);
        return job;
      }

      return this.updateDataJobStatus(jobId, DataJobStatus.CANCELLED);
    } catch (error) {
      logger.error(`Erro ao cancelar job de importação/exportação (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Exclui um job de importação/exportação
   */
  async deleteDataJob(jobId: string): Promise<void> {
    try {
      const jobRef = firestore.collection(DATA_JOBS_COLLECTION).doc(jobId);

      // Verificar se o job existe
      const jobDoc = await jobRef.get();
      if (!jobDoc.exists) {
        logger.warn(`Job de importação/exportação (ID: ${jobId}) não encontrado para exclusão.`);
        return;
      }

      const job = jobDoc.data() as DataJob;

      // Se houver um arquivo de resultado, excluí-lo do storage
      if (job.resultUrl) {
        try {
          const urlPath = new URL(job.resultUrl).pathname;
          const storagePath = decodeURIComponent(urlPath.split('/o/')[1].split('?')[0]);
          await storage.bucket().file(storagePath).delete();
          logger.info(`Arquivo de resultado excluído do storage: ${storagePath}`);
        } catch (storageError) {
          logger.error('Erro ao excluir arquivo de resultado do storage:', storageError);
          // Continuar mesmo se falhar a exclusão do arquivo
        }
      }

      // Excluir o job
      await jobRef.delete();
      logger.info(`Job de importação/exportação (ID: ${jobId}) excluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao excluir job de importação/exportação (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Executa um job de exportação de dados
   */
  async executeExportJob(jobId: string): Promise<void> {
    try {
      // Obter o job
      const job = await this.getDataJobById(jobId);
      if (!job) {
        throw new Error(`Job de exportação (ID: ${jobId}) não encontrado.`);
      }

      if (job.type !== DataJobType.EXPORT) {
        throw new Error(`Job (ID: ${jobId}) não é um job de exportação.`);
      }

      if (job.status !== DataJobStatus.PENDING) {
        throw new Error(
          `Job de exportação (ID: ${jobId}) não está pendente (status: ${job.status}).`,
        );
      }

      // Atualizar o status para "processando"
      await this.updateDataJobStatus(jobId, DataJobStatus.PROCESSING);

      // Construir a consulta
      const collectionRef = firestore.collection(job.collection);
      let query: FirebaseFirestore.Query = collectionRef;

      // Aplicar filtros, se houver
      if (job.query) {
        for (const [field, value] of Object.entries(job.query)) {
          if (typeof value === 'object' && value !== null) {
            // Suporte para operadores de comparação
            if (value.operator && value.value !== undefined) {
              switch (value.operator) {
                case '==':
                  query = query.where(field, '==', value.value);
                  break;
                case '!=':
                  query = query.where(field, '!=', value.value);
                  break;
                case '>':
                  query = query.where(field, '>', value.value);
                  break;
                case '>=':
                  query = query.where(field, '>=', value.value);
                  break;
                case '<':
                  query = query.where(field, '<', value.value);
                  break;
                case '<=':
                  query = query.where(field, '<=', value.value);
                  break;
                case 'array-contains':
                  query = query.where(field, 'array-contains', value.value);
                  break;
                case 'array-contains-any':
                  query = query.where(field, 'array-contains-any', value.value);
                  break;
                case 'in':
                  query = query.where(field, 'in', value.value);
                  break;
                case 'not-in':
                  query = query.where(field, 'not-in', value.value);
                  break;
              }
            }
          } else {
            // Filtro simples de igualdade
            query = query.where(field, '==', value);
          }
        }
      }

      // Executar a consulta
      const snapshot = await query.get();

      // Atualizar o total de registros
      const totalRecords = snapshot.size;
      await this.updateDataJobStatus(jobId, DataJobStatus.PROCESSING, {
        totalRecords,
      });

      if (totalRecords === 0) {
        throw new Error('Nenhum registro encontrado para exportação.');
      }

      // Extrair os dados
      const data: Record<string, any>[] = [];
      snapshot.forEach(doc => {
        const docData = doc.data();

        // Adicionar o ID do documento
        const item = { id: doc.id, ...docData };

        // Converter Timestamps para strings ISO
        for (const [key, value] of Object.entries(item)) {
          if (
            value &&
            typeof value !== 'string' &&
            typeof (value as any).toDate === 'function' &&
            typeof (value as any).toMillis === 'function'
          ) {
            (item as Record<string, any>)[key] = (value as any).toDate().toISOString();
          }
        }

        data.push(item);
      });

      // Criar diretório temporário
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let filePath: string;
      let contentType: string;

      // Exportar no formato especificado
      if (job.format === DataFormat.JSON) {
        filePath = path.join(tempDir, `${job.collection}_${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        contentType = 'application/json';
      } else if (job.format === DataFormat.CSV) {
        filePath = path.join(tempDir, `${job.collection}_${timestamp}.csv`);

        // Determinar os cabeçalhos
        const headers = new Set<string>();
        data.forEach(item => {
          Object.keys(item).forEach(key => headers.add(key));
        });

        // Aplicar mapeamentos, se houver
        const mappings = job.mappings || {};
        const csvWriter = createObjectCsvWriter({
          path: filePath,
          header: Array.from(headers).map(header => ({
            id: header,
            title: mappings[header] || header,
          })),
        });

        await csvWriter.writeRecords(data);
        contentType = 'text/csv';
      } else {
        throw new Error(`Formato de exportação não suportado: ${job.format}`);
      }

      // Fazer upload para o Storage
      const storagePath = `exports/${job.collection}/${path.basename(filePath)}`;
      const file = storage.bucket().file(storagePath);

      await file.save(fs.readFileSync(filePath), {
        contentType,
        metadata: {
          contentType,
          metadata: {
            jobId,
            collection: job.collection,
            format: job.format,
            timestamp,
            recordCount: totalRecords.toString(),
          },
        },
      });

      // Tornar o arquivo público (ou use URLs assinadas para maior segurança)
      await file.makePublic();

      // Obter a URL do arquivo
      const fileUrl = `https://storage.googleapis.com/${storage.bucket().name}/${storagePath}`;

      // Limpar o diretório temporário
      fs.unlinkSync(filePath);
      fs.rmdirSync(tempDir);

      // Atualizar o status do job para "concluído"
      await this.updateDataJobStatus(jobId, DataJobStatus.COMPLETED, {
        progress: 100,
        processedRecords: totalRecords,
        resultUrl: fileUrl,
      });

      logger.info(`Job de exportação (ID: ${jobId}) concluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao executar job de exportação (ID: ${jobId}):`, error);

      // Atualizar o status do job para "falha"
      await this.updateDataJobStatus(jobId, DataJobStatus.FAILED, {
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Executa um job de importação de dados
   */
  async executeImportJob(jobId: string): Promise<void> {
    try {
      // Obter o job
      const job = await this.getDataJobById(jobId);
      if (!job) {
        throw new Error(`Job de importação (ID: ${jobId}) não encontrado.`);
      }

      if (job.type !== DataJobType.IMPORT) {
        throw new Error(`Job (ID: ${jobId}) não é um job de importação.`);
      }

      if (job.status !== DataJobStatus.PENDING) {
        throw new Error(
          `Job de importação (ID: ${jobId}) não está pendente (status: ${job.status}).`,
        );
      }

      if (!job.sourceUrl) {
        throw new Error(`URL de origem não especificada para o job de importação (ID: ${jobId}).`);
      }

      // Atualizar o status para "processando"
      await this.updateDataJobStatus(jobId, DataJobStatus.PROCESSING);

      // Baixar o arquivo de origem
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-'));
      const filePath = path.join(tempDir, `import_${Date.now()}`);

      // Extrair o caminho do storage da URL
      const urlPath = new URL(job.sourceUrl).pathname;
      const storagePath = decodeURIComponent(urlPath.split('/o/')[1].split('?')[0]);

      // Baixar o arquivo do storage
      await storage.bucket().file(storagePath).download({ destination: filePath });

      let data: Record<string, any>[] = [];

      // Ler o arquivo no formato especificado
      if (job.format === DataFormat.JSON) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(fileContent);
      } else if (job.format === DataFormat.CSV) {
        const results: Record<string, any>[] = [];

        // Ler o CSV
        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data: any) => results.push(data))
            .on('end', () => {
              resolve();
            })
            .on('error', (error: any) => {
              reject(error);
            });
        });

        data = results;

        // Aplicar mapeamentos inversos, se houver
        if (job.mappings) {
          const inverseMappings: Record<string, string> = {};
          for (const [key, value] of Object.entries(job.mappings)) {
            inverseMappings[value] = key;
          }

          data = data.map(item => {
            const mappedItem: Record<string, any> = {};
            for (const [key, value] of Object.entries(item)) {
              const mappedKey = inverseMappings[key] || key;
              mappedItem[mappedKey] = value;
            }
            return mappedItem;
          });
        }
      } else {
        throw new Error(`Formato de importação não suportado: ${job.format}`);
      }

      // Atualizar o total de registros
      const totalRecords = data.length;
      await this.updateDataJobStatus(jobId, DataJobStatus.PROCESSING, {
        totalRecords,
      });

      if (totalRecords === 0) {
        throw new Error('Nenhum registro encontrado para importação.');
      }

      // Importar os dados para o Firestore
      const batch = firestore.batch();
      let batchCount = 0;
      let processedRecords = 0;

      for (const item of data) {
        // Extrair o ID, se houver
        const id = item.id;
        const docData = { ...item };
        delete docData.id;

        // Converter strings ISO para Timestamps
        for (const [key, value] of Object.entries(docData)) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                docData[key] = Timestamp.fromDate(date);
              }
            } catch (e) {
              // Manter como string se não for uma data válida
            }
          }
        }

        // Adicionar ao lote
        const docRef = id
          ? firestore.collection(job.collection).doc(id)
          : firestore.collection(job.collection).doc();

        batch.set(docRef, docData);
        batchCount++;

        // Commit o lote a cada 500 documentos (limite do Firestore)
        if (batchCount === 500) {
          await batch.commit();
          processedRecords += batchCount;
          batchCount = 0;

          // Atualizar o progresso
          const progress = Math.round((processedRecords / totalRecords) * 100);
          await this.updateDataJobStatus(jobId, DataJobStatus.PROCESSING, {
            progress,
            processedRecords,
          });
        }
      }

      // Commit o lote final
      if (batchCount > 0) {
        await batch.commit();
        processedRecords += batchCount;
      }

      // Limpar o diretório temporário
      fs.unlinkSync(filePath);
      fs.rmdirSync(tempDir);

      // Atualizar o status do job para "concluído"
      await this.updateDataJobStatus(jobId, DataJobStatus.COMPLETED, {
        progress: 100,
        processedRecords,
      });

      logger.info(`Job de importação (ID: ${jobId}) concluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao executar job de importação (ID: ${jobId}):`, error);

      // Atualizar o status do job para "falha"
      await this.updateDataJobStatus(jobId, DataJobStatus.FAILED, {
        error: (error as Error).message,
      });

      throw error;
    }
  }
}
