import { firestore } from "../../../config/firebaseAdmin";
import { FilterCategory, SubFilter, SubFilterCreatePayload, SubFilterListOptions, SubFilterListResult, SubFilterUpdatePayload } from "../types";
import { ISubFilterRepository } from "./ISubFilterRepository";
import { Timestamp, CollectionReference, Query } from "firebase-admin/firestore";

const SUBFILTERS_COLLECTION = "subFilters";
const FILTERS_COLLECTION = "filters";

export class FirebaseSubFilterRepository implements ISubFilterRepository {
  private collection: CollectionReference;
  private filtersCollection: CollectionReference;

  constructor() {
    this.collection = firestore.collection(SUBFILTERS_COLLECTION);
    this.filtersCollection = firestore.collection(FILTERS_COLLECTION);
  }

  async create(data: SubFilterCreatePayload): Promise<SubFilter> {
    if (!data.filterId) {
      throw new Error("O ID do filtro pai é obrigatório para criar um subfiltro.");
    }
    
    // Verificar se o filtro pai existe
    const filterDoc = await this.filtersCollection.doc(data.filterId).get();
    if (!filterDoc.exists) {
      throw new Error(`Filtro pai com ID ${data.filterId} não encontrado.`);
    }

    const newSubFilterRef = this.collection.doc();
    const now = Timestamp.now();
    
    const newSubFilter: SubFilter = {
      id: newSubFilterRef.id,
      ...data,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
    
    await newSubFilterRef.set(this.convertDatesToTimestamps(newSubFilter));
    return newSubFilter;
  }

  async getById(id: string): Promise<SubFilter | null> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    return this.convertTimestampsToDates(docSnap.data() as any);
  }

  async listByFilterId(filterId: string, options?: SubFilterListOptions): Promise<SubFilterListResult> {
    if (!filterId) {
      throw new Error("O ID do filtro pai é obrigatório para listar subfiltros.");
    }

    let query: Query = this.collection.where("filterId", "==", filterId);

    if (options?.isActive !== undefined) {
      query = query.where("isActive", "==", options.isActive);
    }

    const sortBy = options?.sortBy || "order";
    const sortDirection = options?.sortDirection || "asc";
    query = query.orderBy(sortBy.toString(), sortDirection);
    
    if (sortBy !== "name") {
      query = query.orderBy("name", "asc");
    }

    if (options?.startAfter) {
      const startAfterDoc = await this.collection.doc(options.startAfter.id).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const limit = options?.limit || 20;
    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const subFilters = snapshot.docs.map(doc => this.convertTimestampsToDates(doc.data() as any));

    let nextPageStartAfter: SubFilter | undefined = undefined;
    if (subFilters.length > limit) {
      nextPageStartAfter = subFilters.pop();
    }

    return { subFilters, nextPageStartAfter };
  }

  async update(id: string, data: SubFilterUpdatePayload): Promise<SubFilter | null> {
    const subFilterRef = this.collection.doc(id);
    const docSnap = await subFilterRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: Timestamp.now()
    };

    await subFilterRef.update(this.convertDatesToTimestamps(updateData));
    const updatedDoc = await subFilterRef.get();
    
    return updatedDoc.exists 
      ? this.convertTimestampsToDates(updatedDoc.data() as any) 
      : null;
  }

  async delete(id: string): Promise<void> {
    const subFilterRef = this.collection.doc(id);
    const docSnap = await subFilterRef.get();

    if (!docSnap.exists) {
      throw new Error(`Subfiltro com ID "${id}" não encontrado para exclusão.`);
    }

    // Verificar se este subfiltro é pai de outros subfiltros
    const childSubFiltersSnapshot = await this.collection.where("parentId", "==", id).get();
    
    if (!childSubFiltersSnapshot.empty) {
      // Deletar todos os subfiltros filhos
      const batch = firestore.batch();
      childSubFiltersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    await subFilterRef.delete();
  }

  async getParentFilterCategory(subFilterId: string): Promise<FilterCategory | null> {
    const subFilter = await this.getById(subFilterId);
    
    if (!subFilter || !subFilter.filterId) {
      return null;
    }
    
    const filterDoc = await this.filtersCollection.doc(subFilter.filterId).get();
    if (!filterDoc.exists) {
      return null;
    }
    
    const filterData = filterDoc.data();
    return filterData?.category || null;
  }

  // Métodos auxiliares para conversão de datas
  private convertTimestampsToDates(data: any): SubFilter {
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    };
  }

  private convertDatesToTimestamps(data: any): any {
    const result = { ...data };
    
    if (data.createdAt instanceof Date) {
      result.createdAt = Timestamp.fromDate(data.createdAt);
    }
    
    if (data.updatedAt instanceof Date) {
      result.updatedAt = Timestamp.fromDate(data.updatedAt);
    }
    
    return result;
  }
} 