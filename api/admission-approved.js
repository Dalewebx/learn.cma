// api/admission-approved.js
// Sends admission approval email via Resend when admin approves an application
// Requires RESEND_API_KEY environment variable set in Vercel project settings

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — approval email skipped');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const { to, firstName, programme, ref, testMode } = req.body || {};
  if (!to || !firstName) {
    return res.status(400).json({ error: 'Missing required fields: to, firstName' });
  }

  const prog = programme || 'your chosen programme';
  const portalUrl = 'https://catholicmusicacademy.net';

  const testDisclaimer = testMode ? `
⚠ THIS IS A TEST EMAIL
This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No admission, rejection, or assessment result conveyed in this email is valid or binding.
---
` : '';
  const textBody = `${testDisclaimer}Dear ${firstName},

Congratulations! Your application to the Catholic Music Academy has been reviewed and approved.

You have been admitted to: ${prog}

You can now log in to your student portal using the email address and password you provided during application.

Log in here: ${portalUrl}

If you experience any difficulty logging in, please contact us at musicacademywarri@gmail.com or reach us on WhatsApp.

Welcome to the Catholic Music Academy. We look forward to your journey with us.

God bless,
Catholic Music Academy
Catholic Diocese of Warri`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0D1B3E;padding:28px 32px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">Catholic Music Academy</div>
      <div style="font-size:24px;font-weight:700;color:white;">Congratulations, ${firstName}!</div>
    </div>

    <!-- Gold banner -->
    <div style="background:linear-gradient(135deg,#C9A84C,#9A7A2E);padding:16px 32px;text-align:center;">
      <div style="font-size:14px;font-weight:700;color:white;letter-spacing:0.5px;">Your Admission Has Been Approved</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      ${testMode ? `
      <!-- TEST MODE DISCLAIMER -->
      <div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:14px 20px;margin:0 0 20px 0;text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:4px;">⚠ THIS IS A TEST EMAIL</div>
        <div style="font-size:12px;color:#64748B;line-height:1.6;">This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No admission, rejection, or assessment result conveyed in this email is valid or binding.</div>
      </div>` : ''}

      <p style="font-size:15px;color:#0F172A;line-height:1.7;margin-bottom:20px;">
        Dear <strong>${firstName}</strong>, your application to the Catholic Music Academy has been reviewed and 
        <strong style="color:#16A34A;">approved</strong>. Welcome to the Academy.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;width:140px;">Programme</td>
          <td style="padding:10px 0;font-size:13px;color:#0F172A;font-weight:600;">${prog}</td>
        </tr>
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;">Status</td>
          <td style="padding:10px 0;font-size:13px;font-weight:700;color:#16A34A;">Admitted</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;">Reference</td>
          <td style="padding:10px 0;font-size:13px;color:#0F172A;">${ref || ''}</td>
        </tr>
      </table>

      <!-- Login instruction -->
      <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#16A34A;margin-bottom:8px;">How to get started</div>
        <div style="font-size:13px;color:#0F172A;line-height:1.7;">
          Log in to your student portal using the <strong>email address and password</strong> you provided during your application. 
          Your course modules will be available immediately.
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${portalUrl}" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
          Log In to Your Portal &rarr;
        </a>
      </div>

      <p style="font-size:13px;color:#64748B;line-height:1.7;margin-bottom:28px;">
        If you experience any difficulty logging in, please contact us at 
        <a href="mailto:musicacademywarri@gmail.com" style="color:#0D1B3E;">musicacademywarri@gmail.com</a>
        or reach us on WhatsApp.
      </p>

      <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0;">
        Welcome to the Catholic Music Academy. We look forward to your journey with us.<br/><br/>
        God bless,<br/>
        <strong>Catholic Music Academy</strong><br/>
        <span style="color:#64748B;font-size:13px;">Catholic Diocese of Warri</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F0F3FF;padding:18px 32px;border-top:1px solid #E2E8F0;">
      <div style="font-size:11px;color:#64748B;line-height:1.6;">
        Catholic Music Academy &middot; Catholic Diocese of Warri &middot; Ozoro, Delta State, Nigeria<br/>
        <a href="${portalUrl}" style="color:#0D1B3E;">${portalUrl}</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Catholic Music Academy <noreply@catholicmusicacademy.net>',
        reply_to: 'musicacademywarri@gmail.com',
        to: [to],
        subject: (testMode ? '[TEST] ' : '') + 'You Have Been Admitted — Catholic Music Academy',
        html: htmlBody,
        text: textBody
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: 'Email failed', details: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('admission-approved error:', err);
    return res.status(500).json({ error: err.message });
  }
};
