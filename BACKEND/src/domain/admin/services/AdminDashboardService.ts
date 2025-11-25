import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { AdminStats } from '../types/AdminTypes';
import { SupabaseCacheService } from '../../../infra/cache/supabase/SupabaseCacheService';
import { SupabaseQuestionService } from '../../../infra/questions/supabase/SupabaseQuestionService';
import { supabase } from '../../../config/supabaseAdmin';
import { QuestionStatus } from '../../questions/types';

export class AdminDashboardService {
  private static instance: AdminDashboardService;
  private adminService: SupabaseAdminService;
  private questionService: SupabaseQuestionService;
  private cacheService: SupabaseCacheService;

  private constructor() {
    this.adminService = SupabaseAdminService.getInstance();
    this.questionService = new SupabaseQuestionService(supabase);
    this.cacheService = new SupabaseCacheService('cache', supabase);
  }

  public static getInstance(): AdminDashboardService {
    if (!AdminDashboardService.instance) {
      AdminDashboardService.instance = new AdminDashboardService();
    }
    return AdminDashboardService.instance;
  }

  async getDashboardStats(): Promise<AdminStats> {
    const cacheKey = 'admin:dashboard:stats';
    const cachedStats = await this.cacheService.get<AdminStats>(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    const stats = await this.calculateStats();
    await this.cacheService.set(cacheKey, stats, 300); // Cache por 5 minutos
    return stats;
  }

  private async calculateStats(): Promise<AdminStats> {
    const [totalUsers, activeUsers, reportedContent, totalQuestions] =
      await Promise.all([
        this.adminService.getTotalUsers(),
        this.adminService.getActiveUsers(),
        this.adminService.getReportedContentCount(),
        this.getTotalQuestions(),
      ]);

    return {
      totalUsers,
      activeUsers,
      totalPosts: totalQuestions,
      reportedContent,
    };
  }

  private async getTotalQuestions(): Promise<number> {
    // Usa listQuestions com status PUBLISHED e pega o total
    const result = await this.questionService.listQuestions({
      status: QuestionStatus.PUBLISHED,
      limit: 1,
    });
    return result.total;
  }

  async getRecentQuestions(limit: number = 10) {
    const result = await this.questionService.listQuestions({
      status: QuestionStatus.PUBLISHED,
      limit,
      order_by: 'createdAt',
      order_direction: 'desc',
    });
    return result.items;
  }

  async getPendingQuestions() {
    // Considera questões em DRAFT como pendentes
    const cacheKey = 'admin:dashboard:pending:questions';
    const cachedQuestions = await this.cacheService.get(cacheKey);

    if (cachedQuestions) {
      return cachedQuestions;
    }

    const result = await this.questionService.listQuestions({
      status: QuestionStatus.DRAFT,
      limit: 50,
      order_by: 'createdAt',
      order_direction: 'desc',
    });
    await this.cacheService.set(cacheKey, result.items, 60); // Cache por 1 minuto
    return result.items;
  }

  async approveQuestion(questionId: string, adminId: string) {
    await this.questionService.changeStatus(
      questionId,
      QuestionStatus.PUBLISHED,
    );
    await this.invalidateQuestionCache();
    await this.logQuestionAction(questionId, 'APPROVE', adminId);
  }

  async rejectQuestion(questionId: string, adminId: string, reason: string) {
    await this.questionService.changeStatus(
      questionId,
      QuestionStatus.ARCHIVED,
    );
    await this.invalidateQuestionCache();
    await this.logQuestionAction(questionId, 'REJECT', adminId, { reason });
  }

  async updateQuestion(questionId: string, adminId: string, updates: any) {
    await this.questionService.updateQuestion(questionId, updates);
    await this.invalidateQuestionCache();
    await this.logQuestionAction(questionId, 'UPDATE', adminId, updates);
  }

  private async invalidateQuestionCache() {
    await Promise.all([
      this.cacheService.delete('admin:dashboard:stats'),
      this.cacheService.delete('admin:dashboard:pending:questions'),
    ]);
  }

  private async logQuestionAction(
    questionId: string,
    action: 'APPROVE' | 'REJECT' | 'UPDATE',
    adminId: string,
    metadata?: any,
  ) {
    await this.adminService.logAdminAction({
      type: `QUESTION_${action}`,
      description: `Question ${questionId} ${action.toLowerCase()}ed by admin`,
      performedBy: adminId,
      metadata: { questionId, ...metadata },
    });
  }
}
