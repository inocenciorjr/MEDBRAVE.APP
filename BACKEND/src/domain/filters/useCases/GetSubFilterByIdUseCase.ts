import { SubFilter } from "../types";
import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class GetSubFilterByIdUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(id: string): Promise<SubFilter> {
    if (!id) {
      throw new Error("O ID do subfiltro é obrigatório");
    }
    
    const subFilter = await this.subFilterRepository.getById(id);
    
    if (!subFilter) {
      throw new Error(`Subfiltro com ID ${id} não encontrado`);
    }
    
    return subFilter;
  }
} 