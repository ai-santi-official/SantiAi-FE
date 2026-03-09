const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...defaultHeaders, ...init?.headers },
  });
}
