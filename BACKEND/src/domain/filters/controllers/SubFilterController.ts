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
    private getParentFilterCategoryUseCase: GetParentFilterCategoryUseCase
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { filterId } = req.params;
      const { name, description, order, isActive, parentId, status } = req.body;

      const subFilter = await this.createSubFilterUseCase.execute({
        filterId,
        name,
        description,
        order: order ? parseInt(order) : undefined,
        isActive: isActive === true,
        parentId: parentId || undefined,
        status: (status as FilterStatus) || FilterStatus.ACTIVE,
      });

      return res.status(201).json(subFilter);
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : "Erro ao criar subfiltro" 
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
        error: error instanceof Error ? error.message : "Subfiltro não encontrado" 
      });
    }
  }

  async listByFilterId(req: Request, res: Response): Promise<Response> {
    try {
      const { filterId } = req.params;
      const { isActive, sortBy, sortDirection, limit, startAfterId } = req.query;
      
      let startAfter: SubFilter | undefined;
      if (startAfterId) {
        try {
          const subFilter = await this.getSubFilterByIdUseCase.execute(startAfterId as string);
          startAfter = subFilter;
        } catch (error) {
          // Ignora erro se o startAfterId não existir
        }
      }

      const result = await this.listSubFiltersByFilterIdUseCase.execute(filterId, {
        isActive: isActive === "true",
        sortBy: sortBy as keyof SubFilter,
        sortDirection: sortDirection as "asc" | "desc",
        limit: limit ? parseInt(limit as string) : undefined,
        startAfter,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : "Erro ao listar subfiltros" 
      });
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, description, order, isActive, parentId, status } = req.body;

      const subFilter = await this.updateSubFilterUseCase.execute(id, {
        name,
        description,
        order: order !== undefined ? parseInt(order) : undefined,
        isActive: isActive === true,
        parentId,
        status: status as FilterStatus,
      });

      return res.status(200).json(subFilter);
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : "Erro ao atualizar subfiltro" 
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
        error: error instanceof Error ? error.message : "Erro ao deletar subfiltro" 
      });
    }
  }

  async getParentFilterCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const category = await this.getParentFilterCategoryUseCase.execute(id);
      return res.status(200).json({ category });
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : "Categoria do filtro pai não encontrada" 
      });
    }
  }
} 