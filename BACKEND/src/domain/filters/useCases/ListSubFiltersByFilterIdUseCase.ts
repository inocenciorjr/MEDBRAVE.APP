import { SubFilterListOptions, SubFilterListResult } from "../types";
import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class ListSubFiltersByFilterIdUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(
    filterId: string,
    options?: SubFilterListOptions,
  ): Promise<SubFilterListResult> {
    if (!filterId) {
      throw new Error("O ID do filtro é obrigatório");
    }

    return this.subFilterRepository.listByFilterId(filterId, options);
  }
}
