export type ApiRequestOptions = RequestInit & {
  path: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function apiRequest<T>({ path, ...options }: ApiRequestOptions): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is not configured. Add it when the backend is ready.",
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}
