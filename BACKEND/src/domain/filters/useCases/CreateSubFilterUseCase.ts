import { SubFilter, SubFilterCreatePayload } from "../types";
import { ISubFilterRepository } from "../repositories/ISubFilterRepository";

export class CreateSubFilterUseCase {
  constructor(private subFilterRepository: ISubFilterRepository) {}

  async execute(data: SubFilterCreatePayload): Promise<SubFilter> {
    if (!data.name) {
      throw new Error("O nome do subfiltro é obrigatório");
    }

    if (!data.filter_id) {
      throw new Error("O ID do filtro pai é obrigatório");
    }

    return this.subFilterRepository.create(data);
  }
}
