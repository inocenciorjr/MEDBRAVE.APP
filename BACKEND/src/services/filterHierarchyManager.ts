// Supabase client not required; using internal HTTP endpoints for hierarchy

export interface FilterNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  children: FilterNode[];
  path: string[]; // Full path from root to this node (IDs)
  pathNames: string[]; // Full path from root to this node (names)
  keywords: string[];
}

export class FilterHierarchyManager {
  private hierarchyCache: Map<string, FilterNode>;
  private rootNodes: FilterNode[];
  private lastCacheUpdate: Date | null;
  private apiBaseUrl: string;
  private supabaseKey: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.hierarchyCache = new Map();
    this.rootNodes = [];
    this.lastCacheUpdate = null;
    this.apiBaseUrl = supabaseUrl || 'http://localhost:5000';
    this.supabaseKey = supabaseKey;
  }

  async loadHierarchy(forceReload: boolean = false): Promise<FilterNode[]> {
    // Check if cache is still valid (5 minutes)
    if (!forceReload && this.lastCacheUpdate) {
      const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
      if (cacheAge < 5 * 60 * 1000) {
        console.log('✅ Using cached filter hierarchy');
        return this.rootNodes;
      }
    }

    console.log('🔄 Loading filter hierarchy using internal HTTP call (same endpoint as frontend)...');

    try {
      // Fazer chamada HTTP interna para o endpoint que já funciona
      const axios = require('axios');
      const response = await axios.get(`${this.apiBaseUrl}/api/admin/filters`, {
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
        }
      });
      
      const filters = response.data?.data || response.data || [];
      // console.log('🔥 FilterHierarchyManager: HTTP endpoint returned:', filters?.length || 0, 'filters');
      
      // if (filters.length > 0) {
      //   console.log('🔥 FilterHierarchyManager: First filter structure:', {
      //     id: filters[0].id,
      //     name: filters[0].name,
      //     hasChildren: !!filters[0].children,
      //     childrenCount: filters[0].children?.length || 0,
      //     hasSubfilters: !!filters[0].subfilters,
      //     subfiltersCount: filters[0].subfilters?.length || 0,
      //     keys: Object.keys(filters[0])
      //   });
      // }
      // Converter para o formato FilterNode
      this.rootNodes = this.convertFiltersToNodes(filters);
      
      if (this.rootNodes.length > 0) {
        console.log(`📋 First root node:`, {
          id: this.rootNodes[0].id,
          name: this.rootNodes[0].name,
          childrenCount: this.rootNodes[0].children.length
        });
      }
      
      this.lastCacheUpdate = new Date();
    } catch (error) {
      console.error('❌ Error loading hierarchy:', error);
      throw error;
    }



    return this.rootNodes;
  }



  /**
   * Converte os filtros do repositório para FilterNodes (mesma estrutura que o controller retorna)
   */
  private convertFiltersToNodes(filters: any[]): FilterNode[] {
    this.hierarchyCache.clear();

    const filterNodes: FilterNode[] = filters.map(filter => {
      // O repositório mapeia subfiltros para 'children'
      const children = filter.children || filter.subfilters || [];
      
      const filterNode: FilterNode = {
        id: filter.id,
        name: filter.name,
        level: 0,
        parentId: null,
        children: this.convertChildrenToNodes(children, [filter.id], [filter.name], 1),
        path: [filter.id],
        pathNames: [filter.name],
        keywords: this.extractKeywords(filter.name),
      };

      // Add to cache
      this.hierarchyCache.set(filterNode.id, filterNode);
      
      // Add children to cache recursively
      this.addChildrenToCache(filterNode.children, filterNode);

      return filterNode;
    });

    return filterNodes;
  }

  /**
   * Converte os children recursivamente (mesma estrutura que vem do repositório)
   */
  private convertChildrenToNodes(
    children: any[],
    parentPath: string[],
    parentPathNames: string[],
    level: number
  ): FilterNode[] {
    if (!children || children.length === 0) return [];

    return children.map(child => {
      const path = [...parentPath, child.id];
      const pathNames = [...parentPathNames, child.name];

      const node: FilterNode = {
        id: child.id,
        name: child.name,
        level,
        parentId: parentPath[parentPath.length - 1],
        children: this.convertChildrenToNodes(child.children || [], path, pathNames, level + 1),
        path,
        pathNames,
        keywords: this.extractKeywords(child.name),
      };

      return node;
    });
  }


  /**
   * Converte subfiltros do formato do banco para FilterNode
   */
  private convertSubfiltersToFilterNodes(subfilters: any[], parentId: string): FilterNode[] {
    return subfilters.map(sub => {
      const node: FilterNode = {
        id: sub.id,
        name: sub.name,
        level: sub.level || 1,
        parentId: parentId,
        children: sub.children ? this.convertSubfiltersToFilterNodes(sub.children, sub.id) : [],
        path: [], // Will be filled by addChildrenToCache
        pathNames: [], // Will be filled by addChildrenToCache
        keywords: this.extractKeywords(sub.name),
      };
      return node;
    });
  }

  /**
   * Adiciona children ao cache recursivamente e constrói paths
   */
  private addChildrenToCache(children: FilterNode[], parent: FilterNode): void {
    children.forEach(child => {
      // Build path
      child.path = [...parent.path, child.id];
      child.pathNames = [...parent.pathNames, child.name];
      
      // Add to cache
      this.hierarchyCache.set(child.id, child);
      
      // Process children recursively
      if (child.children && child.children.length > 0) {
        this.addChildrenToCache(child.children, child);
      }
    });
  }

  getNodeById(id: string): FilterNode | null {
    return this.hierarchyCache.get(id) || null;
  }

  getFullPath(nodeId: string): FilterNode[] {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return [];
    }

    const path: FilterNode[] = [];
    for (const id of node.path) {
      const pathNode = this.getNodeById(id);
      if (pathNode) {
        path.push(pathNode);
      }
    }

    return path;
  }

  findNodesByKeywords(keywords: string[]): FilterNode[] {
    const results: FilterNode[] = [];
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    for (const node of this.hierarchyCache.values()) {
      const nodeKeywords = node.keywords.map(k => k.toLowerCase());
      const matches = lowerKeywords.some(keyword =>
        nodeKeywords.some(nodeKeyword => nodeKeyword.includes(keyword) || keyword.includes(nodeKeyword))
      );

      if (matches) {
        results.push(node);
      }
    }

    return results;
  }

  getCompactRepresentation(): string {
    const lines: string[] = [];

    const traverse = (node: FilterNode, indent: number = 0) => {
      const prefix = '  '.repeat(indent);
      lines.push(`${prefix}- [${node.id}] ${node.name}`);
      
      for (const child of node.children) {
        traverse(child, indent + 1);
      }
    };

    for (const root of this.rootNodes) {
      traverse(root);
    }

    return lines.join('\n');
  }

  getCompactRepresentationForAI(): string {
    const useLMStudio = process.env.USE_LM_STUDIO === 'true';
    
    // Ultra-compact format for LM Studio (limited context)
    if (useLMStudio) {
      const items: string[] = [];
      
      const traverse = (node: FilterNode, parentPath: string = '') => {
        const currentPath = parentPath ? `${parentPath}>${node.name}` : node.name;
        // Format: ID|Path (sem espaços extras)
        items.push(`${node.id}|${currentPath}`);
        
        for (const child of node.children) {
          traverse(child, currentPath);
        }
      };

      for (const root of this.rootNodes) {
        traverse(root);
      }

      return items.join('\n');
    }
    
    // Standard compact format for OpenRouter (larger context)
    const items: string[] = [];

    const traverse = (node: FilterNode, parentPath: string = '') => {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      items.push(`${node.id}: ${currentPath}`);
      
      for (const child of node.children) {
        traverse(child, currentPath);
      }
    };

    for (const root of this.rootNodes) {
      traverse(root);
    }

    return items.join('\n');
  }

  getAllNodes(): FilterNode[] {
    return Array.from(this.hierarchyCache.values());
  }

  getRootNodes(): FilterNode[] {
    return this.rootNodes;
  }

  getStatistics(): {
    totalNodes: number;
    totalFilters: number;
    totalSubfilters: number;
    maxDepth: number;
    averageChildrenPerNode: number;
  } {
    const allNodes = this.getAllNodes();
    const filters = allNodes.filter(n => n.level === 0);
    const subfilters = allNodes.filter(n => n.level > 0);

    let maxDepth = 0;
    let totalChildren = 0;

    for (const node of allNodes) {
      maxDepth = Math.max(maxDepth, node.level);
      totalChildren += node.children.length;
    }

    return {
      totalNodes: allNodes.length,
      totalFilters: filters.length,
      totalSubfilters: subfilters.length,
      maxDepth,
      averageChildrenPerNode: allNodes.length > 0 ? totalChildren / allNodes.length : 0,
    };
  }

  private extractKeywords(name: string): string[] {
    // Extract meaningful keywords from filter/subfilter name
    const words = name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words

    return [...new Set(words)]; // Remove duplicates
  }

  invalidateCache(): void {
    this.hierarchyCache.clear();
    this.rootNodes = [];
    this.lastCacheUpdate = null;
  }

  isCacheValid(): boolean {
    if (!this.lastCacheUpdate) {
      return false;
    }

    const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
    return cacheAge < 5 * 60 * 1000; // 5 minutes
  }
}

// Factory function
export function createFilterHierarchyManager(supabaseUrl: string, supabaseKey: string): FilterHierarchyManager {
  return new FilterHierarchyManager(supabaseUrl, supabaseKey);
}
