// Serviço de Alertas – frontbrave/src/services/alertService.js
// Usa fetch API com credenciais e trata erros básicos
import { fetchWithAuth } from './fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, opts = {}) {
  const res = await fetchWithAuth(`${API_URL}/alerts${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`AlertService error: ${res.status}`);
  return res.json();
}

export const alertService = {
  async listUnread() {
    const json = await request('/');
    return json.data || [];
  },
  async markAsRead(id) {
    await request(`/${id}/read`, { method: 'POST' });
  },
};