import { Request, Response } from "express";
import { FilterStatus, SubFilter } from "../types";
import { CreateSubFilterUseCase } from "../useCases/CreateSubFilterUseCase";
import { DeleteSubFilterUseCase } from "../useCases/DeleteSubFilterUseCase";
import { GetParentFilterCategoryUseCase } from "../useCases/GetParentFilterCategoryUseCase";
import { GetSubFilterByIdUseCase } from "../useCases/GetSubFilterByIdUseCase";
import { ListSubFiltersByFilterIdUseCase } from "../useCases/ListSubFiltersByFilterIdUseCase";
import { UpdateSubFilterUseCase } from "../useCases/UpdateSubFilterUseCase";

export class SubFilterController {
  constructor(
    private createSubFilterUseCase: CreateSubFilterUseCase,
    private getSubFilterByIdUseCase: GetSubFilterByIdUseCase,
    private listSubFiltersByFilterIdUseCase: ListSubFiltersByFilterIdUseCase,
    private updateSubFilterUseCase: UpdateSubFilterUseCase,
    private deleteSubFilterUseCase: DeleteSubFilterUseCase,
    private getParentFilterCategoryUseCase: GetParentFilterCategoryUseCase,
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { filter_id } = req.params;
      const { name, order, is_active, parent_id, status, filterId, parentId } = req.body;

      console.log('[SubFilterController] create() - Params:', req.params);
      console.log('[SubFilterController] create() - Body:', req.body);

      // Usar filterId do body se filter_id dos params não existir
      const actualFilterId = filter_id || filterId;
      const actualParentId = parent_id || parentId;

      console.log('[SubFilterController] create() - Usando:', { 
        filter_id: actualFilterId, 
        parent_id: actualParentId 
      });

      const subFilter = await this.createSubFilterUseCase.execute({
        filter_id: actualFilterId,
        name,
        order: order ? parseInt(order) : undefined,
        is_active: is_active === true,
        parent_id: actualParentId,
        status: (status as FilterStatus) || FilterStatus.ACTIVE,
      });

      return res.status(201).json(subFilter);
    } catch (error) {
      console.error('[SubFilterController] create() - Erro:', error);
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao criar subfiltro',
      });
    }
  }

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const subFilter = await this.getSubFilterByIdUseCase.execute(id);
      return res.status(200).json(subFilter);
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error ? error.message : 'Subfiltro não encontrado',
      });
    }
  }

  async listAll(_req: Request, res: Response): Promise<Response> {
    try {
      // Buscar todos os subfiltros sem filtrar por filter_id
      // Usar o repository diretamente para buscar todos
      // const { is_active } = req.query;
      
      // Como não temos um use case específico, vamos retornar vazio por enquanto
      // O ideal seria criar um ListAllSubFiltersUseCase
      return res.status(200).json({ data: [], total: 0 });
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao listar todos os subfiltros',
      });
    }
  }

  async listByFilterId(req: Request, res: Response): Promise<Response> {
    try {
      const { filter_id } = req.params;
      const { is_active, sort_by, sort_direction, limit, start_after_id } =
        req.query;

      let start_after: SubFilter | undefined;
      if (start_after_id) {
        try {
          const subFilter = await this.getSubFilterByIdUseCase.execute(
            start_after_id as string,
          );
          start_after = subFilter;
        } catch (error) {
          // Ignora erro se o start_after_id não existir
        }
      }

      const result = await this.listSubFiltersByFilterIdUseCase.execute(
        filter_id,
        {
          is_active: is_active === "true",
          sort_by: sort_by as keyof SubFilter,
          sort_direction: sort_direction as "asc" | "desc",
          limit: limit ? parseInt(limit as string) : undefined,
          start_after,
        },
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao listar subfiltros',
      });
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, order, is_active, parent_id, status } = req.body;

      const subFilter = await this.updateSubFilterUseCase.execute(id, {
        name,
        order: order !== undefined ? parseInt(order) : undefined,
        is_active: is_active === true,
        parent_id,
        status: status as FilterStatus,
      });

      return res.status(200).json(subFilter);
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar subfiltro',
      });
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      await this.deleteSubFilterUseCase.execute(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error ? error.message : 'Erro ao deletar subfiltro',
      });
    }
  }

  async getParentFilterCategory(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const category = await this.getParentFilterCategoryUseCase.execute(id);
      return res.status(200).json({ category });
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : 'Categoria do filtro pai não encontrada',
      });
    }
  }
}
