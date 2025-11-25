// Serviço de Metas – frontbrave/src/services/goalService.js
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function req(path, options = {}) {
  const res = await fetchWithAuth(`${API_URL}/goals${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error('GoalService error');
  return res.json();
}

export const goalService = {
  list: () => req('/'),
  create: (payload) => req('/', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => req(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => req(`/${id}`, { method: 'DELETE' }),
  progress: () => req('/progress'),
};