import { SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { ITermoDailyWord } from '../interfaces/ITermoGame';

export class TermoDailyWordRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getTodayWord(): Promise<ITermoDailyWord | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('termo_daily_words')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? this.mapToDailyWord(data) : null;
  }

  private mapToDailyWord(data: any): ITermoDailyWord {
    return {
      id: data.id,
      word: data.word,
      length: data.word_length,
      date: data.date,
      created_at: data.created_at ? new Date(data.created_at) : undefined
    };
  }

  async createDailyWord(word: string, date: string): Promise<ITermoDailyWord> {
    const { data, error } = await this.supabase
      .from('termo_daily_words')
      .insert({
        word: word,
        word_length: word.length,
        date: date
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToDailyWord(data);
  }

  async generateTodayWordIfNotExists(): Promise<ITermoDailyWord> {
    const today = new Date().toISOString().split('T')[0];
    const existingWord = await this.getTodayWord();
    
    if (existingWord) {
      return existingWord;
    }

    // Get all medical words and select one randomly
    const words = await this.getAllMedicalWords();
    
    if (words.length === 0) {
      throw new Error('No medical words found');
    }

    const randomWord = words[Math.floor(Math.random() * words.length)];
    return await this.createDailyWord(randomWord.word, today);
  }

  private async getAllMedicalWords(): Promise<{word: string, length: number}[]> {
    const filePath = path.join(__dirname, '..', 'data', 'medical_words.csv');
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').slice(1); // Skip header
      return lines
        .map(line => {
          const [word, length] = line.trim().split(',');
          return { word: word?.trim(), length: parseInt(length?.trim()) };
        })
        .filter(item => item.word && item.word.length > 0 && !isNaN(item.length));
    } catch (error) {
      console.error('Error reading medical words file:', error);
      return [];
    }
  }
}

