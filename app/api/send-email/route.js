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
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'MemoryVault <onboarding@resend.dev>';

    // Beautiful Responsive HTML template matching MemoryVault theme
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your MemoryVault Capsule is Sealed</title>
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
                    <div style="background-color:#FAF8F5;width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;border:1px solid #F3F0EB;text-align:center;">
                      <span style="font-size:28px;line-height:56px;display:inline-block;vertical-align:middle;">⏳</span>
                    </div>
                    <span style="font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#1A1A1A;">MemoryVault</span>
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
      
                <!-- Capsule details card -->
                <tr>
                  <td style="padding:0 40px 30px;">
                    <table role="presentation" width="100%" style="background-color:#FAF8F5;border-radius:12px;border:1px solid #F3F0EB;padding:20px;border-collapse:collapse;">
                      <tr>
                        <td style="padding:4px 0;font-size:12px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.5px;">Capsule Title</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px;font-size:16px;font-weight:600;color:#1A1A1A;">"${capsuleTitle}"</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:12px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.5px;">Occasion</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px;font-size:14px;font-weight:500;color:#6B6B6B;">${formattedOccasion}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:12px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.5px;">Unlock Date</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0 0;font-size:14px;font-weight:600;color:#E9B114;">🔑 ${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
      
                <!-- View Dashboard CTA Button -->
                <tr>
                  <td align="center" style="padding:0 40px 32px;">
                    <a href="https://memoryvault-app.vercel.app/dashboard" target="_blank" style="display:inline-block;padding:12px 36px;background-color:#E9B114;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:9999px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(233,177,20,0.15);">
                      Open MemoryVault Dashboard
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
                      This is an automated notification from your MemoryVault account.<br />
                      If you did not request this, please secure your account credentials.
                    </p>
                    <p style="margin:16px 0 0;font-size:11px;color:#9E9E9E;">
                      &copy; ${new Date().getFullYear()} MemoryVault. All rights reserved.
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
      console.log(`Subject: 🔒 Your MemoryVault Capsule "${capsuleTitle}" has been sealed!`);
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
        subject: `🔒 Your MemoryVault Capsule "${capsuleTitle}" has been sealed!`,
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
