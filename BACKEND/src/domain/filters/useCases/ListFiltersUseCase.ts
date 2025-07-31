import { Filter, FilterListOptions } from "../types";
import { IFilterRepository } from "../repositories/IFilterRepository";

export class ListFiltersUseCase {
  constructor(private filterRepository: IFilterRepository) {}

  async execute(options?: FilterListOptions): Promise<Filter[]> {
    return this.filterRepository.list(options);
  }
} 