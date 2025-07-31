import { Request, Response } from "express";
import { Filter, FilterCategory, FilterStatus, FilterType } from "../types";
import { CreateFilterUseCase } from "../useCases/CreateFilterUseCase";
import { DeleteFilterUseCase } from "../useCases/DeleteFilterUseCase";
import { GetFilterByIdUseCase } from "../useCases/GetFilterByIdUseCase";
import { ListFiltersUseCase } from "../useCases/ListFiltersUseCase";
import { UpdateFilterUseCase } from "../useCases/UpdateFilterUseCase";

export class FilterController {
  constructor(
    private createFilterUseCase: CreateFilterUseCase,
    private getFilterByIdUseCase: GetFilterByIdUseCase,
    private listFiltersUseCase: ListFiltersUseCase,
    private updateFilterUseCase: UpdateFilterUseCase,
    private deleteFilterUseCase: DeleteFilterUseCase
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { name, description, category, isGlobal, filterType, status } = req.body;

      const filter = await this.createFilterUseCase.execute({
        name,
        description,
        category: category as FilterCategory,
        isGlobal: isGlobal === true,
        filterType: (filterType as FilterType) || FilterType.CONTENT,
        status: (status as FilterStatus) || FilterStatus.ACTIVE,
      });

      return res.status(201).json(filter);
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : "Erro ao criar filtro" 
      });
    }
  }

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const filter = await this.getFilterByIdUseCase.execute(id);
      return res.status(200).json(filter);
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : "Filtro não encontrado" 
      });
    }
  }

  async list(req: Request, res: Response): Promise<Response> {
    try {
      const { category, isGlobal, status, limit, orderBy, orderDirection } = req.query;

      const filters = await this.listFiltersUseCase.execute({
        category: category as FilterCategory,
        isGlobal: isGlobal === "true",
        status: status as FilterStatus,
        limit: limit ? parseInt(limit as string) : undefined,
        orderBy: orderBy as keyof Filter,
        orderDirection: orderDirection as "asc" | "desc",
      });

      return res.status(200).json(filters);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao listar filtros"
      });
    }
  }



  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { name, description, isGlobal, filterType, status } = req.body;

      const filter = await this.updateFilterUseCase.execute(id, {
        name,
        description,
        isGlobal: isGlobal === true,
        filterType: filterType as FilterType,
        status: status as FilterStatus,
      });

      return res.status(200).json(filter);
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : "Erro ao atualizar filtro" 
      });
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      await this.deleteFilterUseCase.execute(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : "Erro ao deletar filtro" 
      });
    }
  }
} 