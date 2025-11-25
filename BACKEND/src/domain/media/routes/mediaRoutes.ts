// Rotas de Mídia
// Implementação inicial - esqueleto
import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';
import multer from 'multer';

const router = Router();
const controller = new MediaController();
const upload = multer(); // Armazena em memória, pode ser customizado

router.post(
  '/upload',
  upload.single('file'),
  controller.uploadMedia.bind(controller),
);
router.get('/:id', controller.getMediaById.bind(controller));
router.put('/:id', controller.updateMedia.bind(controller));
router.delete('/:id', controller.deleteMedia.bind(controller));
router.get('/', controller.listMedia.bind(controller));
router.post('/folders', controller.createMediaFolder.bind(controller));
router.get('/folders', controller.listMediaFolders.bind(controller));

export default router;
