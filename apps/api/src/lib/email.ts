// Colors mapped from apps/web/src/styles/globals.css (light mode oklch → hex)
const C = {
  background: "#FFFFFF", // oklch(1 0 0)
  wrapper: "#F5F5F2", // oklch(0.966 0.005 106.5) — muted
  foreground: "#1A1A14", // oklch(0.153 0.006 107.1)
  primary: "#c7005b", // oklch(0.525 0.223 3.958)
  primaryFg: "#FEFCF8", // oklch(0.971 0.014 343.198)
  mutedFg: "#878778", // oklch(0.58 0.031 107.3)
  border: "#ECEAE8", // oklch(0.93 0.007 106.5)
  subtle: "#555550", // slightly lighter than foreground for body copy
}

export function magicLinkEmail(
  url: string,
  frontendUrl: string
): { subject: string; html: string; text: string } {
  const subject = "Sign in to Maeterna"

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.wrapper};font-family:'Nunito Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.wrapper};">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <!-- Logo + Brand -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td align="center">
              <img
                src="${frontendUrl}/logo.png"
                alt="Maeterna logo"
                width="64"
                height="64"
                style="display:block;border-radius:50%;margin:0 auto 14px;"
              />
              <p style="margin:0;font-size:22px;font-weight:700;color:${C.foreground};letter-spacing:-0.4px;line-height:1.2;">Maeterna</p>
              <p style="margin:5px 0 0;font-size:14px;color:${C.mutedFg};letter-spacing:0.1px;">Maternal Health Monitoring</p>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;margin:0 auto;">
          <tr>
            <td style="background-color:${C.background};border:1px solid ${C.border};border-radius:10px;padding:44px 40px;">

              <h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:${C.foreground};letter-spacing:-0.3px;line-height:1.3;">Sign in to your account</h1>
              <p style="margin:0 0 32px;font-size:16px;color:${C.subtle};line-height:1.65;">Click the button below to securely sign in to Maeterna. No password required.</p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius:6px;background-color:${C.primary};">
                          <a
                            href="${url}"
                            target="_blank"
                            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${C.primaryFg};text-decoration:none;border-radius:6px;letter-spacing:0.1px;line-height:1;"
                          >Sign in to Maeterna</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:${C.mutedFg};line-height:1.5;">This link expires in 10 minutes and can only be used once.</p>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="border-top:1px solid ${C.border};"></td></tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-size:13px;color:${C.mutedFg};line-height:1.5;">Button not working? Copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:${C.mutedFg};word-break:break-all;font-family:ui-monospace,'Cascadia Code','Fira Code',monospace;line-height:1.6;">${url}</p>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr><td style="border-top:1px solid ${C.border};"></td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:${C.mutedFg};line-height:1.6;">If you didn't request this sign-in link, you can safely ignore this email. Your account won't be accessed until you click the link above.</p>

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="margin:24px 0 0;font-size:12px;color:${C.mutedFg};text-align:center;line-height:1.6;">
          &copy; ${new Date().getFullYear()} Full Stack Colllective
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Sign in to Maeterna

Click the link below to sign in. This link expires in 10 minutes and can only be used once.

${url}

If you didn't request this, you can safely ignore this email.`

  return { subject, html, text }
}
