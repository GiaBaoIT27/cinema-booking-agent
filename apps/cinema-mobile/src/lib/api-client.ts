import type {
  ApiErrorResponse,
  ApiResponse,
  ApiValidationError,
} from "@/types/api.type";
import { API_URL } from "./config";
import { tokenStorage } from "./token-storage";

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  public code: number;
  public errorCode?: string;
  public errors?: ApiValidationError[];

  constructor(
    message: string,
    code: number,
    errorCode?: string,
    errors?: ApiValidationError[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Params;
  body?: unknown;
  /** false: không gắn Authorization và không tự refresh (đăng nhập, refresh token). */
  auth?: boolean;
}

/**
 * Auth store đăng ký hàm này lúc khởi động. api-client không import store
 * để tránh vòng phụ thuộc: store gọi service, service gọi api-client.
 *
 * Backend KHÔNG có `/auth/refresh` nên không có luồng refresh: khi gặp 401
 * chỉ cần xoá phiên cục bộ và bắt người dùng đăng nhập lại.
 */
interface AuthHandlers {
  onAuthFailure: () => void;
}

let authHandlers: AuthHandlers | null = null;

export function configureAuthHandlers(handlers: AuthHandlers) {
  authHandlers = handlers;
}

function buildUrl(endpoint: string, params?: Params): string {
  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, String(value));
      }
    });
    const qs = search.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const external = init.signal;
  const onAbort = () => controller.abort();

  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onAbort);
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, auth = true, headers, signal, ...rest } = options;
  const token = auth ? await tokenStorage.getAccess() : null;

  const finalHeaders: Record<string, string> = {
    // Backend chỉ chấp nhận application/json, thiếu header này sẽ bị từ chối.
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((headers as Record<string, string> | undefined) ?? {}),
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(buildUrl(endpoint, params), {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // Request bị TanStack Query hủy chủ động: ném nguyên lỗi gốc.
    if (signal?.aborted) throw error;
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "Yêu cầu quá thời gian, vui lòng thử lại."
        : "Không thể kết nối đến máy chủ. Kiểm tra mạng và địa chỉ API.",
      0,
      "NETWORK_ERROR",
    );
  }

  let json: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    json = await response.json().catch(() => null);
  }

  if (!response.ok) {
    // Token hết hạn / không hợp lệ → xoá phiên cục bộ (backend không có refresh endpoint).
    if (response.status === 401 && auth) {
      authHandlers?.onAuthFailure();
    }
    const payload = json as ApiErrorResponse | null;
    const message =
      payload?.message ||
      (Array.isArray(payload?.errors) && payload.errors[0]?.message) ||
      `Lỗi HTTP ${response.status}`;
    throw new ApiError(
      message,
      response.status,
      payload?.errorCode,
      payload?.errors,
    );
  }

  // Backend bọc trong { success, code, data, pagination?, meta }: bóc lấy data,
  // đính pagination vào mảng (không enumerable) giống api-client của web.
  const envelope = json as ApiResponse<T> | null;
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    if (envelope.pagination !== undefined && Array.isArray(envelope.data)) {
      Object.defineProperty(envelope.data, "pagination", {
        value: envelope.pagination,
        enumerable: false,
        writable: true,
      });
    }
    return envelope.data;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
