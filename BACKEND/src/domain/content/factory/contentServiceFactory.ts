// Fábrica para ContentService
import { ContentService } from '../../../infra/content/supabase/contentService';

export function createContentService() {
  return new ContentService();
}
