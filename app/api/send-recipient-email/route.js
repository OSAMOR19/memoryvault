import { NextResponse } from 'next/server';

// Emails the capsule *recipient* their link (and claim code, for NIM gifts).
// The creator's own "sealed" confirmation is handled by /api/send-email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveBaseUrl(request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const origin = request.headers.get('origin');
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim();
    const capsuleId = String(body.capsuleId || '').trim();
    const senderName = String(body.senderName || '').trim() || 'Someone';
    const capsuleTitle = String(body.capsuleTitle || 'A time capsule').trim();
    const occasion = String(body.occasion || '').trim();
    const unlockDate = body.unlockDate;
    const giftAmount = Number(body.giftAmount) || 0;
    const claimCode = body.claimCode ? String(body.claimCode).trim() : '';

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }
    if (!ID_RE.test(capsuleId)) {
      return NextResponse.json({ error: 'A valid capsule id is required' }, { status: 400 });
    }

    const capsuleUrl = `${resolveBaseUrl(request)}/capsule/${encodeURIComponent(capsuleId)}`;

    const formattedOccasion = occasion
      ? occasion.charAt(0).toUpperCase() + occasion.slice(1).replace('-', ' ')
      : 'Special Occasion';
    const formattedDate = unlockDate && !Number.isNaN(new Date(unlockDate).getTime())
      ? new Date(unlockDate).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : 'a future date';

    const hasGift = giftAmount > 0;
    const subject = hasGift
      ? `${senderName} sealed a time capsule and ${giftAmount} NIM for you`
      : `${senderName} sealed a time capsule for you`;

    const giftBlock = hasGift
      ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFDF5;border:2px dashed #E9B114;border-radius:12px;border-collapse:separate;width:100%;">
              <tr>
                <td style="padding:20px 24px;text-align:center;">
                  <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">NIM gift locked for you</div>
                  <div style="font-size:26px;font-weight:700;color:#C49710;margin-bottom:12px;">${escapeHtml(giftAmount)} NIM</div>
                  ${claimCode ? `
                  <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;">Your claim code</div>
                  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#1A1A1A;margin-bottom:10px;">${escapeHtml(claimCode)}</div>
                  <div style="font-size:12px;color:#6B6B6B;line-height:1.6;">
                    Keep this code safe. You will need it, together with a Nimiq wallet, to claim the gift once the capsule unlocks. Nobody can claim it without this code.
                  </div>` : `
                  <div style="font-size:12px;color:#6B6B6B;line-height:1.6;">
                    ${escapeHtml(senderName)} will share the claim code with you separately.
                  </div>`}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>A NimCapsule is waiting for you</title>
      </head>
      <body style="margin:0;padding:0;background-color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="background-color:#FFFFFF;border-radius:16px;box-shadow:0 4px 24px rgba(26,26,26,0.06);overflow:hidden;max-width:500px;width:100%;border-collapse:collapse;">
                <tr>
                  <td style="background:linear-gradient(90deg,#E9B114,#C49710);height:6px;padding:0;"></td>
                </tr>
                <tr>
                  <td align="center" style="padding:40px 40px 20px;">
                    <div style="background-color:#FAF8F5;width:56px;height:56px;border-radius:14px;display:inline-block;border:1px solid #F3F0EB;text-align:center;">
                      <span style="font-size:28px;line-height:56px;vertical-align:middle;">⏳</span>
                    </div>
                    <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#1A1A1A;margin-top:12px;">NimCapsule</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 20px;text-align:center;">
                    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1A1A1A;letter-spacing:-0.5px;">A time capsule is waiting for you</h1>
                    <p style="margin:0;font-size:14px;color:#6B6B6B;line-height:1.6;">
                      ${escapeHtml(senderName)} sealed a message for you. It stays locked until the unlock date, then you can open it with the link below.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;border-left:4px solid #E9B114;border-top:1px solid #F3F0EB;border-right:1px solid #F3F0EB;border-bottom:1px solid #F3F0EB;border-radius:0 12px 12px 0;border-collapse:collapse;width:100%;">
                      <tr>
                        <td style="padding:24px;">
                          <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Capsule</div>
                          <div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-bottom:16px;line-height:1.3;">${escapeHtml(capsuleTitle)}</div>
                          <div style="height:1px;background-color:#F3F0EB;margin-bottom:16px;"></div>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
                            <tr>
                              <td width="50%" style="padding-right:10px;vertical-align:top;">
                                <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Occasion</div>
                                <div style="font-size:14px;font-weight:600;color:#6B6B6B;">🎉 ${escapeHtml(formattedOccasion)}</div>
                              </td>
                              <td width="50%" style="padding-left:15px;vertical-align:top;border-left:1px solid #F3F0EB;">
                                <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Unlocks On</div>
                                <div style="font-size:14px;font-weight:700;color:#C49710;">🔑 ${escapeHtml(formattedDate)}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${giftBlock}
                <tr>
                  <td align="center" style="padding:0 40px 12px;">
                    <a href="${escapeHtml(capsuleUrl)}" target="_blank" style="display:inline-block;padding:12px 36px;background-color:#E9B114;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:9999px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(233,177,20,0.15);">
                      Open your capsule
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 32px;">
                    <p style="margin:0;font-size:11px;color:#9E9E9E;line-height:1.6;word-break:break-all;">
                      Or copy this link: <a href="${escapeHtml(capsuleUrl)}" style="color:#C49710;">${escapeHtml(capsuleUrl)}</a><br/>
                      Bookmark it — the capsule opens on ${escapeHtml(formattedDate)}.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px 32px;background-color:#FAF8F5;border-top:1px solid #F3F0EB;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#9E9E9E;line-height:1.6;">
                      You received this because ${escapeHtml(senderName)} entered your email when sealing a NimCapsule.<br />
                      If you don't know them, you can safely ignore this message.
                    </p>
                    <p style="margin:16px 0 0;font-size:11px;color:#9E9E9E;">
                      &copy; ${new Date().getFullYear()} NimCapsule. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'NimCapsule <onboarding@resend.dev>';

    if (!apiKey) {
      console.log('--- [Resend MOCK recipient invite] ---');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Link: ${capsuleUrl}`);
      console.log('---------------------------------------');
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'RESEND_API_KEY is not configured. Email output logged to console.',
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: fromEmail, to: [email], subject, html: htmlContent }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Resend Error Response]:', data);
      return NextResponse.json({ error: data.message || 'Resend error occurred' }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Send Recipient Email Handler Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
