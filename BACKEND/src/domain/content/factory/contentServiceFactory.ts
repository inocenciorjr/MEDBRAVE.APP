// Fábrica para ContentService
import { ContentService } from '../services/contentService';

export function createContentService() {
  return new ContentService();
}
