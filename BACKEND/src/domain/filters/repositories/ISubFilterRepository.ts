import {
  FilterCategory,
  SubFilter,
  SubFilterCreatePayload,
  SubFilterListOptions,
  SubFilterListResult,
  SubFilterUpdatePayload,
} from "../types";

export interface ISubFilterRepository {
  create(data: SubFilterCreatePayload): Promise<SubFilter>;
  getById(id: string): Promise<SubFilter | null>;
  listByFilterId(
    filter_id: string,
    options?: SubFilterListOptions,
  ): Promise<SubFilterListResult>;
  update(id: string, data: SubFilterUpdatePayload): Promise<SubFilter | null>;
  delete(id: string): Promise<void>;
  getParentFilterCategory(subFilterId: string): Promise<FilterCategory | null>;
}
