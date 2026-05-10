# Change Password & Forgot Password — Design

**Date:** 2026-05-10
**Status:** Approved

---

## Overview

Two features: authenticated password change (current + new password) and public forgot/reset password flow via email.

## Change Password

- **Route:** `POST /api/auth/change-password` (authenticated)
- **Input:** `{ currentPassword, newPassword }`
- **Validation:** Current password must match, new password min 8 chars
- **No email sent** — user is already logged in
- **UI:** Form on dashboard (profile section or quick actions)

## Forgot Password

### Flow

```
Login page → "Forgot password?" → /forgot-password
  → Enter email → POST /api/auth/forgot-password
  → Backend sends reset email (always returns success)
  → User clicks link → /reset-password?token=xxx
  → Enter new password → POST /api/auth/reset-password
  → Password updated → redirect to login
```

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/change-password` | Required | `{ currentPassword, newPassword }` |
| POST | `/api/auth/forgot-password` | Public | `{ email }` → sends reset email |
| POST | `/api/auth/reset-password` | Public | `{ token, password }` → resets password |

### JWT Reset Token

- Payload: `{ email, type: "reset" }`
- Expiry: 1 hour
- Signed with `JWT_SECRET`

### Reset Email

Same template shell as invitation/welcome. "Reset Your Password" emerald button linking to `/reset-password?token=xxx`. Plaintext fallback URL. "This link expires in 1 hour" note.

### Security

- `forgot-password` always returns `{ ok: true }` — don't reveal if email exists
- Reset token expires in 1 hour
- No rate limiting for v1 (invite-only, small user base)

## Frontend Pages

- **`/forgot-password`** — email input + "Send Reset Link" button + success message
- **`/reset-password?token=xxx`** — decode JWT for email, new password + confirm, submit
- **Login page** — add "Forgot password?" link
- **Dashboard** — "Change password" form (current password + new password + confirm)

## Auth Service Updates

Add to AuthService:
- `changePassword(userId, currentPassword, newPassword)` — verify current, hash new, update DB
- `createResetToken(email)` — JWT with type "reset", 1hr expiry
- `verifyResetToken(token)` — verify JWT, return email
- `resetPassword(token, newPassword)` — verify token, hash password, update DB

## Error Types

Add to Errors.ts:
- `PasswordMismatch` — current password doesn't match (change password)
- `ResetTokenExpired` — reset token invalid or expired
