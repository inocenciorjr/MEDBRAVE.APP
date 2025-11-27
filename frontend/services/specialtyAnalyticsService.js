// Serviço de Analytics por Especialidade – frontbrave/src/services/specialtyAnalyticsService.js
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const isDev = process.env.NODE_ENV === 'development';
const API_URL = isDev 
  ? 'http://localhost:5000/api' 
  : (process.env.NEXT_PUBLIC_API_URL || 'https://medbraveapp-production.up.railway.app/api');

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