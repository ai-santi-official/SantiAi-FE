const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const SESSION_TOKEN_KEY = 'santi_session_token';

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
  if (token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

export function getApiToken(): string | null {
  if (!_token) {
    _token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  }
  return _token;
}

export function clearApiToken() {
  _token = null;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

/** Exchange LIFF access token for a backend session JWT. */
export async function loginWithAccessToken(accessToken: string): Promise<{ token: string; user: Record<string, unknown>; groups: string[] }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ accessToken }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }
  const data = await res.json();
  setApiToken(data.token);
  return data;
}

/** Resolve a launch-context token into groupId + action. Returns null if expired/invalid. */
export async function resolveLaunchContext(ctx: string): Promise<{ groupId: string; action: string; sourceUserId: string | null } | null> {
  const res = await fetch(`${BASE_URL}/api/v1/launch-context/${encodeURIComponent(ctx)}`, {
    headers: defaultHeaders,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...defaultHeaders, ...init?.headers as Record<string, string> };

  const token = getApiToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
}
