import { createClient } from '@supabase/supabase-js';
import { CategorizationResult } from './categorizationService';

export interface FeedbackPattern {
  pattern: string;
  occurrences: number;
  examples: Array<{
    questionId: string;
    originalCategory: string;
    correctedCategory: string;
  }>;
  suggestedPromptImprovement?: string;
}

export interface FeedbackAnalysis {
  totalFeedbacks: number;
  commonPatterns: FeedbackPattern[];
  accuracyByFilter: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  averageConfidenceWhenWrong: number;
  averageConfidenceWhenRight: number;
  suggestedImprovements: string[];
}

export interface PrecisionMetrics {
  totalCategorizations: number;
  acceptedCategorizations: number;
  correctedCategorizations: number;
  acceptanceRate: number;
  correctionRate: number;
  averageConfidence: number;
  confidenceByStatus: Record<string, number>;
}

export class FeedbackAnalyzer {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async analyzeFeedback(limit: number = 100): Promise<FeedbackAnalysis> {
    // Load recent feedback
    const { data: feedbacks, error } = await this.supabase
      .from('categorization_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading feedback:', error);
      throw new Error(`Failed to load feedback: ${error.message}`);
    }

    if (!feedbacks || feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        commonPatterns: [],
        accuracyByFilter: {},
        averageConfidenceWhenWrong: 0,
        averageConfidenceWhenRight: 0,
        suggestedImprovements: [],
      };
    }

    // Analyze patterns
    const patterns = this.identifyPatterns(feedbacks);
    const accuracyByFilter = this.calculateAccuracyByFilter(feedbacks);
    const confidenceAnalysis = this.analyzeConfidence(feedbacks);
    const improvements = this.generateImprovements(patterns, accuracyByFilter);

    return {
      totalFeedbacks: feedbacks.length,
      commonPatterns: patterns,
      accuracyByFilter,
      averageConfidenceWhenWrong: confidenceAnalysis.whenWrong,
      averageConfidenceWhenRight: confidenceAnalysis.whenRight,
      suggestedImprovements: improvements,
    };
  }

  private identifyPatterns(feedbacks: any[]): FeedbackPattern[] {
    const patternMap = new Map<string, FeedbackPattern>();

    for (const feedback of feedbacks) {
      const original = feedback.original_categorization as CategorizationResult;
      const corrected = feedback.corrected_categorization as CategorizationResult;

      // Identify pattern type
      const pattern = this.classifyPattern(original, corrected);
      
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, {
          pattern,
          occurrences: 0,
          examples: [],
        });
      }

      const patternData = patternMap.get(pattern)!;
      patternData.occurrences++;
      
      if (patternData.examples.length < 3) {
        patternData.examples.push({
          questionId: feedback.question_id,
          originalCategory: this.formatCategory(original),
          correctedCategory: this.formatCategory(corrected),
        });
      }
    }

    // Sort by occurrences and return top patterns
    return Array.from(patternMap.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);
  }

  private classifyPattern(original: CategorizationResult, corrected: CategorizationResult): string {
    // Check if completely wrong
    if (original.suggestedFilters.length === 0 && corrected.suggestedFilters.length > 0) {
      return 'Missing categorization';
    }

    // Check if wrong filter
    const originalFilterIds = original.suggestedFilters.map(f => f.filterId);
    const correctedFilterIds = corrected.suggestedFilters.map(f => f.filterId);
    
    if (!this.arraysEqual(originalFilterIds, correctedFilterIds)) {
      return 'Wrong filter';
    }

    // Check if wrong subfilter
    const originalSubfilterIds = original.suggestedSubfilters.map(sf => sf.subfilterId);
    const correctedSubfilterIds = corrected.suggestedSubfilters.map(sf => sf.subfilterId);
    
    if (!this.arraysEqual(originalSubfilterIds, correctedSubfilterIds)) {
      return 'Wrong subfilter';
    }

    // Check if too general (missing subfilters)
    if (originalSubfilterIds.length < correctedSubfilterIds.length) {
      return 'Too general';
    }

    // Check if too specific (extra subfilters)
    if (originalSubfilterIds.length > correctedSubfilterIds.length) {
      return 'Too specific';
    }

    return 'Other';
  }

  private calculateAccuracyByFilter(feedbacks: any[]): Record<string, { total: number; correct: number; accuracy: number }> {
    const filterStats: Record<string, { total: number; correct: number }> = {};

    for (const feedback of feedbacks) {
      const original = feedback.original_categorization as CategorizationResult;
      const corrected = feedback.corrected_categorization as CategorizationResult;

      // Get all filters involved
      const allFilters = new Set([
        ...original.suggestedFilters.map(f => f.filterName),
        ...corrected.suggestedFilters.map(f => f.filterName),
      ]);

      for (const filterName of allFilters) {
        if (!filterStats[filterName]) {
          filterStats[filterName] = { total: 0, correct: 0 };
        }

        filterStats[filterName].total++;

        // Check if this filter was correct
        const originalHasFilter = original.suggestedFilters.some(f => f.filterName === filterName);
        const correctedHasFilter = corrected.suggestedFilters.some(f => f.filterName === filterName);

        if (originalHasFilter === correctedHasFilter) {
          filterStats[filterName].correct++;
        }
      }
    }

    // Calculate accuracy
    const result: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const [filterName, stats] of Object.entries(filterStats)) {
      result[filterName] = {
        ...stats,
        accuracy: (stats.correct / stats.total) * 100,
      };
    }

    return result;
  }

  private analyzeConfidence(feedbacks: any[]): { whenWrong: number; whenRight: number } {
    let wrongSum = 0;
    let wrongCount = 0;
    let rightSum = 0;
    let rightCount = 0;

    for (const feedback of feedbacks) {
      const confidence = feedback.ai_confidence || 0;
      const original = feedback.original_categorization as CategorizationResult;
      const corrected = feedback.corrected_categorization as CategorizationResult;

      // Check if categorization was correct
      const wasCorrect = this.categorizationsMatch(original, corrected);

      if (wasCorrect) {
        rightSum += confidence;
        rightCount++;
      } else {
        wrongSum += confidence;
        wrongCount++;
      }
    }

    return {
      whenWrong: wrongCount > 0 ? wrongSum / wrongCount : 0,
      whenRight: rightCount > 0 ? rightSum / rightCount : 0,
    };
  }

  private generateImprovements(patterns: FeedbackPattern[], accuracyByFilter: Record<string, any>): string[] {
    const improvements: string[] = [];

    // Check for common patterns
    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.occurrences >= 5) {
        improvements.push(`Address "${pattern.pattern}" pattern (${pattern.occurrences} occurrences)`);
      }
    }

    // Check for low accuracy filters
    const lowAccuracyFilters = Object.entries(accuracyByFilter)
      .filter(([_, stats]) => stats.accuracy < 70 && stats.total >= 5)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .slice(0, 3);

    for (const [filterName, stats] of lowAccuracyFilters) {
      improvements.push(`Improve accuracy for "${filterName}" (${stats.accuracy.toFixed(1)}%)`);
    }

    // General improvements
    if (improvements.length === 0) {
      improvements.push('Continue monitoring feedback for patterns');
    }

    return improvements;
  }

  async getPrecisionMetrics(timeRange?: { start: Date; end: Date }): Promise<PrecisionMetrics> {
    // Load categorization jobs
    let query = this.supabase
      .from('categorization_jobs')
      .select('*')
      .eq('status', 'completed');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error loading jobs:', error);
      throw new Error(`Failed to load jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return {
        totalCategorizations: 0,
        acceptedCategorizations: 0,
        correctedCategorizations: 0,
        acceptanceRate: 0,
        correctionRate: 0,
        averageConfidence: 0,
        confidenceByStatus: {},
      };
    }

    // Calculate metrics
    let totalCategorizations = 0;
    let totalConfidence = 0;
    const confidenceByStatus: Record<string, { sum: number; count: number }> = {};

    for (const job of jobs) {
      const results = job.results as CategorizationResult[];
      totalCategorizations += results.length;

      for (const result of results) {
        totalConfidence += result.overallConfidence;

        if (!confidenceByStatus[result.status]) {
          confidenceByStatus[result.status] = { sum: 0, count: 0 };
        }
        confidenceByStatus[result.status].sum += result.overallConfidence;
        confidenceByStatus[result.status].count++;
      }
    }

    // Load feedback count
    const { count: feedbackCount } = await this.supabase
      .from('categorization_feedback')
      .select('*', { count: 'exact', head: true });

    const correctedCategorizations = feedbackCount || 0;
    const acceptedCategorizations = totalCategorizations - correctedCategorizations;

    // Calculate confidence by status
    const confidenceByStatusResult: Record<string, number> = {};
    for (const [status, data] of Object.entries(confidenceByStatus)) {
      confidenceByStatusResult[status] = data.count > 0 ? data.sum / data.count : 0;
    }

    return {
      totalCategorizations,
      acceptedCategorizations,
      correctedCategorizations,
      acceptanceRate: totalCategorizations > 0 ? (acceptedCategorizations / totalCategorizations) * 100 : 0,
      correctionRate: totalCategorizations > 0 ? (correctedCategorizations / totalCategorizations) * 100 : 0,
      averageConfidence: totalCategorizations > 0 ? totalConfidence / totalCategorizations : 0,
      confidenceByStatus: confidenceByStatusResult,
    };
  }

  private formatCategory(result: CategorizationResult): string {
    if (result.hierarchyChain.length > 0) {
      return result.hierarchyChain.map(node => node.name).join(' > ');
    }
    return 'No category';
  }

  private categorizationsMatch(a: CategorizationResult, b: CategorizationResult): boolean {
    const aFilterIds = a.suggestedFilters.map(f => f.filterId).sort();
    const bFilterIds = b.suggestedFilters.map(f => f.filterId).sort();
    
    const aSubfilterIds = a.suggestedSubfilters.map(sf => sf.subfilterId).sort();
    const bSubfilterIds = b.suggestedSubfilters.map(sf => sf.subfilterId).sort();

    return this.arraysEqual(aFilterIds, bFilterIds) && this.arraysEqual(aSubfilterIds, bSubfilterIds);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

// Factory function
export function createFeedbackAnalyzer(supabaseUrl: string, supabaseKey: string): FeedbackAnalyzer {
  return new FeedbackAnalyzer(supabaseUrl, supabaseKey);
}
