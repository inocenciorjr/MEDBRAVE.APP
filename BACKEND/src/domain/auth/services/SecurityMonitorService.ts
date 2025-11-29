import { createClient } from '@supabase/supabase-js';
import { AlertService } from '../../alerts/services/AlertService';
import logger from '../../../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SessionActivity {
  userId: string;
  sessionCount: number;
  uniqueIPs: number;
  uniqueDevices: number;
  recentLogins: number; // últimas 24h
  disconnects: number; // últimas 24h
}

interface SuspiciousActivity {
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
}

export class SecurityMonitorService {
  private supabase: ReturnType<typeof createClient>;
  private alertService: AlertService;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    this.alertService = new AlertService();
  }

  /**
   * Analisa atividade de sessões de um usuário usando dados do Redis (tempo real)
   */
  async analyzeUserSessionActivity(userId: string): Promise<SessionActivity> {
    try {
      const { redis } = require('../../../lib/redis');
      
      // Buscar todas as sessões ativas do usuário no Redis
      const pattern = `presence:${userId}:*`;
      const keys = await redis.keys(pattern);
      
      console.log(`[SecurityMonitor] Buscando sessões para userId: ${userId}`);
      console.log(`[SecurityMonitor] Pattern: ${pattern}`);
      console.log(`[SecurityMonitor] Keys encontradas: ${keys.length}`, keys);
      
      const sessions = [];
      const uniqueIPs = new Set<string>();
      const uniqueDevices = new Set<string>();
      
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const session = JSON.parse(data);
          console.log(`[SecurityMonitor] Sessão do Redis:`, session);
          sessions.push(session);
          if (session.ip) uniqueIPs.add(session.ip);
          if (session.userAgent) uniqueDevices.add(session.userAgent);
        }
      }
      
      console.log(`[SecurityMonitor] IPs únicos:`, Array.from(uniqueIPs));
      console.log(`[SecurityMonitor] Devices únicos:`, uniqueDevices.size);
      
      // Buscar audit logs das últimas 24h para logins e disconnects
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      console.log(`[SecurityMonitor] Buscando audit logs desde: ${yesterday.toISOString()}`);

      const { data: auditLogs, error: auditError } = await this.supabase
        .from('auth.audit_log_entries')
        .select('payload, created_at, ip_address')
        .eq('payload->>actor_id', userId)
        .gte('created_at', yesterday.toISOString());

      console.log(`[SecurityMonitor] Audit logs encontrados:`, auditLogs?.length || 0);
      if (auditError) console.error(`[SecurityMonitor] Erro ao buscar audit logs:`, auditError);

      const recentLogins = auditLogs?.filter(
        (log: any) => log.payload?.action === 'login' || log.payload?.action === 'user_signedin'
      ).length || 0;

      const disconnects = auditLogs?.filter(
        (log: any) => log.payload?.action === 'logout' || log.payload?.action === 'token_revoked' || log.payload?.action === 'user_signedout'
      ).length || 0;

      console.log(`[SecurityMonitor] Logins recentes: ${recentLogins}, Disconnects: ${disconnects}`);

      return {
        userId,
        sessionCount: sessions.length,
        uniqueIPs: uniqueIPs.size,
        uniqueDevices: uniqueDevices.size,
        recentLogins,
        disconnects,
      };
    } catch (error) {
      console.error('[SecurityMonitor] Erro ao analisar atividade:', error);
      // Fallback para dados vazios
      return {
        userId,
        sessionCount: 0,
        uniqueIPs: 0,
        uniqueDevices: 0,
        recentLogins: 0,
        disconnects: 0,
      };
    }
  }

  /**
   * Detecta atividades suspeitas
   */
  async detectSuspiciousActivity(userId: string): Promise<SuspiciousActivity[]> {
    const activity = await this.analyzeUserSessionActivity(userId);
    const suspicious: SuspiciousActivity[] = [];

    // 1. Muitas sessões simultâneas (> 5)
    if (activity.sessionCount > 5) {
      suspicious.push({
        userId,
        reason: 'Muitas sessões simultâneas',
        severity: 'high',
        details: {
          sessionCount: activity.sessionCount,
          threshold: 5,
        },
      });
    }

    // 2. Muitos IPs diferentes (> 3)
    if (activity.uniqueIPs > 3) {
      suspicious.push({
        userId,
        reason: 'Múltiplos IPs diferentes',
        severity: 'medium',
        details: {
          uniqueIPs: activity.uniqueIPs,
          threshold: 3,
        },
      });
    }

    // 3. Muitos logins recentes (> 10 em 24h)
    if (activity.recentLogins > 10) {
      suspicious.push({
        userId,
        reason: 'Muitos logins em 24 horas',
        severity: 'medium',
        details: {
          recentLogins: activity.recentLogins,
          threshold: 10,
        },
      });
    }

    // 4. Muitos disconnects (> 5 em 24h)
    if (activity.disconnects > 5) {
      suspicious.push({
        userId,
        reason: 'Muitos disconnects em 24 horas',
        severity: 'low',
        details: {
          disconnects: activity.disconnects,
          threshold: 5,
        },
      });
    }

    // Criar alertas para atividades suspeitas
    for (const item of suspicious) {
      try {
        await this.alertService.createAlert({
          user_id: userId,
          type: item.severity === 'high' ? 'danger' : 'warning',
          code: 'EXCESS_LAPSES', // Reutilizando código existente
          message: `${item.reason}: ${JSON.stringify(item.details)}`,
          read_at: null,
        });
      } catch (error) {
        logger.error('[SecurityMonitor] Erro ao criar alerta:', error);
      }
    }

    return suspicious;
  }

  /**
   * Obtém localização aproximada de um IP
   */
  async getIPLocation(ip: string): Promise<{ country?: string; city?: string; region?: string } | null> {
    // Ignorar IPs locais
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'Local',
        city: 'Localhost',
        region: 'Development',
      };
    }

    // Lista de APIs para tentar (fallback) - ordenadas por velocidade
    const apis = [
      {
        name: 'geojs.io',
        url: `https://get.geojs.io/v1/ip/geo/${ip}.json`,
        parse: (data: any) => ({
          city: data.city,
          region: data.region,
          country: data.country
        })
      },
      {
        name: 'ip-api.com',
        url: `http://ip-api.com/json/${ip}`,
        parse: (data: any) => data.status === 'success' ? {
          city: data.city,
          region: data.regionName,
          country: data.country
        } : null
      },
      {
        name: 'ipapi.co',
        url: `https://ipapi.co/${ip}/json/`,
        parse: (data: any) => ({
          city: data.city,
          region: data.region,
          country: data.country_name
        })
      }
    ];

    // Tentar cada API até conseguir
    for (const api of apis) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'MedBrave-Backend/1.0'
          }
        });
        clearTimeout(timeout);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const location = api.parse(data);
        
        if (location && location.city) {
          return location;
        }
      } catch (error) {
        continue; // Tenta a próxima API
      }
    }

    return null;
  }

  /**
   * Analisa todas as sessões e detecta padrões suspeitos
   */
  async scanAllUsersForSuspiciousActivity(): Promise<SuspiciousActivity[]> {
    // Buscar usuários com muitas sessões
    const { data: userSessions } = await this.supabase
      .from('auth.sessions')
      .select('user_id')
      .order('created_at', { ascending: false });

    if (!userSessions) return [];

    // Agrupar por usuário
    const userSessionCounts = userSessions.reduce((acc: Record<string, number>, session: any) => {
      acc[session.user_id] = (acc[session.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Detectar usuários suspeitos
    const allSuspicious: SuspiciousActivity[] = [];

    for (const [userId, count] of Object.entries(userSessionCounts)) {
      if ((count as number) > 3) {
        const suspicious = await this.detectSuspiciousActivity(userId);
        allSuspicious.push(...suspicious);
      }
    }

    return allSuspicious;
  }
}
