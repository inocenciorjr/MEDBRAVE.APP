// Serviço de Analytics por Especialidade – frontbrave/src/services/specialtyAnalyticsService.js
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function buildUrl(specId, path) {
  return `${API_URL}/analytics/specialty/${specId}${path}`;
}

async function fetchJson(url) {
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error('Analytics error');
  return res.json();
}

export const specialtyAnalyticsService = {
  trend: (specialtyId) => fetchJson(buildUrl(specialtyId, '/trend')).then(r => r.data),
  weekly: (specialtyId) => fetchJson(buildUrl(specialtyId, '/weekly')).then(r => r.data),
};