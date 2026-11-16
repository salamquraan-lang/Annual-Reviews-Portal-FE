import type { FieldError, SessionResponse } from '../types/auth';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;
let refreshInFlight: Promise<SessionResponse | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setOnSessionLost(handler: (() => void) | null): void {
  onSessionLost = handler;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error ?? {};
    return new ApiError(
      res.status,
      e.code ?? 'UNKNOWN_ERROR',
      e.message ?? 'Something went wrong.',
      Array.isArray(e.details) ? e.details : [],
    );
  } catch {
    return new ApiError(res.status, 'UNKNOWN_ERROR', 'Something went wrong.');
  }
}

async function rawFetch(method: string, path: string, body?: unknown, withToken = false): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withToken && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
}

export function refreshSession(): Promise<SessionResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawFetch('POST', '/auth/refresh');
        if (!res.ok) return null;
        const session = (await res.json()) as SessionResponse;
        accessToken = session.accessToken;
        return session;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  auth?: boolean;
}

export async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(method, path, body, options.auth);

  if (res.status === 401 && options.auth) {
    const session = await refreshSession();
    if (!session) {
      accessToken = null;
      onSessionLost?.();
      throw await parseError(res);
    }
    res = await rawFetch(method, path, body, true);
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
