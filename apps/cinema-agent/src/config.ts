export interface AgentConfig {
  port: number;
  backendApiUrl: string;
  googleApiKey: string;
  model: string;
  corsOrigins: string[];
  jwtSecret?: string;
  databaseUrl?: string;
  rateLimitPerMinute: number;
  backendTimeoutMs: number;
  maxMessageChars: number;
}

export type EnvLike = Record<string, string | undefined>;

export class ConfigError extends Error {}

const toInt = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

/** Đọc và kiểm tra biến môi trường; thiếu biến bắt buộc thì báo lỗi rõ ràng ngay lúc khởi động */
export function loadConfig(env: EnvLike): AgentConfig {
  const missing: string[] = [];
  const googleApiKey = env.GOOGLE_API_KEY?.trim() ?? "";
  const backendApiUrl = (env.BACKEND_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!googleApiKey) missing.push("GOOGLE_API_KEY");
  if (!backendApiUrl) missing.push("BACKEND_API_URL");
  if (missing.length > 0) {
    throw new ConfigError(
      `Thiếu biến môi trường bắt buộc: ${missing.join(", ")}. Xem .env.example`,
    );
  }

  return {
    port: toInt(env.PORT, 3002),
    backendApiUrl,
    googleApiKey,
    model: env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:3001")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    jwtSecret: env.JWT_SECRET?.trim() || undefined,
    databaseUrl: env.AGENT_DATABASE_URL?.trim() || undefined,
    rateLimitPerMinute: toInt(env.RATE_LIMIT_PER_MINUTE, 20),
    backendTimeoutMs: toInt(env.BACKEND_TIMEOUT_MS, 10_000),
    maxMessageChars: 2000,
  };
}
