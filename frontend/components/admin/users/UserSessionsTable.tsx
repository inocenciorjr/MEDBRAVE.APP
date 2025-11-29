'use client';

import { useState, useEffect } from 'react';
import { AdminButton } from '../ui/AdminButton';
import type { UserSession } from '@/types/admin/user';
import { getUserSessions, terminateUserSessions } from '@/services/admin/userService';
import { useToast } from '@/lib/contexts/ToastContext';
import { usePresenceSocket } from '@/lib/hooks/usePresenceSocket';

interface UserSessionsTableProps {
  userId: string;
}

interface IPLocation {
  country?: string;
  city?: string;
  region?: string;
}

export function UserSessionsTable({ userId }: UserSessionsTableProps) {
  const toast = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Record<string, IPLocation>>({});
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(new Set());

  // Conectar ao Socket.IO para receber atualizações em tempo real
  const { isConnected } = usePresenceSocket({
    autoConnect: true,
    onPresenceUpdate: (update) => {
      // Atualizar sessão específica quando receber atualização
      if (update.userId === userId) {
        setSessions(prevSessions => 
          prevSessions.map(session => 
            session.id === update.sessionId
              ? {
                  ...session,
                  last_activity: new Date(update.lastActivity).toISOString(),
                  is_active: true,
                }
              : session
          )
        );
      }
    },
    onPresenceLeave: (leave) => {
      // Marcar sessão como inativa quando usuário sair
      if (leave.userId === userId) {
        setSessions(prevSessions => 
          prevSessions.map(session => 
            session.id === leave.sessionId
              ? { ...session, is_active: false }
              : session
          )
        );
      }
    },
  });

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const result = await getUserSessions(userId);
      setSessions(result);
      
      // Buscar localização automaticamente para cada sessão
      result.forEach(session => {
        if (session.ip_address && !locations[session.ip_address]) {
          fetchIPLocation(session.ip_address, session.id);
        }
      });
    } catch (error: any) {
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const fetchIPLocation = async (ip: string, sessionId: string) => {
    if (loadingLocations.has(sessionId) || locations[ip]) return;
    
    setLoadingLocations(prev => new Set(prev).add(sessionId));
    
    try {
      // Usar baseService para incluir token
      const { get } = await import('@/services/admin/baseService');
      const result = await get<{ success: boolean; data: IPLocation }>(`/admin/users/${userId}/ip-location/${ip}`);
      
      if (result.success && result.data) {
        setLocations(prev => ({
          ...prev,
          [ip]: result.data
        }));
      }
    } catch (error) {
      // Silencioso
    } finally {
      setLoadingLocations(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleTerminateAll = async () => {
    if (!confirm('Tem certeza que deseja encerrar TODAS as sessões deste usuário?')) {
      return;
    }

    try {
      await terminateUserSessions(userId);
      toast.success('Todas as sessões foram encerradas');
      await loadSessions();
    } catch (error: any) {
      toast.error('Erro ao encerrar sessões');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja encerrar esta sessão?')) {
      return;
    }

    try {
      const { del } = await import('@/services/admin/baseService');
      await del(`/admin/users/${userId}/sessions/${sessionId}`);
      toast.success('Sessão encerrada com sucesso');
      await loadSessions();
    } catch (error: any) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const parseDeviceInfo = (userAgent: string | undefined) => {
    if (!userAgent) return { type: 'devices', name: 'Dispositivo Desconhecido', os: '' };
    
    const ua = userAgent.toLowerCase();
    let type = 'devices';
    let name = '';
    let os = '';
    
    // Detectar OS
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os x')) {
      const match = ua.match(/mac os x (\d+)[._](\d+)/);
      os = match ? `macOS ${match[1]}.${match[2]}` : 'macOS';
    }
    else if (ua.includes('android')) {
      const match = ua.match(/android (\d+\.?\d*)/);
      os = match ? `Android ${match[1]}` : 'Android';
    }
    else if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = ua.match(/os (\d+)[._](\d+)/);
      os = match ? `iOS ${match[1]}.${match[2]}` : 'iOS';
    }
    else if (ua.includes('linux')) os = 'Linux';
    
    // Detectar tipo e modelo do dispositivo
    if (ua.includes('iphone')) {
      type = 'smartphone';
      name = 'iPhone';
    } else if (ua.includes('ipad')) {
      type = 'tablet';
      name = 'iPad';
    } else if (ua.includes('android')) {
      // Tentar extrair marca e modelo
      const brands = ['samsung', 'xiaomi', 'motorola', 'lg', 'huawei', 'oneplus', 'oppo', 'vivo', 'realme', 'asus', 'nokia'];
      const foundBrand = brands.find(brand => ua.includes(brand));
      
      if (ua.includes('tablet')) {
        type = 'tablet';
        name = foundBrand ? `${foundBrand.charAt(0).toUpperCase() + foundBrand.slice(1)} Tablet` : 'Tablet Android';
      } else {
        type = 'smartphone';
        name = foundBrand ? `${foundBrand.charAt(0).toUpperCase() + foundBrand.slice(1)}` : 'Android';
      }
      
      // Tentar extrair modelo específico
      const modelMatch = ua.match(/\(([^)]+)\)/);
      if (modelMatch && modelMatch[1]) {
        const parts = modelMatch[1].split(';');
        const modelPart = parts.find(p => 
          p.includes('sm-') || p.includes('moto') || p.includes('redmi') || 
          p.includes('mi ') || p.includes('pixel')
        );
        if (modelPart) {
          name = modelPart.trim();
        }
      }
    } else if (ua.includes('mobile') || ua.includes('phone')) {
      type = 'smartphone';
      name = 'Smartphone';
    } else if (ua.includes('tablet')) {
      type = 'tablet';
      name = 'Tablet';
    } else {
      type = 'computer';
      name = os || 'Desktop';
    }
    
    return { type, name, os };
  };

  const getDeviceIcon = (device: string | undefined) => {
    const info = parseDeviceInfo(device);
    return info.type;
  };

  const getBrowserIcon = (browser: string | undefined) => {
    if (!browser) return '🌐';
    const b = browser.toLowerCase();
    if (b.includes('chrome')) return '🌐';
    if (b.includes('firefox')) return '🦊';
    if (b.includes('safari')) return '🧭';
    if (b.includes('edge')) return '🔷';
    if (b.includes('opera')) return '🔴';
    return '🌐';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    if (diffMins > 0) return `${diffMins}min atrás`;
    return 'Agora';
  };

  const getActivityStatus = (session: UserSession) => {
    // Se is_active está definido (vindo do Redis), usar esse valor
    if (session.is_active !== undefined) {
      if (session.is_active) {
        return { 
          label: 'Online agora', 
          color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          icon: 'circle',
        };
      }
    }
    
    // Fallback: calcular baseado em last_activity
    const now = new Date();
    const activity = new Date(session.last_activity);
    const diffMins = Math.floor((now.getTime() - activity.getTime()) / 60000);

    if (diffMins < 2) {
      return { 
        label: 'Ativo agora', 
        color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        icon: 'circle',
      };
    }
    if (diffMins < 30) {
      return { 
        label: 'Ativo recentemente', 
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: 'schedule',
      };
    }
    return { 
      label: 'Inativo', 
      color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
      icon: 'radio_button_unchecked',
    };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Sessões Ativas
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {sessions.length} {sessions.length === 1 ? 'sessão ativa' : 'sessões ativas'}
            </p>
          </div>
          
          {/* Indicador de conexão em tempo real */}
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 
                          border border-green-200 dark:border-green-800 rounded-lg">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Tempo Real
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <AdminButton
            size="sm"
            variant="outline"
            onClick={loadSessions}
            icon="refresh"
          >
            Atualizar
          </AdminButton>
          
          {sessions.length > 0 && (
            <AdminButton
              size="sm"
              variant="danger"
              onClick={handleTerminateAll}
              icon="logout"
            >
              Encerrar Todas
            </AdminButton>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                      rounded-2xl shadow-xl dark:shadow-dark-xl p-12 border-2 border-border-light dark:border-border-dark
                      text-center animate-fade-in">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gray-500/10 rounded-full blur-2xl"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full 
                          flex items-center justify-center shadow-2xl mx-auto">
              <span className="material-symbols-outlined text-white text-5xl">
                devices_off
              </span>
            </div>
          </div>
          <h4 className="text-xl font-display font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Nenhuma Sessão Ativa
          </h4>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Este usuário não possui sessões ativas no momento
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, index) => {
            const activityStatus = getActivityStatus(session);
            const location = locations[session.ip_address];
            const isLoadingLocation = loadingLocations.has(session.id);
            
            return (
              <div
                key={session.id}
                className="group relative overflow-hidden bg-gradient-to-br from-surface-light to-background-light 
                         dark:from-surface-dark dark:to-background-dark rounded-2xl border-2 border-border-light 
                         dark:border-border-dark shadow-lg hover:shadow-2xl dark:shadow-dark-lg dark:hover:shadow-dark-2xl
                         transition-all duration-300 hover:scale-[1.01] animate-slide-in-from-bottom"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Animated Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative p-6">
                  <div className="flex items-start gap-5">
                    {/* Device Icon with Glow */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 
                                    group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 
                                    dark:from-primary/20 dark:to-primary/10 flex items-center justify-center 
                                    shadow-lg group-hover:scale-110 transition-all duration-300 border-2 
                                    border-primary/20 group-hover:border-primary/40">
                        <span className="material-symbols-outlined text-3xl text-primary">
                          {getDeviceIcon(session.device)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const deviceInfo = parseDeviceInfo(session.device);
                            return (
                              <>
                                <h4 className="font-display font-bold text-lg text-text-light-primary dark:text-text-dark-primary mb-1 
                                             group-hover:text-primary transition-colors">
                                  {deviceInfo.name}
                                </h4>
                                {deviceInfo.os && (
                                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                    {deviceInfo.os}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background-light dark:bg-background-dark 
                                          rounded-lg border border-border-light dark:border-border-dark">
                              <span className="text-lg">{getBrowserIcon(session.browser)}</span>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">
                                {session.browser}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md ${activityStatus.color} border-2`}>
                              <span className="material-symbols-outlined text-sm">
                                {activityStatus.icon}
                              </span>
                              <span>{activityStatus.label}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botão de encerrar sessão */}
                        <button
                          onClick={() => handleTerminateSession(session.id)}
                          className="flex-shrink-0 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 
                                   border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400
                                   hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors
                                   group/btn"
                          title="Encerrar esta sessão"
                        >
                          <span className="material-symbols-outlined text-xl group-hover/btn:scale-110 transition-transform">
                            logout
                          </span>
                        </button>
                      </div>

                      {/* Session Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* IP Address */}
                        <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark 
                                      rounded-xl border border-border-light dark:border-border-dark
                                      hover:border-primary/30 transition-colors group/item">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg 
                                        flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
                              public
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5">
                              Endereço IP
                            </p>
                            <p className="font-mono text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                              {session.ip_address}
                            </p>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark 
                                      rounded-xl border border-border-light dark:border-border-dark
                                      hover:border-primary/30 transition-colors group/item">
                          <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 dark:bg-green-500/20 rounded-lg 
                                        flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">
                              location_on
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5">
                              Localização
                            </p>
                            {isLoadingLocation ? (
                              <div className="flex items-center gap-1.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                <span className="material-symbols-outlined text-sm animate-spin">
                                  progress_activity
                                </span>
                                <span>Buscando...</span>
                              </div>
                            ) : location ? (
                              <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                                {location.city}, {location.country}
                              </p>
                            ) : (
                              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                Não disponível
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark 
                                      rounded-xl border border-border-light dark:border-border-dark
                                      hover:border-primary/30 transition-colors group/item">
                          <div className="flex-shrink-0 w-10 h-10 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg 
                                        flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl">
                              schedule
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5">
                              Última Atividade
                            </p>
                            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                              {getSessionAge(session.last_activity)}
                            </p>
                          </div>
                        </div>

                        {/* Created At */}
                        <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark 
                                      rounded-xl border border-border-light dark:border-border-dark
                                      hover:border-primary/30 transition-colors group/item">
                          <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg 
                                        flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">
                              event
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5">
                              Criada em
                            </p>
                            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                              {formatDate(session.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Página Atual (se disponível) */}
                      {session.metadata?.page && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 
                                      dark:from-primary/10 dark:to-primary/20 rounded-xl border-2 border-primary/30">
                          <div className="flex-shrink-0 w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-lg 
                                        flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-xl">
                              web
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-primary/80 mb-0.5">
                              Página Atual
                            </p>
                            <p className="text-sm font-semibold text-primary truncate">
                              {session.metadata.page}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}

                      {/* Session ID */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark">
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-sm">
                          fingerprint
                        </span>
                        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          ID da Sessão:
                        </span>
                        <code className="text-xs font-mono text-text-light-primary dark:text-text-dark-primary 
                                       bg-background-light dark:bg-background-dark px-2 py-1 rounded border 
                                       border-border-light dark:border-border-dark">
                          {session.id}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      {sessions.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
              info
            </span>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">Sobre as sessões:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sessões ativas permitem que o usuário acesse a plataforma</li>
                <li>Encerrar uma sessão força o logout imediato do dispositivo</li>
                <li>O usuário pode ter múltiplas sessões simultâneas</li>
                <li>Sessões inativas por muito tempo são encerradas automaticamente</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
