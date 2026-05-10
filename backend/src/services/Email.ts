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
