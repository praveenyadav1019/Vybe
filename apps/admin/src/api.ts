const BASE = 'http://localhost:4010';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token') ?? 'dev-access-token';
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body?: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(path: string) => req<T>(path, { method: 'DELETE' }),
};
