import { firestore } from "../../../config/firebaseAdmin";
import { Filter, FilterCreatePayload, FilterListOptions, FilterUpdatePayload } from "../types";
import { IFilterRepository } from "./IFilterRepository";
import { Timestamp, CollectionReference, Query } from "firebase-admin/firestore";

const FILTERS_COLLECTION = "filters";
const SUBFILTERS_COLLECTION = "subFilters";

export class FirebaseFilterRepository implements IFilterRepository {
  private collection: CollectionReference;

  constructor() {
    this.collection = firestore.collection(FILTERS_COLLECTION);
  }

  async create(data: FilterCreatePayload): Promise<Filter> {
    const newFilterRef = this.collection.doc();
    const now = Timestamp.now();
    
    const newFilter: Filter = {
      id: newFilterRef.id,
      ...data,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
    
    await newFilterRef.set(this.convertDatesToTimestamps(newFilter));
    return newFilter;
  }

  async getById(id: string): Promise<Filter | null> {
    const docRef = this.collection.doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    return this.convertTimestampsToDates(docSnap.data() as any);
  }

  async list(options?: FilterListOptions): Promise<Filter[]> {
    let query: Query = this.collection;

    if (options?.category) {
      query = query.where("category", "==", options.category);
    }
    
    if (typeof options?.isGlobal === 'boolean') {
      query = query.where("isGlobal", "==", options.isGlobal);
    }
    
    if (options?.status) {
      query = query.where("status", "==", options.status);
    }
    
    if (options?.orderBy && options?.orderDirection) {
      query = query.orderBy(options.orderBy.toString(), options.orderDirection);
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => this.convertTimestampsToDates(doc.data() as any));
  }

  async update(id: string, data: FilterUpdatePayload): Promise<Filter | null> {
    const filterRef = this.collection.doc(id);
    const docSnap = await filterRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: Timestamp.now()
    };

    await filterRef.update(this.convertDatesToTimestamps(updateData));
    const updatedDoc = await filterRef.get();
    
    return updatedDoc.exists 
      ? this.convertTimestampsToDates(updatedDoc.data() as any) 
      : null;
  }

  async delete(id: string): Promise<void> {
    const filterRef = this.collection.doc(id);
    const docSnap = await filterRef.get();

    if (!docSnap.exists) {
      throw new Error(`Filtro com ID "${id}" não encontrado para exclusão.`);
    }

    // Deletar subfiltros relacionados em cascata
    const subFiltersSnapshot = await firestore.collection(SUBFILTERS_COLLECTION)
      .where("filterId", "==", id)
      .get();
    
    if (!subFiltersSnapshot.empty) {
      const batch = firestore.batch();
      subFiltersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    await filterRef.delete();
  }

  // Métodos auxiliares para conversão de datas
  private convertTimestampsToDates(data: any): Filter {
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