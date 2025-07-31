// Cloudflare R2 Configuration
export const r2Config = {
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '16fc5a72ff7734d925e9e5a1b0136737',
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'medbrave',
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID || '16fc5a72ff7734d925e9e5a1b0136737'}.r2.cloudflarestorage.com`,
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || 'https://medbrave.com.br',
  region: 'auto' // Cloudflare R2 usa 'auto' como região
};

// Estrutura de pastas no bucket
export const r2Folders = {
  users: 'users',
  profiles: 'users/{userId}/profile',
  uploads: 'users/{userId}/uploads',
  questions: 'questions',
  questionImages: 'questions/images',
  questionAttachments: 'questions/attachments',
  flashcards: 'flashcards',
  flashcardsMedia: 'flashcards/{userId}/media',
  resources: 'resources',
  pdfs: 'resources/pdfs',
  videos: 'resources/videos',
  anki: 'resources/anki',
  backups: 'backups',
  firestoreBackups: 'backups/firestore',
  logs: 'backups/logs',
  cache: 'cache',
  temp: 'temp'
};

// Configurações de upload
export const uploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  allowedAnkiTypes: ['application/zip', 'application/x-zip-compressed'],
  
  // Configurações de qualidade de imagem
  imageQuality: {
    thumbnail: { width: 150, height: 150, quality: 80 },
    medium: { width: 500, height: 500, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 }
  }
}; 