export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export type Query = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  /** JWT của người dùng, chuyển tiếp nguyên vẹn sang backend */
  token?: string;
  params?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

export interface BackendClient {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
}

interface ClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function errorFields(json: unknown, status: number): { code: string; message: string } {
  const o = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const nested = (o.message && typeof o.message === "object" ? o.message : {}) as Record<string, unknown>;
  const code = String(o.code ?? o.errorCode ?? nested.errorCode ?? nested.code ?? `HTTP_${status}`);
  const raw = typeof o.message === "string" || Array.isArray(o.message) ? o.message : nested.message;
  const message = Array.isArray(raw) ? raw.join("; ") : typeof raw === "string" && raw ? raw : `Backend trả về lỗi HTTP ${status}`;
  return { code, message };
}

/** Bóc lớp { success, data, meta } của backend; trả nguyên nội dung nếu không có lớp bọc */
export function unwrapEnvelope<T>(json: unknown): T {
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export function createBackendClient(config: ClientConfig): BackendClient {
  const base = config.baseUrl.replace(/\/+$/, "");
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 10_000;

  async function request<T>(method: "GET" | "POST", path: string, o: RequestOptions = {}): Promise<T> {
    const url = new URL(base + (path.startsWith("/") ? path : `/${path}`));
    for (const [k, v] of Object.entries(o.params ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (o.body !== undefined) headers["Content-Type"] = "application/json";
    if (o.token) headers.Authorization = `Bearer ${o.token}`;

    const signals = [AbortSignal.timeout(timeoutMs)];
    if (o.signal) signals.push(o.signal);

    let res: Response;
    try {
      res = await doFetch(url, {
        method,
        headers,
        body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
        signal: AbortSignal.any(signals),
      });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "TimeoutError") throw new BackendError(504, "BACKEND_TIMEOUT", "Backend phản hồi quá chậm");
      if (name === "AbortError") throw e;
      throw new BackendError(503, "BACKEND_UNREACHABLE", "Không kết nối được tới backend");
    }

    const text = await res.text();
    let json: unknown = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!res.ok) {
      const { code, message } = errorFields(json, res.status);
      throw new BackendError(res.status, code, message);
    }
    return unwrapEnvelope<T>(json);
  }

  return {
    get: (path, options) => request("GET", path, options),
    post: (path, options) => request("POST", path, options),
  };
}
