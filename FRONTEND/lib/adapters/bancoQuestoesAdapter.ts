import { Filter, FilterHierarchy, SubFilter } from '@/services/bancoQuestoesService';
import { Subject } from '@/types/banco-questoes';

/**
 * Mapeia categoria de filtro para cor e ícone
 */
function getCategoryStyle(filterName: string): {
  category: string;
  categoryLabel: string;
  categoryColor: string;
  categoryIcon: string;
} {
  const categoryMap: Record<string, any> = {
    'Cirurgia': {
      category: 'cirurgia',
      categoryLabel: 'Cirurgia',
      categoryColor: 'text-rose-800 bg-rose-100',
      categoryIcon: 'surgical',
    },
    'Clínica Médica': {
      category: 'clinica-medica',
      categoryLabel: 'Clínica Médica',
      categoryColor: 'text-yellow-800 bg-yellow-100',
      categoryIcon: 'medical_services',
    },
    'Medicina Preventiva': {
      category: 'preventiva',
      categoryLabel: 'Preventiva',
      categoryColor: 'text-purple-800 bg-purple-100',
      categoryIcon: 'health_and_safety',
    },
    'Pediatria': {
      category: 'pediatria',
      categoryLabel: 'Pediatria',
      categoryColor: 'text-blue-800 bg-blue-100',
      categoryIcon: 'child_care',
    },
    'Ginecologia': {
      category: 'ginecologia',
      categoryLabel: 'Ginecologia',
      categoryColor: 'text-cyan-800 bg-cyan-100',
      categoryIcon: 'woman',
    },
    'Obstetrícia': {
      category: 'obstetricia',
      categoryLabel: 'Obstetrícia',
      categoryColor: 'text-pink-800 bg-pink-100',
      categoryIcon: 'pregnant_woman',
    },
    'Variados': {
      category: 'variados',
      categoryLabel: 'Variados',
      categoryColor: 'text-gray-800 bg-gray-100',
      categoryIcon: 'category',
    },
    'Outros': {
      category: 'outros',
      categoryLabel: 'Outros',
      categoryColor: 'text-gray-800 bg-gray-100',
      categoryIcon: 'more_horiz',
    },
  };

  return categoryMap[filterName] || {
    category: 'outros',
    categoryLabel: 'Outros',
    categoryColor: 'text-gray-800 bg-gray-100',
    categoryIcon: 'category',
  };
}

/**
 * Converte Filter do banco para Subject do frontend
 */
export function filterToSubject(filter: Filter): Subject {
  const style = getCategoryStyle(filter.name);

  return {
    id: filter.id,
    name: filter.name,
    parentId: null,
    type: 'specialty',
    category: style.category as Subject['category'],
    categoryLabel: style.categoryLabel,
    categoryColor: style.categoryColor,
    categoryIcon: style.categoryIcon,
  };
}

/**
 * Converte SubFilter do banco para Subject do frontend (recursivo)
 */
export function subFilterToSubject(
  subFilter: any,
  parentFilter: Filter,
): Subject {
  const style = getCategoryStyle(parentFilter.name);

  const subject: Subject = {
    id: subFilter.id,
    name: subFilter.name,
    parentId: subFilter.parent_id || subFilter.filter_id,
    type: 'topic',
    category: style.category as Subject['category'],
    categoryLabel: style.categoryLabel,
    categoryColor: style.categoryColor,
    categoryIcon: style.categoryIcon,
  };

  // Processar children recursivamente
  if (subFilter.children && subFilter.children.length > 0) {
    subject.children = subFilter.children.map((child: any) =>
      subFilterToSubject(child, parentFilter),
    );
  }

  return subject;
}

/**
 * Converte FilterHierarchy para Subject com children (recursivo)
 */
export function hierarchyToSubjects(hierarchy: FilterHierarchy[]): Subject[] {
  return hierarchy.map((filter) => {
    const parentSubject = filterToSubject(filter);

    if (filter.children && filter.children.length > 0) {
      parentSubject.children = filter.children.map((subFilter) =>
        subFilterToSubject(subFilter, filter),
      );
    }

    return parentSubject;
  });
}

/**
 * Converte lista de filtros para formato de Subject
 */
export function filtersToSubjects(filters: Filter[]): Subject[] {
  return filters.map(filterToSubject);
}

/**
 * Converte lista de subfiltros para formato de Subject
 */
export function subFiltersToSubjects(
  subFilters: SubFilter[],
  parentFilter: Filter,
): Subject[] {
  return subFilters.map((subFilter) => subFilterToSubject(subFilter, parentFilter));
}
