// Testes unitários para MediaService
// Implementação inicial - esqueleto
import { MediaService } from '../services/mediaService';
import { firestore } from '../../../config/firebaseAdmin';
import { MediaType, MediaStatus } from '../types';

const service = new MediaService();

const TEST_USER = 'test-user';
const TEST_FILE = {
  filename: 'arquivo-teste.txt',
  originalFilename: 'arquivo-teste.txt',
  mimeType: 'text/plain',
  size: 4,
  userId: TEST_USER,
  type: 'document' as MediaType,
  status: 'active' as MediaStatus,
  isPublic: true,
};
const TEST_FOLDER = {
  userId: TEST_USER,
  name: 'pasta-teste',
  isPublic: true,
};

describe('MediaService (real)', () => {
  let fileId: string;
  let folderId: string;

  afterAll(async () => {
    if (fileId) {
      await firestore.collection('mediaFiles').doc(fileId).delete();
    }
    if (folderId) {
      await firestore.collection('mediaFolders').doc(folderId).delete();
    }
  });

  it('deve criar uma pasta de mídia', async () => {
    const folder = await service.createMediaFolder(TEST_FOLDER);
    expect(folder).toHaveProperty('id');
    expect(folder.name).toBe(TEST_FOLDER.name);
    folderId = folder.id;
  });

  it('deve listar pastas de mídia', async () => {
    const folders = await service.listMediaFolders({ userId: TEST_USER });
    expect(Array.isArray(folders)).toBe(true);
    expect(folders.find(f => f.id === folderId)).toBeTruthy();
  });

  it('deve fazer upload de mídia', async () => {
    const buffer = Buffer.from('test');
    const file = await service.uploadMedia(TEST_FILE, buffer);
    expect(file).toHaveProperty('id');
    expect(file.filename).toBe(TEST_FILE.filename);
    fileId = file.id;
  });

  it('deve buscar mídia por ID', async () => {
    const file = await service.getMediaById(fileId);
    expect(file).not.toBeNull();
    expect(file!.id).toBe(fileId);
  });

  it('deve atualizar mídia', async () => {
    const updated = await service.updateMedia(fileId, { caption: 'Nova legenda' });
    expect(updated).not.toBeNull();
    expect(updated!.caption).toBe('Nova legenda');
  });

  it('deve listar mídias', async () => {
    const files = await service.listMedia({ userId: TEST_USER });
    expect(Array.isArray(files)).toBe(true);
    expect(files.find(f => f.id === fileId)).toBeTruthy();
  });

  it('deve deletar mídia', async () => {
    await service.deleteMedia(fileId);
    const file = await service.getMediaById(fileId);
    expect(file).toBeNull();
    fileId = '';
  });
});
