import { Filter, FilterCreatePayload } from "../types";
import { IFilterRepository } from "../repositories/IFilterRepository";

export class CreateFilterUseCase {
  constructor(private filterRepository: IFilterRepository) {}

  async execute(data: FilterCreatePayload): Promise<Filter> {
    if (!data.name) {
      throw new Error("O nome do filtro é obrigatório");
    }

    if (!data.category) {
      throw new Error("A categoria do filtro é obrigatória");
    }

    return this.filterRepository.create(data);
  }
}
