import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from './health.service.js';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

describe('HealthService (System Observability)', () => {
  let service: HealthService;
  let dataSourceMock: DataSource;
  let redisClientMock: Redis;

  beforeEach(() => {
    dataSourceMock = {
      query: vi.fn(),
    } as unknown as DataSource;

    redisClientMock = {
      ping: vi.fn(),
    } as unknown as Redis;

    service = new HealthService(dataSourceMock, redisClientMock);
  });

  it('should return status "ok" when both PostgreSQL and Redis are responsive', async () => {
    vi.mocked(dataSourceMock.query).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redisClientMock.ping).mockResolvedValue('PONG');

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.services.database.status).toBe('up');
    expect(result.services.redis.status).toBe('up');
    expect(result.memory).toHaveProperty('rssMb');
    expect(result.memory).toHaveProperty('heapUsedMb');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should return status "degraded" and capture error if Database is down', async () => {
    vi.mocked(dataSourceMock.query).mockRejectedValue(new Error('Connection lost'));
    vi.mocked(redisClientMock.ping).mockResolvedValue('PONG');

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('down');
    expect(result.services.database.error).toBe('Connection lost');
    expect(result.services.redis.status).toBe('up');
  });

  it('should return status "degraded" if Redis fails or returns unexpected ping value', async () => {
    vi.mocked(dataSourceMock.query).mockResolvedValue([{ '?column?': 1 }]);
    vi.mocked(redisClientMock.ping).mockRejectedValue(new Error('Redis timeout'));

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('up');
    expect(result.services.redis.status).toBe('down');
    expect(result.services.redis.error).toBe('Redis timeout');
  });
});

