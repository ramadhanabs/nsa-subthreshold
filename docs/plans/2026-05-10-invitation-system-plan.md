# Invitation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Invite-only registration system where admin sends email invitations with JWT tokens, users register via token link, and welcome emails are sent on registration.

**Architecture:** New EmailService (nodemailer + Sumopod SMTP) and InvitationService. Admin role via `is_admin` column on users table. JWT invitation tokens with 7-day expiry. Register endpoint updated to require valid invitation token. Frontend register page re-enabled with token validation.

**Tech Stack:** Bun + Effect-TS (backend), nodemailer (SMTP), jose (JWT), React (frontend)

**Design doc:** `docs/plans/2026-05-10-invitation-system-design.md`

---

### Task 1: Install nodemailer + Add Migration

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/migrations/005_admin.ts`
- Modify: `backend/src/migrations/index.ts`

**Step 1: Install nodemailer**

```bash
cd backend && bun add nodemailer && bun add -d @types/nodemailer
```

**Step 2: Create migration for is_admin column**

```typescript
// backend/src/migrations/005_admin.ts
import type { Database } from "bun:sqlite"

export function up(db: Database) {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`)
}
```

**Step 3: Register migration in index.ts**

Add import and entry to migrations array in `backend/src/migrations/index.ts`:
```typescript
import { up as migration005 } from "./005_admin"
// In array:
{ name: "005_admin", up: migration005 },
```

**Step 4: Verify**

```bash
cd backend && bun run dev
```
Expected: `Migration applied: 005_admin` in console output.

**Step 5: Set your account as admin**

```bash
ssh dev@lab "sqlite3 ~/nsa-backend/nsa.db \"UPDATE users SET is_admin = 1 WHERE email = 'ramadhanabagus@gmail.com'\""
```

> Adjust email to your actual admin email.

---

### Task 2: Add SMTP Config to .env

**Files:**
- Modify: `backend/.env` (on VPS only)
- Modify: `backend/.env.example`

**Step 1: Update .env.example**

Add to `backend/.env.example`:
```
SMTP_HOST=smtp.sumopod.com
SMTP_PORT=465
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM=noreply@bagus.icu
```

**Step 2: Add to VPS .env**

```bash
ssh dev@lab "cat >> ~/nsa-backend/.env << 'EOF'
SMTP_HOST=smtp.sumopod.com
SMTP_PORT=465
SMTP_USER=<your_smtp_user>
SMTP_PASS=<your_smtp_pass>
SMTP_FROM=noreply@bagus.icu
EOF"
```

---

### Task 3: Create EmailService

**Files:**
- Create: `backend/src/services/Email.ts`

**Step 1: Create the service**

```typescript
// backend/src/services/Email.ts
import { Effect } from "effect"
import nodemailer from "nodemailer"

const BASE_URL = process.env.NODE_ENV === "production"
  ? "https://subthreshold.bagus.icu"
  : "http://localhost:5173"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sumopod.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
})

const FROM = process.env.SMTP_FROM || "noreply@bagus.icu"

function emailShell(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.5px;">NSA Sub-threshold</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                NSA Sub-threshold Calculator<br>
                <a href="${BASE_URL}" style="color:#6b7280;">${BASE_URL.replace("https://", "")}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function invitationHtml(registerUrl: string): string {
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You've been invited</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      You've been invited to join <strong>NSA Sub-threshold Calculator</strong> — a tool for planning Norwegian Singles approach training blocks.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${registerUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Create Your Account &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">This invitation expires in 7 days.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">
      If the button doesn't work, copy this link:<br>${registerUrl}
    </p>
  `)
}

function welcomeHtml(email: string): string {
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Welcome aboard!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      Hi ${email},<br><br>
      Your account has been created successfully. You're ready to start planning your NSA training blocks.
    </p>
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">Getting started:</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#4b5563;line-height:1.8;">
      <li>Set your 5K pace or threshold pace</li>
      <li>Connect your Intervals.icu account</li>
      <li>Create your first training block</li>
    </ol>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
            Go to Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>
  `)
}

export class EmailService extends Effect.Service<EmailService>()("EmailService", {
  sync: () => ({
    sendInvitation: (email: string, token: string) =>
      Effect.tryPromise({
        try: () =>
          transporter.sendMail({
            from: `"NSA Sub-threshold" <${FROM}>`,
            to: email,
            subject: "You've been invited to NSA Sub-threshold Calculator",
            html: invitationHtml(`${BASE_URL}/register?token=${token}`),
          }),
        catch: (e) => new Error(`Failed to send invitation email: ${e}`),
      }),

    sendWelcome: (email: string) =>
      Effect.tryPromise({
        try: () =>
          transporter.sendMail({
            from: `"NSA Sub-threshold" <${FROM}>`,
            to: email,
            subject: "Welcome to NSA Sub-threshold Calculator",
            html: welcomeHtml(email),
          }),
        catch: (e) => new Error(`Failed to send welcome email: ${e}`),
      }),
  }),
}) {}
```

**Step 2: Type check**

```bash
cd backend && bun tsc --noEmit 2>&1 | grep "Email.ts"
```
Expected: no errors

---

### Task 4: Add Invitation Errors + Update Auth

**Files:**
- Modify: `backend/src/services/Errors.ts`
- Modify: `backend/src/services/Auth.ts`

**Step 1: Add invitation errors to Errors.ts**

Add to `backend/src/services/Errors.ts`:
```typescript
// Invitation errors
export class InvitationRequired extends Data.TaggedError("InvitationRequired")<{}> {}

export class InvitationExpired extends Data.TaggedError("InvitationExpired")<{}> {}

export class NotAdmin extends Data.TaggedError("NotAdmin")<{}> {}
```

**Step 2: Update User interface in Auth.ts**

Add `is_admin` to the User interface:
```typescript
export interface User {
  id: string
  email: string
  password_hash: string
  is_admin: number  // 0 or 1
  intervals_icu_athlete_id: string | null
  intervals_icu_api_key: string | null
  created_at: string
  updated_at: string
}
```

**Step 3: Add invitation token creation to Auth.ts**

Add after the existing `createToken` function:
```typescript
const createInvitationToken = (email: string) =>
  Effect.tryPromise({
    try: () =>
      new SignJWT({ email, type: "invite" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET),
    catch: (e) => new Error(`Failed to create invitation token: ${e}`),
  })

const verifyInvitationToken = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await jwtVerify(token, JWT_SECRET)
      const payload = result.payload as { email: string; type: string }
      if (payload.type !== "invite") throw new Error("Not an invitation token")
      return payload.email
    },
    catch: () => new InvitationExpired(),
  })
```

Import `InvitationExpired` and `InvitationRequired` from Errors.ts.

**Step 4: Update register method to require invitation token**

Change the `register` method signature and logic:
```typescript
register: (token: string, password: string) =>
  Effect.gen(function* () {
    const email = yield* verifyInvitationToken(token)
    const existing = yield* db.get<User>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )
    if (existing) return yield* new EmailAlreadyRegistered({ email })
    const id = crypto.randomUUID()
    const password_hash = yield* Effect.tryPromise({
      try: () => Bun.password.hash(password),
      catch: (e) => new Error(`Failed to hash password: ${e}`),
    })
    yield* db.run(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [id, email, password_hash]
    )
    const authToken = yield* createToken(id, email)
    return { id, email, token: authToken }
  }),
```

**Step 5: Add invite and isAdmin methods to AuthService**

Add to the service return object:
```typescript
invite: (email: string) => createInvitationToken(email),

isAdmin: (userId: string) =>
  Effect.gen(function* () {
    const user = yield* db.get<User>(
      "SELECT is_admin FROM users WHERE id = ?",
      [userId]
    )
    return user?.is_admin === 1
  }),
```

---

### Task 5: Update Server Routes

**Files:**
- Modify: `backend/src/server.ts`

**Step 1: Add admin middleware**

Add after `extractUser`:
```typescript
const extractAdmin = Effect.gen(function* () {
  const user = yield* extractUser
  const auth = yield* AuthService
  const admin = yield* auth.isAdmin(user.id)
  if (!admin) return yield* new HttpError({ status: 403, message: "Admin access required" })
  return user
})
```

**Step 2: Update register route**

Change the register route to accept `{ token, password }` instead of `{ email, password }`:
```typescript
HttpRouter.post("/api/auth/register", Effect.gen(function* () {
  const body = yield* readJson
  if (!body.token || !body.password) return yield* badRequest("token and password are required")
  const auth = yield* AuthService
  const result = yield* auth.register(body.token, body.password)
  // Send welcome email (fire and forget)
  const email = yield* EmailService
  yield* email.sendWelcome(result.email).pipe(Effect.catchAll(() => Effect.void))
  return yield* json(result)
})),
```

**Step 3: Add admin invite route**

Add to the router (new route group):
```typescript
// Admin routes
HttpRouter.post("/api/admin/invite", Effect.gen(function* () {
  const admin = yield* extractAdmin
  const body = yield* readJson
  if (!body.email) return yield* badRequest("email is required")
  const auth = yield* AuthService
  const token = yield* auth.invite(body.email)
  const emailSvc = yield* EmailService
  yield* emailSvc.sendInvitation(body.email, token)
  yield* Effect.logInfo("invitation sent").pipe(
    Effect.annotateLogs("admin", admin.email),
    Effect.annotateLogs("invited", body.email),
  )
  return yield* json({ ok: true, email: body.email })
})),
```

**Step 4: Import EmailService in server.ts**

Add import:
```typescript
import { EmailService } from "./services/Email"
```

**Step 5: Add error tags to error handler**

Add to the switch statement in the CORS middleware:
```typescript
case "InvitationRequired": return jsonError("Valid invitation required", 400)
case "InvitationExpired": return jsonError("Invitation expired or invalid", 400)
case "NotAdmin": return jsonError("Admin access required", 403)
```

---

### Task 6: Update index.ts

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Add EmailService to layers**

```typescript
import { EmailService } from "./services/Email"
```

Add to `AppServicesLive`:
```typescript
EmailService.Default,
```

---

### Task 7: Frontend — Register Page

**Files:**
- Modify: `src/pages/register.tsx` (or create new)
- Modify: `src/main.tsx`

**Step 1: Re-enable register route in main.tsx**

```typescript
import RegisterPage from "./pages/register"
// In Routes:
<Route path="/register" element={<RegisterPage />} />
```

**Step 2: Rewrite register page**

The register page should:
1. Read `token` from URL query params
2. If no token → show error message
3. Decode JWT client-side to extract email (just base64 decode the payload, no verification needed — server verifies)
4. Show form with disabled email field + password field
5. On submit → POST `/api/auth/register` with `{ token, password }`
6. On success → redirect to dashboard

```typescript
// src/pages/register.tsx
import { useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { useAuth } from "@/lib/auth-context"
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
  const navigate = useNavigate()
  const { login } = useAuth()

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
```

---

### Task 8: Frontend — Admin Invite UI

**Files:**
- Create: `src/components/admin-invite.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Create AdminInvite component**

```typescript
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
```

**Step 2: Add to dashboard (admin only)**

In `src/pages/dashboard.tsx`, fetch admin status and conditionally render:

Add state:
```typescript
const [isAdmin, setIsAdmin] = useState(false)
```

In the useEffect that runs on mount (after user loads), add:
```typescript
apiFetch<{ is_admin: boolean }>("/api/auth/me")
  .then((data) => setIsAdmin(data.is_admin))
  .catch(() => {})
```

Wait — `/api/auth/me` currently returns `{ id, email }`. We need to include `is_admin`. Update the verify method in AuthService to return it, or add a separate check.

Simpler: just try calling `/api/admin/invite` — if it returns 403, user isn't admin. But that's hacky.

Better: update the `verify` method to include `is_admin`, or add the admin check client-side by trying `/api/auth/me` with the is_admin field.

**Update Auth.verify to return is_admin:**

In Auth.ts, update verify to also fetch user from DB:
```typescript
verify: (token: string) =>
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () => jwtVerify(token, JWT_SECRET),
      catch: (e) => new InvalidToken({ reason: String(e) }),
    })
    const payload = result.payload as { id: string; email: string }
    const user = yield* db.get<User>(
      "SELECT is_admin FROM users WHERE id = ?",
      [payload.id]
    )
    return { id: payload.id, email: payload.email, is_admin: user?.is_admin === 1 }
  }),
```

Then in dashboard.tsx:
```typescript
// The auth/me response now includes is_admin
// Use it from the user object or fetch separately
```

**Step 3: Render AdminInvite conditionally**

In dashboard.tsx, after the "Quick actions" section:
```typescript
{isAdmin && <AdminInvite />}
```

Import:
```typescript
import { AdminInvite } from "@/components/admin-invite"
```

---

### Task 9: Test End-to-End

**Step 1: Deploy backend**

```bash
cd /Users/mac/Documents/explore/nsa-subthreshold
rsync -avz --exclude node_modules --exclude nsa.db --exclude nsa.db-shm --exclude nsa.db-wal --exclude .env backend/ dev@lab:~/nsa-backend/
ssh dev@lab "cd ~/nsa-backend && bun install && sudo systemctl restart nsa-backend"
```

**Step 2: Deploy frontend**

```bash
pnpm build && rsync -avz --delete dist/ dev@lab:~/nsa-subthreshold/
```

**Step 3: Set admin flag**

```bash
ssh dev@lab "sqlite3 ~/nsa-backend/nsa.db \"UPDATE users SET is_admin = 1 WHERE email = 'ramadhanabagus@gmail.com'\""
```

**Step 4: Test invitation flow**

1. Login as admin on dashboard
2. Use the "Invite User" form to invite a test email
3. Check that email arrives with invitation link
4. Click link → register page with email pre-filled
5. Set password → account created
6. Check welcome email arrives

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add invite-only registration with email notifications"
```

---

## Task Dependencies

```
Task 1 (migration + install) ───┐
Task 2 (.env config) ──────────┤
Task 3 (EmailService) ─────────┤
Task 4 (Auth + Errors) ────────┼── all independent
Task 7 (Register page) ────────┤
Task 8 (Admin UI) ─────────────┘
                                │
Task 5 (Server routes) ────── depends on 3, 4
Task 6 (index.ts) ──────────── depends on 3
Task 9 (E2E test) ──────────── depends on all
```

Tasks 1-4, 7-8 can run in parallel.
