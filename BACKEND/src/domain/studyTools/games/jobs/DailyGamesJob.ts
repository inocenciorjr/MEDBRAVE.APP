import cron from 'node-cron';
import { SupabaseClient } from '@supabase/supabase-js';

// Importar geradores de cada jogo
import { getDailyWord } from '../medTermooo/data/words';
import { getDailyPuzzle, MEDICAL_PUZZLES } from '../wordSearch/data/puzzles';
import { IWordPosition } from '../wordSearch/interfaces/IWordSearch';

const GRID_SIZE = 12;
const DIRECTIONS: Array<{ dr: number; dc: number; name: IWordPosition['direction'] }> = [
  { dr: 0, dc: 1, name: 'horizontal' },
  { dr: 1, dc: 0, name: 'vertical' },
  { dr: 1, dc: 1, name: 'diagonal-down' },
  { dr: -1, dc: 1, name: 'diagonal-up' },
];

/**
 * Job centralizado para gerar conteúdo diário de todos os jogos
 * Roda à meia-noite (horário de Brasília)
 */
export class DailyGamesJob {
  constructor(private supabase: SupabaseClient) {}

  // ==================== MED TERMOOO ====================
  private async generateMedTermoooWord(date: Date): Promise<void> {
    const dateStr = this.formatDateBrasilia(date);

    const { data: existing } = await this.supabase
      .from('med_termooo_daily_words')
      .select('id')
      .eq('date', dateStr)
      .single();

    if (existing) {
      return;
    }

    const word = getDailyWord(date);

    const { error } = await this.supabase
      .from('med_termooo_daily_words')
      .insert({
        date: dateStr,
        word: word.word.toUpperCase(),
        hint: word.hint,
        category: word.category,
        length: word.length,
      });

    if (error) {
      throw error;
    }
  }

  // ==================== CAÇA-PALAVRAS ====================
  private generateWordSearchGrid(words: string[]): { grid: string[][]; positions: IWordPosition[] } {
    const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    const positions: IWordPosition[] = [];
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

    // Embaralhar direções para cada palavra ter uma direção diferente
    const shuffleArray = <T>(arr: T[]): T[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Criar lista de direções preferidas para cada palavra (garantir variedade)
    const directionQueue = shuffleArray([...DIRECTIONS]);
    let directionIndex = 0;

    for (const word of sortedWords) {
      let placed = false;
      let attempts = 0;

      // Tentar primeiro com a direção preferida, depois com outras
      const preferredDirection = directionQueue[directionIndex % directionQueue.length];
      const directionsToTry = [
        preferredDirection,
        ...shuffleArray(DIRECTIONS.filter(d => d.name !== preferredDirection.name))
      ];

      for (const direction of directionsToTry) {
        if (placed) break;
        
        const { dr, dc, name } = direction;
        attempts = 0;

        while (!placed && attempts < 50) {
          attempts++;

          let maxRow = GRID_SIZE - 1, maxCol = GRID_SIZE - 1, minRow = 0, minCol = 0;
          if (dr > 0) maxRow = GRID_SIZE - word.length;
          if (dr < 0) minRow = word.length - 1;
          if (dc > 0) maxCol = GRID_SIZE - word.length;

          if (maxRow < minRow || maxCol < minCol) break;

          // Variar posição inicial - não sempre no topo/esquerda
          const startRow = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
          const startCol = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const r = startRow + i * dr;
            const c = startCol + i * dc;
            if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              grid[startRow + i * dr][startCol + i * dc] = word[i];
            }
            positions.push({
              word,
              startRow,
              startCol,
              endRow: startRow + (word.length - 1) * dr,
              endCol: startCol + (word.length - 1) * dc,
              direction: name,
            });
            placed = true;
            directionIndex++; // Próxima palavra tenta outra direção
          }
        }
      }

      if (!placed) console.warn(`[WordSearch] Não posicionou: ${word}`);
    }

    // Preencher vazios
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    return { grid, positions };
  }

  private async generateWordSearchPuzzle(date: Date): Promise<void> {
    const dateStr = this.formatDateBrasilia(date);

    const { data: existing } = await this.supabase
      .from('word_search_daily_puzzles')
      .select('id')
      .eq('date', dateStr)
      .single();

    if (existing) {
      return;
    }

    const puzzleData = getDailyPuzzle(date);
    const normalizedWords = puzzleData.words.map(w => 
      w.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    const { grid, positions } = this.generateWordSearchGrid(normalizedWords);

    const { error } = await this.supabase
      .from('word_search_daily_puzzles')
      .insert({
        date: dateStr,
        title: puzzleData.title,
        context_text: puzzleData.contextText,
        words: normalizedWords,
        grid,
        word_positions: positions,
        grid_size: GRID_SIZE,
      });

    if (error) {
      throw error;
    }
  }

  // ==================== EXECUÇÃO ====================
  private formatDateBrasilia(date: Date): string {
    // Formatar data no timezone de Brasília (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async generateAllForDate(date: Date): Promise<void> {
    const results: { game: string; success: boolean; error?: string }[] = [];

    try {
      await this.generateMedTermoooWord(date);
      results.push({ game: 'MedTermooo', success: true });
    } catch (error: any) {
      results.push({ game: 'MedTermooo', success: false, error: error.message });
    }

    try {
      await this.generateWordSearchPuzzle(date);
      results.push({ game: 'WordSearch', success: true });
    } catch (error: any) {
      results.push({ game: 'WordSearch', success: false, error: error.message });
    }

    results.filter(r => !r.success).forEach(r => {
      console.error(`[DailyGames] Erro ${r.game}: ${r.error}`);
    });
  }

  async generateToday(): Promise<void> {
    // Usar horário de Brasília para determinar "hoje"
    const now = new Date();
    const brasiliaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    await this.generateAllForDate(brasiliaDate);
  }

  start(): void {
    this.generateToday().catch(console.error);

    cron.schedule('0 0 * * *', async () => {
      try {
        await this.generateToday();
      } catch (error) {
        console.error('[DailyGames] Erro no job:', error);
      }
    }, { timezone: 'America/Sao_Paulo' });
  }
}
