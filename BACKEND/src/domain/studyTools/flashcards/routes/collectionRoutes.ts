import { Router } from 'express';
import multer from 'multer';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { CollectionController } from '../controllers/CollectionController';

// Alias para compatibilidade
const authMiddleware = enhancedAuthMiddleware;

const router = Router();
const controller = new CollectionController();

// Configurar multer para upload de imagens
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// Tornar coleção pública/privada
router.put('/:collectionName/public-status', enhancedAuthMiddleware, controller.updateCollectionPublicStatus.bind(controller));

// Listar coleções públicas da comunidade
router.get('/public', enhancedAuthMiddleware, controller.getPublicCollections.bind(controller));

// Listar coleções da comunidade (oficiais e não-oficiais)
router.get('/community/collections', controller.getCommunityCollections.bind(controller));

// Buscar metadados das coleções do usuário
router.get('/metadata', controller.getCollectionsMetadata.bind(controller));

// Obter todas as coleções importadas (apenas nomes) - DEVE VIR ANTES das rotas com :collectionName
router.get('/imported/all', controller.getImportedCollectionNames.bind(controller));

// Curtir/Descurtir coleção
router.post('/:collectionName/like', controller.toggleCollectionLike.bind(controller));

// Importar coleção (registrar download)
router.post('/:collectionName/import', controller.importCollection.bind(controller));

// Verificar se curtiu
router.get('/:collectionName/liked', controller.checkCollectionLiked.bind(controller));

// Verificar se importou
router.get('/:collectionName/imported', controller.checkCollectionImported.bind(controller));

// Clonar coleção pública para biblioteca do usuário
router.post('/:collectionName/clone', controller.clonePublicCollection.bind(controller));

// Obter detalhes de uma coleção pública
router.get('/public/:collectionName', controller.getPublicCollectionDetails.bind(controller));

// Atualizar informações de uma coleção (com upload de imagem)
router.put('/update', upload.single('coverImage'), controller.updateCollection.bind(controller));

// Remover thumbnail de uma coleção
router.delete('/remove-thumbnail', controller.removeThumbnail.bind(controller));

export default router;

