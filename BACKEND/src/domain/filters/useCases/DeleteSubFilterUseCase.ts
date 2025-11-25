import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class DeleteSubFilterUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(id: string): Promise<void> {
    console.log('[DeleteSubFilterUseCase] Tentando deletar subfiltro com ID:', id);
    
    if (!id) {
      throw new Error("O ID do subfiltro é obrigatório");
    }

    const subFilter = await this.subFilterRepository.getById(id);
    console.log('[DeleteSubFilterUseCase] Subfiltro encontrado:', subFilter ? 'SIM' : 'NÃO');

    if (!subFilter) {
      throw new Error(`Subfiltro com ID "${id}" não encontrado`);
    }

    await this.subFilterRepository.delete(id);
    console.log('[DeleteSubFilterUseCase] Subfiltro deletado com sucesso');
  }
}
