import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class DeleteSubFilterUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error("O ID do subfiltro é obrigatório");
    }
    
    const subFilter = await this.subFilterRepository.getById(id);
    
    if (!subFilter) {
      throw new Error(`Subfiltro com ID ${id} não encontrado`);
    }
    
    await this.subFilterRepository.delete(id);
  }
} 