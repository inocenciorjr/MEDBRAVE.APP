import { FilterCategory } from "../types";
import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class GetParentFilterCategoryUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(subFilterId: string): Promise<FilterCategory> {
    if (!subFilterId) {
      throw new Error("O ID do subfiltro é obrigatório");
    }

    const category =
      await this.subFilterRepository.getParentFilterCategory(subFilterId);

    if (!category) {
      throw new Error(
        `Categoria do filtro pai não encontrada para o subfiltro ${subFilterId}`,
      );
    }

    return category;
  }
}
