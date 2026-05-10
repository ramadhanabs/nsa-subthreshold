# Password Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add change password (authenticated) and forgot/reset password (email-based) flows.

**Architecture:** New methods on AuthService + EmailService. Three new API routes. Three new frontend pages/components. JWT reset tokens with 1hr expiry.

**Tech Stack:** Bun + Effect-TS (backend), jose (JWT), nodemailer (email), React (frontend)

**Design doc:** `docs/plans/2026-05-10-password-management-design.md`

---

### Task 1: Add Error Types + Auth Methods

**Files:**
- Modify: `backend/src/services/Errors.ts`
- Modify: `backend/src/services/Auth.ts`

**Step 1: Add error types**

Add to `backend/src/services/Errors.ts`:
```typescript
export class PasswordMismatch extends Data.TaggedError("PasswordMismatch")<{}> {}

export class ResetTokenExpired extends Data.TaggedError("ResetTokenExpired")<{}> {}
```

**Step 2: Add reset token helpers to Auth.ts**

Read current `backend/src/services/Auth.ts`. Add after `verifyInvitationToken`:

```typescript
const createResetToken = (email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ email, type: "reset" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create reset token: ${e}`),
  })

const verifyResetToken = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await jwtVerify(token, JWT_SECRET)
      const payload = result.payload as { email: string; type: string }
      if (payload.type !== "reset") throw new Error("Not a reset token")
      return payload.email
    },
    catch: () => new ResetTokenExpired(),
  })
```

Import `PasswordMismatch` and `ResetTokenExpired` from Errors.ts.

**Step 3: Add methods to AuthService**

Add to the service return object:

```typescript
changePassword: (userId: string, currentPassword: string, newPassword: string) =>
  Effect.gen(function* () {
    const user = yield* db.get<User>(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    )
    if (!user) return yield* new NotFoundError({ entity: "user", id: userId })
    const valid = yield* Effect.tryPromise({
      try: () => Bun.password.verify(currentPassword, user.password_hash),
      catch: (e) => new Error(`Failed to verify password: ${e}`),
    })
    if (!valid) return yield* new PasswordMismatch()
    const hash = yield* Effect.tryPromise({
      try: () => Bun.password.hash(newPassword),
      catch: (e) => new Error(`Failed to hash password: ${e}`),
    })
    yield* db.run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [hash, userId]
    )
    return { ok: true }
  }),

createResetToken: (email: string) =>
  Effect.gen(function* () {
    const user = yield* db.get<User>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )
    if (!user) return null // Don't reveal if email exists
    const token = yield* createResetToken(email)
    return token
  }),

resetPassword: (token: string, newPassword: string) =>
  Effect.gen(function* () {
    const email = yield* verifyResetToken(token)
    const hash = yield* Effect.tryPromise({
      try: () => Bun.password.hash(newPassword),
      catch: (e) => new Error(`Failed to hash password: ${e}`),
    })
    yield* db.run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
      [hash, email]
    )
    return { ok: true }
  }),
```

Import `NotFoundError` from Errors.ts if not already imported.

**Step 4: Type check**

```bash
cd backend && bun tsc --noEmit 2>&1 | grep -v test
```

---

### Task 2: Add Reset Password Email Template

**Files:**
- Modify: `backend/src/services/Email.ts`

**Step 1: Add resetPasswordHtml function**

Read current `backend/src/services/Email.ts`. Add after `welcomeHtml`:

```typescript
function resetPasswordHtml(resetUrl: string): string {
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Reset Your Password</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${resetUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Reset Password &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">This link expires in 1 hour.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">
      If the button doesn't work, copy this link:<br>${resetUrl}
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `)
}
```

**Step 2: Add sendResetPassword method to EmailService**

Add to the service return object:

```typescript
sendResetPassword: (email: string, token: string) =>
  Effect.tryPromise({
    try: () =>
      transporter.sendMail({
        from: `"NSA Sub-threshold" <${FROM}>`,
        to: email,
        subject: "Reset your password — NSA Sub-threshold Calculator",
        html: resetPasswordHtml(`${BASE_URL}/reset-password?token=${token}`),
      }),
    catch: (e) => new Error(`Failed to send reset email: ${e}`),
  }),
```

**Step 3: Type check**

```bash
cd backend && bun tsc --noEmit 2>&1 | grep -v test
```

---

### Task 3: Add Server Routes

**Files:**
- Modify: `backend/src/server.ts`

**Step 1: Add change-password route**

Add to `authRoutes`:

```typescript
HttpRouter.post("/api/auth/change-password", Effect.gen(function* () {
  const user = yield* extractUser
  const body = yield* readJson
  if (!body.currentPassword || !body.newPassword) return yield* badRequest("currentPassword and newPassword are required")
  if (body.newPassword.length < 8) return yield* badRequest("Password must be at least 8 characters")
  const auth = yield* AuthService
  const result = yield* auth.changePassword(user.id, body.currentPassword, body.newPassword)
  return yield* json(result)
})),
```

**Step 2: Add forgot-password route**

Add to `authRoutes`:

```typescript
HttpRouter.post("/api/auth/forgot-password", Effect.gen(function* () {
  const body = yield* readJson
  if (!body.email) return yield* badRequest("email is required")
  const auth = yield* AuthService
  const token = yield* auth.createResetToken(body.email)
  if (token) {
    const emailSvc = yield* EmailService
    yield* emailSvc.sendResetPassword(body.email, token).pipe(Effect.catchAll(() => Effect.void))
  }
  // Always return success to not reveal if email exists
  return yield* json({ ok: true })
})),
```

**Step 3: Add reset-password route**

Add to `authRoutes`:

```typescript
HttpRouter.post("/api/auth/reset-password", Effect.gen(function* () {
  const body = yield* readJson
  if (!body.token || !body.password) return yield* badRequest("token and password are required")
  if (body.password.length < 8) return yield* badRequest("Password must be at least 8 characters")
  const auth = yield* AuthService
  const result = yield* auth.resetPassword(body.token, body.password)
  return yield* json(result)
})),
```

**Step 4: Add error tags to error handler**

Add to the switch statement in the CORS middleware:

```typescript
case "PasswordMismatch": return jsonError("Current password is incorrect", 400)
case "ResetTokenExpired": return jsonError("Reset link expired or invalid", 400)
```

**Step 5: Type check**

```bash
cd backend && bun tsc --noEmit 2>&1 | grep -v test
```

---

### Task 4: Frontend — Forgot Password Page

**Files:**
- Create: `src/pages/forgot-password.tsx`
- Modify: `src/main.tsx`
- Modify: `src/pages/login.tsx`

**Step 1: Create forgot-password page**

```typescript
// src/pages/forgot-password.tsx
import { useState } from "react"
import { Link } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const base = import.meta.env.DEV ? "http://localhost:3002" : ""
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Request failed")
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for {email}, we've sent a password reset link. Check your inbox (and spam folder).
          </p>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Forgot password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="hover:text-foreground underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Add route in main.tsx**

```typescript
import ForgotPasswordPage from "./pages/forgot-password"
// In Routes:
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
```

**Step 3: Add "Forgot password?" link to login page**

Read `src/pages/login.tsx`. Add after the submit button:

```typescript
<p className="mt-4 text-center text-sm text-muted-foreground">
  <Link to="/forgot-password" className="hover:text-foreground underline">
    Forgot password?
  </Link>
</p>
```

Import `Link` from `react-router` if not already imported.

---

### Task 5: Frontend — Reset Password Page

**Files:**
- Create: `src/pages/reset-password.tsx`
- Modify: `src/main.tsx`

**Step 1: Create reset-password page**

```typescript
// src/pages/reset-password.tsx
import { useState, useMemo } from "react"
import { Link, useSearchParams } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function decodeTokenEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    if (payload.type !== "reset") return null
    return payload.email
  } catch {
    return null
  }
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const email = useMemo(() => token ? decodeTokenEmail(token) : null, [token])

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token || !email) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or expired.
          </p>
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground underline">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Password Reset</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been updated successfully.
          </p>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (password !== confirmPassword) { setError("Passwords don't match"); return }
    setSubmitting(true)
    setError("")
    try {
      const base = import.meta.env.DEV ? "http://localhost:3002" : ""
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Reset failed")
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a new password for {email}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">New Password</label>
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
            {submitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Add route in main.tsx**

```typescript
import ResetPasswordPage from "./pages/reset-password"
// In Routes:
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

---

### Task 6: Frontend — Change Password on Dashboard

**Files:**
- Create: `src/components/change-password.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Create ChangePassword component**

```typescript
// src/components/change-password.tsx
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
```

**Step 2: Add to dashboard**

In `src/pages/dashboard.tsx`, import and render after the admin invite section:

```typescript
import { ChangePassword } from "@/components/change-password"
```

Add in the left column, after `{isAdmin && <AdminInvite />}`:

```typescript
<ChangePassword />
```

---

### Task 7: Deploy & Test

**Step 1: Type check**

```bash
cd backend && bun tsc --noEmit 2>&1 | grep -v test
pnpm tsc --noEmit
```

**Step 2: Deploy**

```bash
pnpm build && rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
rsync -avz --exclude node_modules --exclude nsa.db --exclude nsa.db-shm --exclude nsa.db-wal --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add change password and forgot/reset password flows"
git push origin main
```

---

## Task Dependencies

```
Task 1 (Auth methods) ──────┐
Task 2 (Email template) ────┤── independent
Task 4 (Forgot page) ───────┤
Task 5 (Reset page) ────────┤
Task 6 (Change password) ───┘
                             │
Task 3 (Server routes) ──── depends on 1, 2
Task 7 (Deploy) ─────────── depends on all
```

Tasks 1, 2, 4, 5, 6 can run in parallel.
