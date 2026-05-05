import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  email: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("nsa-user")
    if (stored) setUser(JSON.parse(stored))
    setIsLoading(false)
  }, [])

  async function login(email: string, password: string) {
    if (!email || !password) throw new Error("Email and password are required")
    if (password.length < 6) throw new Error("Password must be at least 6 characters")
    const u = { email }
    localStorage.setItem("nsa-user", JSON.stringify(u))
    setUser(u)
  }

  async function register(email: string, password: string) {
    if (!email || !password) throw new Error("Email and password are required")
    if (password.length < 6) throw new Error("Password must be at least 6 characters")
    const u = { email }
    localStorage.setItem("nsa-user", JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    localStorage.removeItem("nsa-user")
    setUser(null)
  }

  return (
    <AuthContext value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
