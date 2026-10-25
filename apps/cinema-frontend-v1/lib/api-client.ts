import type {
  ApiResponse,
  ApiErrorResponse,
  ApiValidationError,
} from "@/types/api.type";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Lấy Access Token từ localStorage nếu có (phía client)
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("accessToken");
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...((headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: finalHeaders,
    });

    let json: unknown = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      json = await response.json();
    }

    if (!response.ok) {
      const errPayload = json as ApiErrorResponse | null;
      const message =
        errPayload?.message ||
        (Array.isArray(errPayload?.errors) && errPayload?.errors[0]?.message) ||
        `Lỗi HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(
        message,
        response.status,
        errPayload?.errorCode,
        errPayload?.errors,
      );
    }

    // Backend bọc trong TransformInterceptor: { success: true, code: 200, data: T, ... }
    const apiResponse = json as ApiResponse<T>;
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      "data" in apiResponse
    ) {
      if (
        apiResponse.pagination !== undefined &&
        Array.isArray(apiResponse.data)
      ) {
        Object.defineProperty(apiResponse.data, "pagination", {
          value: apiResponse.pagination,
          enumerable: false,
          writable: true,
        });
      }
      return apiResponse.data;
    }

    return json as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Lỗi mạng hoặc lỗi kết nối
    throw new ApiError(
      error instanceof Error
        ? error.message
        : "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc backend.",
      0,
      "NETWORK_ERROR",
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
