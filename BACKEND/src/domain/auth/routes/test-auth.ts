import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Endpoint para gerar um token de teste
router.get('/generate-test-token', (_req, res) => {
  try {
    // Gerar um ID de usuário aleatório para teste
    const userId = uuidv4();
    
    // Criar payload do token
    const payload = {
      id: userId,
      email: `test-${userId.substring(0, 8)}@example.com`,
      role: 'user',
      iat: Math.floor(Date.now() / 1000)
    };
    
    // Assinar o token com uma chave secreta
    const secretKey = process.env.JWT_SECRET || 'test-secret-key';
    const token = jwt.sign(payload, secretKey);
    
    // Retornar o token e informações do usuário
    res.status(200).json({
      success: true,
      token,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role
      }
    });
  } catch (error) {
    console.error('Erro ao gerar token de teste:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar token de teste' 
    });
  }
});

export default router; 