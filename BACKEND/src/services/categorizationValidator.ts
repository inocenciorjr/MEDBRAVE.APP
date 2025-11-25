/**
 * Validador de Categorização
 * Valida e limpa resultados de categorização antes de aplicar às questões
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedFilters: any[];
  cleanedSubfilters: any[];
}

export class CategorizationValidator {
  private validFilterIds: Set<string>;
  private validSubfilterIds: Set<string>;
  private hierarchyMap: Map<string, any>; // Mapa de ID -> nó completo

  constructor(
    private filterHierarchyManager: any
  ) {
    this.validFilterIds = new Set();
    this.validSubfilterIds = new Set();
    this.hierarchyMap = new Map();
    this.loadValidIds();
  }

  private loadValidIds() {
    // Carregar todos os IDs válidos da hierarquia
    try {
      const rootNodes = this.filterHierarchyManager.getRootNodes();
      
      const extractIds = (items: any[], isRoot: boolean = false, parentPath: any[] = []) => {
        items.forEach(item => {
          // Armazenar no mapa com caminho completo
          this.hierarchyMap.set(item.id, {
            ...item,
            parentPath: [...parentPath],
            isRoot,
          });
          
          if (isRoot) {
            this.validFilterIds.add(item.id);
          } else {
            this.validSubfilterIds.add(item.id);
          }
          
          if (item.children && item.children.length > 0) {
            extractIds(item.children, false, [...parentPath, item]);
          }
        });
      };
      
      extractIds(rootNodes, true);
      
      console.log(`✅ Validator loaded: ${this.validFilterIds.size} filters, ${this.validSubfilterIds.size} subfilters`);
    } catch (error) {
      console.warn('⚠️ Could not load filter IDs for validation:', error);
      // Continuar sem validação de IDs (apenas validação de formato)
    }
  }

  /**
   * Preenche automaticamente os níveis intermediários da hierarquia
   * Se temos "Hemocromatose", adiciona "Hepatologia" e "Outras Hepatopatias"
   */
  private fillMissingHierarchyLevels(subfilters: any[]): any[] {
    const result: any[] = [];
    const addedIds = new Set<string>();

    subfilters.forEach(subfilter => {
      const subfilterId = subfilter.subfilterId;
      const node = this.hierarchyMap.get(subfilterId);

      if (node && node.parentPath && node.parentPath.length > 0) {
        // Adicionar todos os níveis intermediários
        node.parentPath.forEach((parent: any) => {
          if (!parent.isRoot && !addedIds.has(parent.id)) {
            result.push({
              subfilterId: parent.id,
              subfilterName: parent.name,
              parentPath: parent.parentPath?.map((p: any) => p.name) || [],
              confidence: subfilter.confidence,
              reasoning: '',
            });
            addedIds.add(parent.id);
          }
        });
      }

      // Adicionar o subfiltro original
      if (!addedIds.has(subfilterId)) {
        result.push(subfilter);
        addedIds.add(subfilterId);
      }
    });

    return result;
  }

  /**
   * Valida uma categorização completa
   */
  validate(categorization: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cleanedFilters: any[] = [];
    const cleanedSubfilters: any[] = [];

    // Validar filtros
    const seenFilterIds = new Set<string>();
    const movedToSubfilters: any[] = []; // Subfiltros que foram colocados erroneamente em filters
    
    (categorization.suggestedFilters || []).forEach((filter: any) => {
      const filterId = filter.filterId;
      const filterName = filter.filterName;

      // Validação 1: Nome não pode conter " > "
      if (filterName && filterName.includes(' > ')) {
        warnings.push(`Filtro com caminho completo será expandido: ${filterName}`);
        return; // Será processado pela expansão
      }

      // Validação 2: Verificar se é realmente um filtro raiz ou se é um subfiltro
      if (this.validSubfilterIds.has(filterId) && !this.validFilterIds.has(filterId)) {
        warnings.push(`⚠️ "${filterName}" (${filterId}) é um SUBFILTRO, não um filtro raiz! Movendo para subfilters.`);
        // Mover para subfiltros
        const node = this.hierarchyMap.get(filterId);
        movedToSubfilters.push({
          subfilterId: filterId,
          subfilterName: filterName,
          parentPath: node?.parentPath?.map((p: any) => p.name) || [],
          confidence: filter.confidence,
          reasoning: filter.reasoning,
        });
        return;
      }

      // Validação 3: ID deve existir no banco (se temos IDs carregados)
      if (this.validFilterIds.size > 0 && !this.validFilterIds.has(filterId)) {
        errors.push(`Filtro com ID inválido: ${filterId} (${filterName})`);
        return;
      }

      // Validação 3: Permitir duplicatas (questões interdisciplinares podem ter mesmo filtro em múltiplos caminhos)
      // Exemplo: "Asma" pode aparecer em "Clínica Médica" e "Pediatria"
      // DESABILITADO: Não remover duplicatas
      // if (seenFilterIds.has(filterId)) {
      //   warnings.push(`Filtro duplicado removido: ${filterName}`);
      //   return;
      // }

      seenFilterIds.add(filterId);
      cleanedFilters.push(filter);
    });

    // Validar subfiltros (incluindo os que foram movidos de filters)
    const seenSubfilterIds = new Set<string>();
    const allSubfilters = [...(categorization.suggestedSubfilters || []), ...movedToSubfilters];
    
    allSubfilters.forEach((subfilter: any) => {
      const subfilterId = subfilter.subfilterId;
      const subfilterName = subfilter.subfilterName;

      // Validação 1: Nome não pode conter " > " (deve ser expandido antes)
      if (subfilterName && subfilterName.includes(' > ')) {
        warnings.push(`Subfiltro com caminho completo será expandido: ${subfilterName}`);
        return;
      }

      // Validação 2: ID deve existir no banco (se temos IDs carregados)
      if (this.validSubfilterIds.size > 0 && !this.validSubfilterIds.has(subfilterId)) {
        errors.push(`Subfiltro com ID inválido: ${subfilterId} (${subfilterName})`);
        return;
      }

      // Validação 3: Permitir duplicatas (questões interdisciplinares podem ter mesmo subfiltro em múltiplos caminhos)
      // Exemplo: "Diabetes" pode aparecer em "Clínica Médica > Endocrinologia" e "Pediatria > Endocrinologia Pediátrica"
      // DESABILITADO: Não remover duplicatas
      // if (seenSubfilterIds.has(subfilterId)) {
      //   warnings.push(`Subfiltro duplicado removido: ${subfilterName}`);
      //   return;
      // }

      seenSubfilterIds.add(subfilterId);
      cleanedSubfilters.push(subfilter);
    });

    // Validação final: Deve ter pelo menos 1 filtro e 2 subfiltros
    if (cleanedFilters.length === 0) {
      errors.push('Nenhum filtro válido encontrado');
    }

    if (cleanedSubfilters.length < 2) {
      warnings.push(`Apenas ${cleanedSubfilters.length} subfiltro(s) válido(s) - profundidade insuficiente`);
    }

    // ✅ PREENCHER NÍVEIS INTERMEDIÁRIOS FALTANTES
    const filledSubfilters = this.fillMissingHierarchyLevels(cleanedSubfilters);
    
    if (filledSubfilters.length > cleanedSubfilters.length) {
      console.log(`✅ Preenchidos ${filledSubfilters.length - cleanedSubfilters.length} níveis intermediários faltantes`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedFilters,
      cleanedSubfilters: filledSubfilters,
    };
  }
}

export function createCategorizationValidator(filterHierarchyManager: any): CategorizationValidator {
  return new CategorizationValidator(filterHierarchyManager);
}
