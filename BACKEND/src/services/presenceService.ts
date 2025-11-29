import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';

interface UserPresence {
  userId: string;
  sessionId: string;
  socketId: string;
  connectedAt: number;
  lastActivity: number;
  metadata?: {
    page?: string;
    device?: string;
    browser?: string;
  };
}

export class PresenceService {
  private redis: Redis;
  private io: SocketIOServer;
  private readonly PRESENCE_TTL = 90; // 90 segundos
  private readonly PRESENCE_KEY_PREFIX = 'presence:';

  constructor(io: SocketIOServer) {
    this.io = io;
    // Usar configuração existente do Redis
    const { redis } = require('../lib/redis');
    this.redis = redis;


  }

  /**
   * Registra presença de um usuário
   */
  async setPresence(userId: string, sessionId: string, socketId: string, metadata?: any): Promise<void> {
    const presence: UserPresence = {
      userId,
      sessionId,
      socketId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      metadata,
    };

    const key = `${this.PRESENCE_KEY_PREFIX}${userId}:${sessionId}`;
    
    // Salvar no Redis com TTL
    await this.redis.setex(key, this.PRESENCE_TTL, JSON.stringify(presence));
    
    // Adicionar ao sorted set para queries rápidas
    await this.redis.zadd('presence:active', Date.now(), key);
    
    // Publicar evento
    await this.redis.publish('presence:join', JSON.stringify({ userId, sessionId, socketId }));
  }

  /**
   * Atualiza última atividade (heartbeat)
   */
  async updateActivity(userId: string, sessionId: string, metadata?: any): Promise<void> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}:${sessionId}`;
    
    const existingData = await this.redis.get(key);
    if (!existingData) return;

    const presence: UserPresence = JSON.parse(existingData);
    presence.lastActivity = Date.now();
    if (metadata) {
      presence.metadata = { ...presence.metadata, ...metadata };
    }

    // Renovar TTL
    await this.redis.setex(key, this.PRESENCE_TTL, JSON.stringify(presence));
    
    // Atualizar score no sorted set
    await this.redis.zadd('presence:active', Date.now(), key);
  }

  /**
   * Remove presença de um usuário
   */
  async removePresence(userId: string, sessionId: string): Promise<void> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}:${sessionId}`;
    
    await this.redis.del(key);
    await this.redis.zrem('presence:active', key);
    
    // Publicar evento
    await this.redis.publish('presence:leave', JSON.stringify({ userId, sessionId }));
  }

  /**
   * Obtém todas as presenças ativas
   */
  async getActivePresences(): Promise<UserPresence[]> {
    const now = Date.now();
    const cutoff = now - (this.PRESENCE_TTL * 1000);
    
    // Remover entradas expiradas do sorted set
    await this.redis.zremrangebyscore('presence:active', 0, cutoff);
    
    // Buscar todas as keys ativas
    const keys = await this.redis.zrangebyscore('presence:active', cutoff, now);
    
    if (keys.length === 0) return [];
    
    // Buscar dados de todas as keys
    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    const presences: UserPresence[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data) {
        try {
          presences.push(JSON.parse(data as string));
        } catch (e) {
          // ignore
        }
      }
    });
    
    return presences;
  }

  /**
   * Obtém presença de um usuário específico
   */
  async getUserPresence(userId: string): Promise<UserPresence[]> {
    const pattern = `${this.PRESENCE_KEY_PREFIX}${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) return [];
    
    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    const presences: UserPresence[] = [];
    results?.forEach(([err, data]) => {
      if (!err && data) {
        try {
          presences.push(JSON.parse(data as string));
        } catch (e) {
          // ignore
        }
      }
    });
    
    return presences;
  }

  /**
   * Conta usuários online
   */
  async getOnlineCount(): Promise<number> {
    const now = Date.now();
    const cutoff = now - (this.PRESENCE_TTL * 1000);
    
    return await this.redis.zcount('presence:active', cutoff, now);
  }

  /**
   * Limpa presenças expiradas (executar periodicamente)
   */
  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const cutoff = now - (this.PRESENCE_TTL * 1000);
    
    const expiredKeys = await this.redis.zrangebyscore('presence:active', 0, cutoff);
    
    if (expiredKeys.length > 0) {
      const pipeline = this.redis.pipeline();
      expiredKeys.forEach(key => {
        pipeline.del(key);
        pipeline.zrem('presence:active', key);
      });
      await pipeline.exec();
    }
  }
}
