import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.constant.js';
import { Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // 1. Check PostgreSQL
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency: number | undefined;
    let dbError: string | undefined;

    try {
      const dbStart = Date.now();
      await this.dataSource.query('SELECT 1');
      dbLatency = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (err: any) {
      dbError = err.message || 'Database connection error';
      this.logger.error(`[HealthCheck] Database check failed: ${dbError}`);
    }

    // 2. Check Redis
    let redisStatus: 'up' | 'down' = 'down';
    let redisLatency: number | undefined;
    let redisError: string | undefined;

    try {
      const redisStart = Date.now();
      const pong = await this.redisClient.ping();
      if (pong === 'PONG') {
        redisLatency = Date.now() - redisStart;
        redisStatus = 'up';
      } else {
        redisError = `Unexpected response: ${pong}`;
      }
    } catch (err: any) {
      redisError = err.message || 'Redis connection error';
      this.logger.error(`[HealthCheck] Redis check failed: ${redisError}`);
    }

    // 3. Memory stats
    const mem = process.memoryUsage();
    const toMb = (bytes: number) =>
      Math.round((bytes / 1024 / 1024) * 100) / 100;

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatency,
          ...(redisError ? { error: redisError } : {}),
        },
      },
      memory: {
        rssMb: toMb(mem.rss),
        heapUsedMb: toMb(mem.heapUsed),
        heapTotalMb: toMb(mem.heapTotal),
      },
    };
  }
}
