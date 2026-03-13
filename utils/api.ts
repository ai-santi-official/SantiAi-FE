const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

let _idToken: string | null = null;

export function setApiToken(token: string | null) {
  _idToken = token;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...defaultHeaders, ...init?.headers as Record<string, string> };

  if (_idToken) {
    headers['Authorization'] = `Bearer ${_idToken}`;
  }

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
}
