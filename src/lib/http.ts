import type { ApiEnvelope } from "@/types/api";
import { tr } from "@/i18n/locale";

// Base URL comes from Vite env (VITE_API_URL), falls back to the local dev API.
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, signal } = options;
  const url = `${API_BASE}${path}${buildQuery(params)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    // Network-level failure (server down, CORS, offline…)
    throw new ApiError(0, tr("common.serverUnreachable"));
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!res.ok || (payload && payload.success === false)) {
    const message = payload?.message || tr("common.errorStatus", { n: res.status });
    throw new ApiError(res.status, message);
  }

  // Endpoints return { success, data } — but credit endpoints also carry summary,
  // so return the whole payload when data is absent.
  if (payload && "data" in payload) return payload.data as T;
  return payload as unknown as T;
}

// Some endpoints (credits) need the full envelope, not just .data
async function requestFull<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, signal } = options;
  const url = `${API_BASE}${path}${buildQuery(params)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, tr("common.serverUnreachable"));
  }

  let payload: (ApiEnvelope<unknown> & Record<string, unknown>) | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || (payload && payload.success === false)) {
    const message = (payload?.message as string) || tr("common.errorStatus", { n: res.status });
    throw new ApiError(res.status, message);
  }
  return payload as unknown as T;
}

export const http = {
  get: <T>(path: string, params?: Record<string, QueryValue>, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getFull: <T>(path: string, params?: Record<string, QueryValue>) =>
    requestFull<T>(path, { method: "GET", params }),
  postFull: <T>(path: string, body?: unknown) =>
    requestFull<T>(path, { method: "POST", body }),
  delFull: <T>(path: string) => requestFull<T>(path, { method: "DELETE" }),
};
