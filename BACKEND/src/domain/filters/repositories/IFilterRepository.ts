import {
  Filter,
  FilterCreatePayload,
  FilterListOptions,
  FilterUpdatePayload,
} from "../types";

export interface IFilterRepository {
  create(data: FilterCreatePayload): Promise<Filter>;
  getById(id: string): Promise<Filter | null>;
  list(options?: FilterListOptions): Promise<Filter[]>;
  update(id: string, data: FilterUpdatePayload): Promise<Filter | null>;
  delete(id: string): Promise<void>;
}
