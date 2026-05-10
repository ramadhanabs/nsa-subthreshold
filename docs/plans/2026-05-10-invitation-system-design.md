# Invitation System — Design

**Date:** 2026-05-10
**Status:** Approved

---

## Overview

Invite-only registration system. Admin invites users by email, they receive a link to register. Registration requires a valid invitation JWT token. Welcome email sent after successful registration.

## Flow

```
Admin invites email → JWT token generated → Invitation email sent
  → User clicks link → /register?token=xxx → Email pre-filled & locked
  → User sets password → Account created → Welcome email sent
```

## Backend

### New Services

**EmailService** — sends emails via Sumopod SMTP (nodemailer)
- `sendInvitation(email, token)` — sends invitation email with registration link
- `sendWelcome(email)` — sends welcome email after registration

**InvitationService** — manages invitation flow
- `invite(email)` — generates JWT invitation token, calls EmailService
- `validateToken(token)` — verifies JWT, returns email

### Updated Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/admin/invite` | Admin only | `{ email }` → generates token, sends invitation email |
| POST | `/api/auth/register` | Public | `{ token, password }` → validates token, creates account, sends welcome |

### Admin Check

`is_admin` boolean column on users table. Middleware checks `user.is_admin === true`.

### JWT Invitation Token

- Payload: `{ email, type: "invite" }`
- Expiry: 7 days
- Signed with `JWT_SECRET` (same as auth tokens)
- Validated on register: must be valid, not expired, type must be "invite"

### Migration

```sql
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
UPDATE users SET is_admin = 1 WHERE email = '<admin_email>';
```

### SMTP Config (.env)

```
SMTP_HOST=smtp.sumopod.com
SMTP_PORT=465
SMTP_USER=<your_smtp_user>
SMTP_PASS=<your_smtp_pass>
SMTP_FROM=noreply@bagus.icu
```

## Frontend

### Register Page (`/register?token=xxx`)

- Re-enable register page (currently removed)
- Only accessible with `?token=xxx` query param
- Decode JWT client-side to extract email
- Email field pre-filled and disabled
- Password field + confirm password + submit
- If no token or invalid token → show error, no form

### Admin Invite UI (Dashboard)

- Only visible when logged-in user is admin
- Section on dashboard with email input + "Send Invite" button
- Shows success/error feedback
- Optionally: list of pending invitations

## Email Templates

Both emails use the same HTML shell: logo header, white card body, gray footer.

### Invitation Email

- **Subject:** "You've been invited to NSA Sub-threshold Calculator"
- **Body:** Invitation message + emerald "Create Your Account" button linking to `/register?token=xxx`
- **Footer:** Plaintext fallback URL, 7-day expiry note

### Welcome Email

- **Subject:** "Welcome to NSA Sub-threshold Calculator"
- **Body:** Welcome message + getting started steps (set pace, connect Intervals.icu, create block) + "Go to Dashboard" button
- **Footer:** App URL

### Template Style

- Background: `#f8f9fa`
- Card: `#ffffff`, rounded, subtle shadow
- Button: `#10b981` (emerald), white text, rounded
- Text: `#111827` (gray-900)
- Secondary text: `#6b7280` (gray-500)
- Dividers: `#e5e7eb`
- Inline CSS for email client compatibility
- Mobile-friendly (max-width: 560px, responsive padding)
