// Fábrica para MediaService
import { MediaService } from '../services/mediaService';

export function createMediaService() {
  return new MediaService();
}
