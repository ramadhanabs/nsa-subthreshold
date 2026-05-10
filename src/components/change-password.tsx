import { useState } from "react"
import { KeyRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters")
      setIsError(true)
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords don't match")
      setIsError(true)
      return
    }
    setSubmitting(true)
    setMessage("")
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setMessage("Password updated successfully")
      setIsError(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to change password")
      setIsError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
      <div className="text-[13px] font-medium flex items-center gap-1.5">
        <KeyRound size={14} className="text-muted-foreground" />
        Change Password
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="New password (min 8 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
      {message && (
        <p className={`text-xs ${isError ? "text-destructive" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  )
}
