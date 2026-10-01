const nodemailer = require("nodemailer");

function gmailUser() {
  return String(process.env.GMAIL_USER || "").trim();
}

function gmailPass() {
  return String(process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || "").replace(/\s/g, "");
}

function hasMailer() {
  return Boolean(gmailUser() && gmailPass());
}

function siteOrigin() {
  return String(process.env.SITE_URL || "https://ckcapital.vercel.app").replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function transporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser(),
      pass: gmailPass()
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

function welcomeHtml(safeName, portal, signin) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to CK Capital</title>
  </head>
  <body style="margin:0;padding:0;background:#111512;font-family:Arial,Helvetica,sans-serif;color:#f3f3f3;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your CK Capital account is ready.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111512;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#222;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px 12px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#ffff95;font-weight:700;">CK Capital</p>
                <h1 style="margin:14px 0 0;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;">Welcome, ${safeName}.</h1>
                <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#d7d7d7;">Your account is saved. Sign in to open challenges, your profile, and the affiliate desk.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;font-size:15px;line-height:1.7;color:#d7d7d7;">
                <p style="margin:0;">01 — Choose a challenge and account size</p>
                <p style="margin:8px 0 0;">02 — Trade on TradeLocker or MT5</p>
                <p style="margin:8px 0 0;">03 — Track orders from your portal</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;">
                <a href="${portal}" style="display:block;background:#eec340;color:#222;text-decoration:none;font-size:16px;font-weight:700;padding:14px 16px;border-radius:29px;text-align:center;">Open portal</a>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#d7d7d7;">Already closed the tab? <a href="${signin}" style="color:#ffff95;font-weight:700;">Sign in</a> with the email you registered.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9a9a9a;text-align:center;">This message was sent because a CK Capital account was created with this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendWelcomeEmail(input) {
  if (!hasMailer()) {
    console.warn("Gmail is not configured; skipped welcome email.");
    return { sent: false, skipped: true };
  }
  const firstName = String(input.name || "").trim().split(/\s+/)[0] || "trader";
  const origin = siteOrigin();
  const portal = origin + "/portal";
  const signin = origin + "/signin";
  const safeName = escapeHtml(firstName);
  await transporter().sendMail({
    from: `"CK Capital" <${gmailUser()}>`,
    replyTo: gmailUser(),
    to: input.email,
    subject: "Welcome to CK Capital — your account is ready",
    text: [
      `Hi ${firstName},`,
      "",
      "Your CK Capital account is saved. Sign in to open challenges, your profile, and the affiliate desk.",
      "",
      `Open your portal: ${portal}`,
      `Sign in later: ${signin}`,
      "",
      "This message was sent because a CK Capital account was created with this email."
    ].join("\n"),
    html: welcomeHtml(safeName, portal, signin)
  });
  return { sent: true, skipped: false };
}

module.exports = { sendWelcomeEmail, hasMailer };
