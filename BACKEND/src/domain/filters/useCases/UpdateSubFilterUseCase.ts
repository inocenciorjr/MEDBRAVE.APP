import { SubFilter, SubFilterUpdatePayload } from "../types";
import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class UpdateSubFilterUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(id: string, data: SubFilterUpdatePayload): Promise<SubFilter> {
    if (!id) {
      throw new Error("O ID do subfiltro é obrigatório");
    }

    const subFilter = await this.subFilterRepository.getById(id);

    if (!subFilter) {
      throw new Error(`Subfiltro com ID ${id} não encontrado`);
    }

    const updatedSubFilter = await this.subFilterRepository.update(id, data);

    if (!updatedSubFilter) {
      throw new Error(`Erro ao atualizar subfiltro com ID ${id}`);
    }

    return updatedSubFilter;
  }
}
