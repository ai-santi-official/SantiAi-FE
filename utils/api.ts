import liff from '@line/liff';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

let _idToken: string | null = null;

export function setApiToken(token: string | null) {
  _idToken = token;
}

/** Get a fresh ID token, refreshing from LIFF if the current one is stale. */
function getFreshToken(): string | null {
  const fresh = liff.getIDToken();
  if (fresh) {
    _idToken = fresh;
  }
  return _idToken;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...defaultHeaders, ...init?.headers as Record<string, string> };

  const token = getFreshToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
}
