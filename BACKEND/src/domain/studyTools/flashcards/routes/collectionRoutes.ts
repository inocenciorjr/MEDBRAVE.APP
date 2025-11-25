import { Router } from 'express';
import multer from 'multer';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { CollectionController } from '../controllers/CollectionController';

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
router.put('/:collectionName/public-status', authMiddleware, controller.updateCollectionPublicStatus.bind(controller));

// Listar coleções públicas da comunidade
router.get('/public', authMiddleware, controller.getPublicCollections.bind(controller));

// Listar coleções da comunidade (oficiais e não-oficiais)
router.get('/community/collections', authMiddleware, controller.getCommunityCollections.bind(controller));

// Buscar metadados das coleções do usuário
router.get('/metadata', authMiddleware, controller.getCollectionsMetadata.bind(controller));

// Obter todas as coleções importadas (apenas nomes) - DEVE VIR ANTES das rotas com :collectionName
router.get('/imported/all', authMiddleware, controller.getImportedCollectionNames.bind(controller));

// Curtir/Descurtir coleção
router.post('/:collectionName/like', authMiddleware, controller.toggleCollectionLike.bind(controller));

// Importar coleção (registrar download)
router.post('/:collectionName/import', authMiddleware, controller.importCollection.bind(controller));

// Verificar se curtiu
router.get('/:collectionName/liked', authMiddleware, controller.checkCollectionLiked.bind(controller));

// Verificar se importou
router.get('/:collectionName/imported', authMiddleware, controller.checkCollectionImported.bind(controller));

// Clonar coleção pública para biblioteca do usuário
router.post('/:collectionName/clone', authMiddleware, controller.clonePublicCollection.bind(controller));

// Obter detalhes de uma coleção pública
router.get('/public/:collectionName', authMiddleware, controller.getPublicCollectionDetails.bind(controller));

// Atualizar informações de uma coleção (com upload de imagem)
router.put('/update', authMiddleware, upload.single('coverImage'), controller.updateCollection.bind(controller));

// Remover thumbnail de uma coleção
router.delete('/remove-thumbnail', authMiddleware, controller.removeThumbnail.bind(controller));

export default router;
