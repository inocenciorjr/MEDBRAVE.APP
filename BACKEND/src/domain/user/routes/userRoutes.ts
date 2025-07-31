import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { selfMiddleware } from '../../auth/middleware/self.middleware';

export function createUserRoutes(db: firestore.Firestore): Router {
  const router = Router();
  
  // Middleware para autenticação
  router.use(authMiddleware);
  
  // Rota para obter o perfil do usuário atual
  router.get('/me', async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data();
      return res.status(200).json({
        id: userDoc.id,
        ...userData
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Rota para atualizar o perfil do usuário
  router.put('/me', selfMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Impede alteração da role pelo próprio usuário
      if ('role' in req.body) {
        return res.status(403).json({ error: 'Você não pode alterar sua própria role.' });
      }

      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      await db.collection('users').doc(userId).update(updateData);
      
      const updatedDoc = await db.collection('users').doc(userId).get();
      const updatedData = updatedDoc.data();
      
      return res.status(200).json({
        message: 'Perfil atualizado com sucesso',
        user: {
          id: userId,
          ...updatedData
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Rota para deletar o próprio usuário (se existir)
  router.delete('/me', selfMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      await db.collection('users').doc(userId).update({
        deletedAt: new Date().toISOString(),
        status: 'DELETED'
      });
      
      return res.status(200).json({ message: 'Conta deletada com sucesso', id: userId });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Rota para obter todos os usuários (apenas para admin)
  router.get('/', async (req, res) => {
    try {
      
      console.log('👤 User objeto completo:', req.user);
      console.log('👤 User role:', req.user?.role);
      console.log('👤 User id:', req.user?.id);
      
      if (req.user?.role !== 'admin') {
        console.log('❌ Acesso negado - usuário não é admin');
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Admin user - fetching users from Firestore
      
      // Remover orderBy para evitar erros se nem todos têm createdAt
      const usersSnapshot = await db.collection('users').get();
      
      console.log(`📊 Total de documentos encontrados: ${usersSnapshot.size}`);
      
      const users: any[] = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`📄 Processando usuário: ${doc.id}`, userData.email);
        
        // Filtrar usuários deletados no código
        if (userData.deletedAt) {
          console.log(`⚠️ Usuário ${doc.id} está deletado, pulando...`);
          return; // Pular usuários deletados
        }
        
        users.push({
          id: doc.id,
          displayName: userData.displayName || userData.name || userData.email || 'Usuário sem nome',
          email: userData.email,
          role: userData.role || 'STUDENT',
          status: userData.status || 'ACTIVE',
          emailVerified: userData.emailVerified || false,
          phoneNumber: userData.phoneNumber || null,
          photoURL: userData.photoURL || null,
          biography: userData.biography || null,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString(),
          lastLoginAt: userData.lastLoginAt || null,
          stats: userData.stats || {
            questionsAnswered: 0,
            questionsCorrect: 0,
            questionsFlagged: 0,
            flashcardsReviewed: 0,
            flashcardsMastered: 0,
            errorsRegistered: 0,
            simulatedTestsCompleted: 0,
            studyTime: 0,
            lastStudySession: null,
            streak: 0,
            maxStreak: 0,
            pointsTotal: 0,
            level: 1
          }
        });
      });
      
      console.log(`✅ Retornando ${users.length} usuários válidos`);
      console.log(`📄 JSON Response:`, JSON.stringify(users, null, 2));
      
      return res.status(200).json(users);
      
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // --- NOTIFICAÇÕES E CONTATO ---

  // GET /user/notification-preferences
  router.get('/notification-preferences', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const data = userDoc.data();
      return res.status(200).json({ preferences: data?.notificationPreferences || [] });
    } catch (error) {
      console.error('Erro ao buscar notification-preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /user/notification-preferences
  router.put('/notification-preferences', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { type, ...rest } = req.body;
      if (!type) return res.status(400).json({ error: 'Tipo de preferência não informado' });
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const data = userDoc.data();
      let prefs = data?.notificationPreferences || [];
      const idx = prefs.findIndex((p: any) => p.type === type);
      if (idx >= 0) {
        prefs[idx] = { ...prefs[idx], ...rest, type };
      } else {
        prefs.push({ ...rest, type });
      }
      await userRef.update({ notificationPreferences: prefs });
      return res.status(200).json({ preference: prefs.find((p: any) => p.type === type) });
    } catch (error) {
      console.error('Erro ao atualizar notification-preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /user/contact-info
  router.get('/contact-info', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const data = userDoc.data();
      return res.status(200).json({ contactInfo: data?.contactInfo || null });
    } catch (error) {
      console.error('Erro ao buscar contact-info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /user/contact-info
  router.put('/contact-info', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const userRef = db.collection('users').doc(userId);
      await userRef.update({ contactInfo: req.body });
      return res.status(200).json({ contactInfo: req.body });
    } catch (error) {
      console.error('Erro ao atualizar contact-info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /user/notification-stats
  router.get('/notification-stats', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const data = userDoc.data();
      // Simples: retorna stats e entregas recentes se existirem
      return res.status(200).json({ stats: data?.notificationStats || null, recentDeliveries: data?.recentDeliveries || [] });
    } catch (error) {
      console.error('Erro ao buscar notification-stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return router;
}