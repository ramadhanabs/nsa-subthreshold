const BASE = import.meta.env.DEV ? "http://localhost:3002" : ""

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("nsa-token")
  const headers: Record<string, string> = {}

  if (options?.body) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(data.error || "Request failed")
  }

  return res.json()
}
