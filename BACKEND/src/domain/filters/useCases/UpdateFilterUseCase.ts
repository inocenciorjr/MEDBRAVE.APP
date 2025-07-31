import { Filter, FilterUpdatePayload } from "../types";
import { IFilterRepository } from "../repositories/IFilterRepository";

export class UpdateFilterUseCase {
  constructor(private filterRepository: IFilterRepository) {}

  async execute(id: string, data: FilterUpdatePayload): Promise<Filter> {
    if (!id) {
      throw new Error("O ID do filtro é obrigatório");
    }
    
    const filter = await this.filterRepository.getById(id);
    
    if (!filter) {
      throw new Error(`Filtro com ID ${id} não encontrado`);
    }
    
    const updatedFilter = await this.filterRepository.update(id, data);
    
    if (!updatedFilter) {
      throw new Error(`Erro ao atualizar filtro com ID ${id}`);
    }
    
    return updatedFilter;
  }
} 