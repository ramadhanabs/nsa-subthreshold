// src/pages/register.tsx
import { useState, useMemo } from "react"
import { useSearchParams } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function decodeTokenEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    if (payload.type !== "invite") return null
    return payload.email
  } catch {
    return null
  }
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const email = useMemo(() => token ? decodeTokenEmail(token) : null, [token])

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!token || !email) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Invalid Invitation</h1>
          <p className="text-sm text-muted-foreground">
            This registration link is invalid or expired. Please request a new invitation.
          </p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(
        import.meta.env.DEV ? "http://localhost:3002/api/auth/register" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Registration failed")
      // Auto-login
      localStorage.setItem("nsa-token", data.token)
      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Create Your Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your registration to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={email} disabled className="mt-1 bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  )
}
