// api/application-received.js
// Sends application confirmation email via Resend immediately after a student submits
// Requires RESEND_API_KEY environment variable set in Vercel project settings

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — confirmation email skipped');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const { to, firstName, programme, ref, testMode } = req.body || {};

  if (!to || !firstName || !ref) {
    return res.status(400).json({ error: 'Missing required fields: to, firstName, ref' });
  }

  const prog = programme || 'your chosen programme';

  const testDisclaimer = testMode ? `
⚠ THIS IS A TEST EMAIL
This message was sent during a system demonstration and does not constitute an official communication from the Catholic Music Academy. No data shown is valid or binding.
---
` : '';
  const textBody = `${testDisclaimer}Dear ${firstName},

Thank you for applying to the Catholic Music Academy, Catholic Diocese of Warri.

Your application to study ${prog} has been received and is currently under review. You will be contacted via WhatsApp or email once a decision has been made.

Application Reference: ${ref}

If you have any questions in the meantime, please contact us at musicacademywarri@gmail.com

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
      <div style="font-size:22px;font-weight:700;color:white;">Application Received</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#0F172A;margin-bottom:6px;">Dear <strong>${firstName}</strong>,</p>
      <p style="font-size:14px;color:#64748B;line-height:1.7;margin-bottom:24px;">
        Thank you for applying to the <strong style="color:#0D1B3E;">Catholic Music Academy</strong>, Catholic Diocese of Warri.
      </p>

      <!-- Status box -->
      <div style="background:#F0F3FF;border-left:4px solid #0D1B3E;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#0D1B3E;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;">Application Status</div>
        <div style="font-size:14px;color:#1A2E6C;font-weight:600;">Under Review</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;width:140px;">Programme</td>
          <td style="padding:10px 0;font-size:13px;color:#0F172A;">${prog}</td>
        </tr>
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;">Reference</td>
          <td style="padding:10px 0;font-size:13px;color:#0F172A;font-weight:700;letter-spacing:0.5px;">${ref}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:12px;color:#64748B;font-weight:700;">Next Step</td>
          <td style="padding:10px 0;font-size:13px;color:#0F172A;">You will be contacted via WhatsApp or email once a decision has been made.</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#64748B;line-height:1.7;margin-bottom:28px;">
        If you have any questions in the meantime, please contact us at 
        <a href="mailto:musicacademywarri@gmail.com" style="color:#0D1B3E;">musicacademywarri@gmail.com</a>
      </p>

      <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0;">
        God bless,<br/>
        <strong>Catholic Music Academy</strong><br/>
        <span style="color:#64748B;font-size:13px;">Catholic Diocese of Warri</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F0F3FF;padding:18px 32px;border-top:1px solid #E2E8F0;">
      <div style="font-size:11px;color:#64748B;line-height:1.6;">
        Catholic Music Academy &middot; Catholic Diocese of Warri &middot; Ozoro, Delta State, Nigeria<br/>
        <a href="https://catholicmusicacademy.net" style="color:#0D1B3E;">catholicmusicacademy.net</a>
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
        subject: (testMode ? '[TEST] ' : '') + 'Application Received — Catholic Music Academy',
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
    console.error('application-received error:', err);
    return res.status(500).json({ error: err.message });
  }
};
