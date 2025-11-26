import { Router, Request, Response } from 'express';
import { enhancedAuthMiddleware } from '../domain/auth/middleware/enhancedAuth.middleware';
import path from 'path';
import fs from 'fs';

const router = Router();

// Todas as rotas requerem autenticação + plano ativo
router.use(enhancedAuthMiddleware);

/**
 * GET /api/temp-images/:filename
 * Serve temporary images from scraper output
 */
router.get('/:filename', (req: Request, res: Response): void => {
  try {
    const { filename } = req.params;
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    
    // Path to scraped images
    const imagePath = path.join(process.cwd(), 'output', 'scraped', 'images', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming image:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading image' });
      }
    });
    
  } catch (error) {
    console.error('Error serving temp image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
