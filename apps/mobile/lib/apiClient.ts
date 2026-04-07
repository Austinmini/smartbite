import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'
import { getApiBaseUrl } from './apiBaseUrl'

const BASE_URL = getApiBaseUrl()

async function getToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token
  // Fall back to the persisted token from authStore.
  // Supabase uses in-memory storage and may not have the session yet during
  // cold-start (setSession() in _layout.tsx is async and hasn't resolved).
  return useAuthStore.getState().token ?? undefined
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  // Always fetch the current session token — Supabase auto-refreshes it
  const { token: overrideToken, ...rest } = options
  const token = overrideToken ?? (await getToken())

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })
  } catch (error: any) {
    throw Object.assign(
      new Error(`Network request failed. API base URL: ${BASE_URL}`),
      { cause: error }
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
}
