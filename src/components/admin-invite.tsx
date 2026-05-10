// src/components/admin-invite.tsx
import { useState } from "react"
import { Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

export function AdminInvite() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setMessage("")
    try {
      await apiFetch("/api/admin/invite", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setMessage(`Invitation sent to ${email}`)
      setIsError(false)
      setEmail("")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send")
      setIsError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
      <div className="text-[13px] font-medium flex items-center gap-1.5">
        <Send size={14} className="text-muted-foreground" />
        Invite User
      </div>
      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? "Sending..." : "Invite"}
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
