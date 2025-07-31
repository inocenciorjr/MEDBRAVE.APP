// Exportação das interfaces
export type { IRepository } from './database/interfaces/IRepository';
export type { ICacheService } from './cache/interfaces/ICacheService';

// Exportação das implementações de repositório
export { FirebaseBaseRepository } from './database/firebase/FirebaseBaseRepository';

// Exportação das implementações de cache
export { FirebaseCacheService } from './cache/firebase/FirebaseCacheService';
export type { FirebaseCacheEntry } from './cache/firebase/FirebaseCacheService';
