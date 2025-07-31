import { IFilterRepository } from "../repositories/IFilterRepository";

export class DeleteFilterUseCase {
  constructor(private filterRepository: IFilterRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error("O ID do filtro é obrigatório");
    }
    
    const filter = await this.filterRepository.getById(id);
    
    if (!filter) {
      throw new Error(`Filtro com ID ${id} não encontrado`);
    }
    
    await this.filterRepository.delete(id);
  }
} 