import { Request, Response } from 'express';
import { supabase } from '../../../../config/supabase';

export class AdminCollectionController {
  /**
   * Marcar coleção como oficial
   */
  async markAsOfficial(req: Request, res: Response): Promise<void> {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        res.status(400).json({
          success: false,
          message: 'Nome da coleção é obrigatório'
        });
        return;
      }

      // Atualizar coleção para is_official = true
      const { data, error } = await supabase
        .from('collections')
        .update({ is_official: true })
        .eq('name', decodeURIComponent(collectionName))
        .select()
        .single();

      if (error) {
        console.error('Erro ao marcar coleção como oficial:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao marcar coleção como oficial',
          error: error.message
        });
        return;
      }

      if (!data) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Coleção marcada como oficial com sucesso',
        data
      });
    } catch (error: any) {
      console.error('Erro ao marcar coleção como oficial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Desmarcar coleção como oficial
   */
  async unmarkAsOfficial(req: Request, res: Response): Promise<void> {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        res.status(400).json({
          success: false,
          message: 'Nome da coleção é obrigatório'
        });
        return;
      }

      // Atualizar coleção para is_official = false
      const { data, error } = await supabase
        .from('collections')
        .update({ is_official: false })
        .eq('name', decodeURIComponent(collectionName))
        .select()
        .single();

      if (error) {
        console.error('Erro ao desmarcar coleção como oficial:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao desmarcar coleção como oficial',
          error: error.message
        });
        return;
      }

      if (!data) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Coleção desmarcada como oficial com sucesso',
        data
      });
    } catch (error: any) {
      console.error('Erro ao desmarcar coleção como oficial:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Listar todas as coleções oficiais
   */
  async getOfficialCollections(_req: Request, res: Response): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_official', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar coleções oficiais:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao buscar coleções oficiais',
          error: error.message
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: data || []
      });
    } catch (error: any) {
      console.error('Erro ao buscar coleções oficiais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Listar coleções oficiais públicas (para aba Comunidade)
   */
  async getOfficialPublicCollections(_req: Request, res: Response): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_official', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar coleções oficiais públicas:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao buscar coleções oficiais públicas',
          error: error.message
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: data || []
      });
    } catch (error: any) {
      console.error('Erro ao buscar coleções oficiais públicas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}
