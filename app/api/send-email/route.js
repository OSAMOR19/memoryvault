import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, name, capsuleTitle, unlockDate, occasion } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const formattedOccasion = occasion
      ? occasion.charAt(0).toUpperCase() + occasion.slice(1).replace('-', ' ')
      : 'Special Occasion';

    const formattedDate = unlockDate
      ? new Date(unlockDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Future Date';

    // Verify API Key
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'NimCapsule <onboarding@resend.dev>';

    // Beautiful Responsive HTML template matching NimCapsule theme
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your NimCapsule is Sealed</title>
      </head>
      <body style="margin:0;padding:0;background-color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="background-color:#FFFFFF;border-radius:16px;box-shadow:0 4px 24px rgba(26,26,26,0.06);overflow:hidden;max-width:500px;width:100%;border-collapse:collapse;">
                
                <!-- Gold accent top bar -->
                <tr>
                  <td style="background:linear-gradient(90deg,#E9B114,#C49710);height:6px;padding:0;"></td>
                </tr>
      
                <!-- Logo & Brand -->
                <tr>
                  <td align="center" style="padding:40px 40px 20px;">
                    <div style="background-color:#FAF8F5;width:56px;height:56px;border-radius:14px;display:inline-block;border:1px solid #F3F0EB;text-align:center;">
                      <span style="font-size:28px;line-height:56px;vertical-align:middle;">⏳</span>
                    </div>
                    <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#1A1A1A;margin-top:12px;">NimCapsule</div>
                  </td>
                </tr>
      
                <!-- Title & Congratulations -->
                <tr>
                  <td style="padding:0 40px 20px;text-align:center;">
                    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1A1A1A;letter-spacing:-0.5px;">Capsule Sealed Successfully</h1>
                    <p style="margin:0;font-size:14px;color:#6B6B6B;line-height:1.6;">
                      Hi ${name}, your time capsule has been securely sealed and placed in the vault. It will remain locked until the set date.
                    </p>
                  </td>
                </tr>
      
                <!-- Capsule details card (premium layout) -->
                <tr>
                  <td style="padding:0 40px 30px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;border-left:4px solid #E9B114;border-top:1px solid #F3F0EB;border-right:1px solid #F3F0EB;border-bottom:1px solid #F3F0EB;border-radius:0 12px 12px 0;border-collapse:collapse;width:100%;">
                      <tr>
                        <td style="padding:24px;">
                          <!-- Title Section -->
                          <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Capsule Title</div>
                          <div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-bottom:16px;line-height:1.3;">${capsuleTitle}</div>
                          
                          <div style="height:1px;background-color:#F3F0EB;margin-bottom:16px;"></div>
                          
                          <!-- Occasion and Unlock Date side-by-side using table -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
                            <tr>
                              <td width="50%" style="padding-right:10px;vertical-align:top;">
                                <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Occasion</div>
                                <div style="font-size:14px;font-weight:600;color:#6B6B6B;">
                                  <span style="font-size:14px;vertical-align:middle;margin-right:4px;">🎉</span><span style="vertical-align:middle;">${formattedOccasion}</span>
                                </div>
                              </td>
                              <td width="50%" style="padding-left:15px;vertical-align:top;border-left:1px solid #F3F0EB;">
                                <div style="font-size:11px;color:#9E9E9E;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Unlocks On</div>
                                <div style="font-size:14px;font-weight:700;color:#C49710;">
                                  <span style="font-size:14px;vertical-align:middle;margin-right:4px;">🔑</span><span style="vertical-align:middle;">${formattedDate}</span>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
      
                <!-- View Dashboard CTA Button -->
                <tr>
                  <td align="center" style="padding:0 40px 32px;">
                    <a href="https://nimcapsule.vercel.app/dashboard" target="_blank" style="display:inline-block;padding:12px 36px;background-color:#E9B114;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:9999px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(233,177,20,0.15);">
                      Open NimCapsule Dashboard
                    </a>
                  </td>
                </tr>
      
                <!-- Divider -->
                <tr>
                  <td style="padding:0 40px;">
                    <div style="height:1px;background-color:#F3F0EB;"></div>
                  </td>
                </tr>
      
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 40px 32px;background-color:#FAF8F5;border-top:1px solid #F3F0EB;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#9E9E9E;line-height:1.6;">
                      This is an automated notification from your NimCapsule account.<br />
                      If you did not request this, please secure your account credentials.
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

    if (!apiKey) {
      console.log('--- [Resend MOCK Send Success] ---');
      console.log(`To: ${email}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Subject: NimCapsule Sealed: ${capsuleTitle}`);
      console.log('-----------------------------------');
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
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `NimCapsule Sealed: ${capsuleTitle}`,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Resend Error Response]:', data);
      return NextResponse.json({ error: data.message || 'Resend error occurred' }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Send Email Handler Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

