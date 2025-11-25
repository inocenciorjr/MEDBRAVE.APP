import { Request, Response } from 'express';
import { TermoDailyWordRepository } from '../repositories/TermoDailyWordRepository';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema de validação para gerar palavra manualmente
const generateManualWordSchema = z.object({
  word: z.string().min(4).max(10),
  date: z.string().optional()
});

export class TermoAdminController {
  private dailyWordRepository: TermoDailyWordRepository;

  constructor(supabase: SupabaseClient) {
    this.dailyWordRepository = new TermoDailyWordRepository(supabase);
  }

  /**
   * Gera uma palavra do dia manualmente como administrador
   * Isso não afeta a geração automática diária
   */
  async generateManualDailyWord(req: Request, res: Response) {
    try {
      const validation = generateManualWordSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: validation.error.errors
        });
      }

      const { word, date } = validation.data;
      
      // Se não fornecer data, usa hoje
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Verifica se já existe uma palavra para esta data
      const existingWord = await this.dailyWordRepository.getTodayWord();
      
      if (existingWord && existingWord.date === targetDate) {
        return res.status(409).json({
          success: false,
          error: `Já existe uma palavra definida para ${targetDate}`,
          currentWord: existingWord.word
        });
      }

      // Cria a palavra manualmente
      const dailyWord = await this.dailyWordRepository.createDailyWord(
        word.toLowerCase(),
        targetDate
      );

      return res.json({
        success: true,
        data: {
          word: dailyWord.word,
          date: dailyWord.date,
          length: dailyWord.length,
          message: 'Palavra do dia gerada com sucesso manualmente'
        }
      });
    } catch (error) {
      console.error('Erro ao gerar palavra manualmente:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista todas as palavras do dia (útil para debug)
   */
  async listDailyWords(_req: Request, res: Response) {
    try {
      // Para fins de admin, podemos listar as últimas 30 palavras
      const { data, error } = await this.dailyWordRepository['supabase']
        .from('termo_daily_words')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        data: data || []
      });
    } catch (error) {
      console.error('Erro ao listar palavras do dia:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Força a geração da palavra do dia (caso esteja faltando)
   */
  async forceGenerateTodayWord(_req: Request, res: Response) {
    try {
      const todayWord = await this.dailyWordRepository.generateTodayWordIfNotExists();
      
      return res.json({
        success: true,
        data: {
          word: todayWord.word,
          date: todayWord.date,
          length: todayWord.length,
          message: 'Palavra do dia gerada automaticamente'
        }
      });
    } catch (error) {
      console.error('Erro ao forçar geração da palavra do dia:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}
