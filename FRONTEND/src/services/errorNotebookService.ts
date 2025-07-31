// Serviço para gerenciar o caderno de erros
export const errorNotebookService = {
  async getAllEntries() {
    // Implementação futura - retornar dados mock por enquanto
    return {
      data: []
    };
  },

  async addEntry(data: any) {
    // Implementação futura
    return {
      id: 'entry_' + Date.now(),
      ...data
    };
  },

  async removeEntry(id: string) {
    // Implementação futura
    return { success: true };
  },

  async updateEntry(id: string, data: any) {
    // Implementação futura
    return {
      id,
      ...data
    };
  }
};

