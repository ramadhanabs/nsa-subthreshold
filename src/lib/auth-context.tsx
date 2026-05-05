import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiFetch } from "./api"

interface User {
  id: string
  email: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nsa-token"))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }
    apiFetch<User>("/api/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("nsa-token")
        setToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ id: string; email: string; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem("nsa-token", data.token)
    setToken(data.token)
    setUser({ id: data.id, email: data.email })
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ id: string; email: string; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem("nsa-token", data.token)
    setToken(data.token)
    setUser({ id: data.id, email: data.email })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("nsa-token")
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
