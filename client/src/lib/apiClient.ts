const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const LS_TOKEN = "auth_token";

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

export function setToken(token: string) {
  localStorage.setItem(LS_TOKEN, token);
}

export function clearToken() {
  localStorage.removeItem(LS_TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const json = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(json?.error ?? `Error ${res.status}`);
  }

  return json as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "DELETE",
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers: { ...authHeaders() },
  });
  const contentType = res.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
  return json as T;
}
