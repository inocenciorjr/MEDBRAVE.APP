import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface PlannerEvent {
  id?: string;
  user_id?: string;
  event_type: 'system_review' | 'user_task';
  content_type?: string;
  title: string;
  description?: string;
  date: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  color: string;
  icon: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completed_count?: number;
  total_count?: number;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  is_recurring?: boolean;
  recurrence_pattern?: {
    days: number[]; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  };
  parent_event_id?: string;
  recurrence_end_date?: string;
}

export const plannerService = {
  // Listar eventos
  async getEvents(startDate?: string, endDate?: string): Promise<PlannerEvent[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/planner/events${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetchWithAuth(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao buscar eventos');
    }
    
    return data.data.events;
  },

  // Criar evento
  async createEvent(eventData: Omit<PlannerEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PlannerEvent> {
    const response = await fetchWithAuth('/planner/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao criar evento');
    }
    
    return data.data.event;
  },

  // Atualizar evento
  async updateEvent(eventId: string, eventData: Partial<PlannerEvent>): Promise<PlannerEvent> {
    const response = await fetchWithAuth(`/planner/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao atualizar evento');
    }
    
    return data.data.event;
  },

  // Deletar evento
  async deleteEvent(eventId: string): Promise<void> {
    const response = await fetchWithAuth(`/planner/events/${eventId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao deletar evento');
    }
  },

  // Atualizar progresso
  async updateProgress(eventId: string, completedCount: number, totalCount: number): Promise<PlannerEvent> {
    const response = await fetchWithAuth(`/planner/events/${eventId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ completedCount, totalCount }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao atualizar progresso');
    }
    
    return data.data.event;
  },

  // Buscar evento por data e tipo
  async getEventByDateAndType(date: string, contentType: string): Promise<PlannerEvent | null> {
    const params = new URLSearchParams({ date, contentType });
    const response = await fetchWithAuth(`/planner/events/by-date-type?${params.toString()}`);
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Erro ao buscar evento');
    }
    
    return data.data.event;
  },
};
