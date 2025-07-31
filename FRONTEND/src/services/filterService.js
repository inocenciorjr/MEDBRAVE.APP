import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export const FilterCategory = {
  INSTITUTIONAL: 'INSTITUTIONAL',
  EDUCATIONAL: 'EDUCATIONAL',
  MEDICAL_SPECIALTY: 'MEDICAL_SPECIALTY'
};

export const FilterStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export const FilterType = {
  CONTENT: 'CONTENT',
  COURSE: 'COURSE',
  QUESTION: 'QUESTION'
};

export const getAllFilters = async () => {
  try {
    const filtersCollectionRef = collection(db, 'filters');
    const q = query(filtersCollectionRef, where('isGlobal', '==', true), where('status', '==', FilterStatus.ACTIVE));
    const querySnapshot = await getDocs(q);
    const filters = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return filters;
  } catch (error) {
    console.error("Erro ao obter todos os filtros:", error);
    throw error; // Propagar o erro ao invés de mascarar
  }
};


